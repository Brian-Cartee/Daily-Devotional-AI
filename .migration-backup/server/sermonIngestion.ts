import OpenAI from "openai";
import { YoutubeTranscript } from "youtube-transcript";
import { db } from "./db";
import { sermonVideos, sermonSegments } from "@shared/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI();

interface TranscriptItem {
  text: string;
  offset: number;
  duration: number;
}

interface ParsedSegment {
  startSeconds: number;
  endSeconds: number;
  summary: string;
  quote: string;
  emotionTags: string[];
  helpsWith: string;
  momentTitle: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Build a readable transcript with timestamps for AI analysis
function buildTimestampedTranscript(items: TranscriptItem[]): string {
  const lines: string[] = [];
  let currentMinute = -1;
  let currentChunk = "";

  for (const item of items) {
    const minute = Math.floor(item.offset / 1000 / 60);
    if (minute !== currentMinute) {
      if (currentChunk) lines.push(`[${formatTime(currentMinute * 60)}] ${currentChunk.trim()}`);
      currentMinute = minute;
      currentChunk = item.text + " ";
    } else {
      currentChunk += item.text + " ";
    }
  }
  if (currentChunk) lines.push(`[${formatTime(currentMinute * 60)}] ${currentChunk.trim()}`);
  return lines.join("\n");
}

export async function ingestSermon(
  youtubeId: string,
  title: string,
  preacher: string,
  thumbnailUrl?: string
): Promise<{ success: boolean; segmentsCreated: number; error?: string }> {
  try {
    // Check if already processed
    const existing = await db
      .select()
      .from(sermonVideos)
      .where(eq(sermonVideos.youtubeId, youtubeId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[sermon] ${youtubeId} already ingested — skipping`);
      return { success: true, segmentsCreated: 0 };
    }

    console.log(`[sermon] Fetching transcript for ${youtubeId}...`);
    let rawTranscript: TranscriptItem[];
    try {
      rawTranscript = await YoutubeTranscript.fetchTranscript(youtubeId);
    } catch (err) {
      return { success: false, segmentsCreated: 0, error: `Transcript unavailable: ${err}` };
    }

    // Limit to first ~45 mins (offset is in ms) to stay within token limits
    const MAX_MS = 45 * 60 * 1000;
    const trimmed = rawTranscript.filter(i => i.offset <= MAX_MS);
    const transcript = buildTimestampedTranscript(trimmed);
    const totalSeconds = Math.floor((trimmed[trimmed.length - 1]?.offset || 0) / 1000);

    console.log(`[sermon] Transcript fetched (${trimmed.length} items, ~${Math.round(totalSeconds / 60)} min). Sending to AI...`);

    const prompt = `Analyze this sermon transcript and break it into 4–8 meaningful segments.

For each segment return:
- startSeconds (integer — convert the timestamp like [12:40] → 760)
- endSeconds (integer)
- summary (1 sentence — what is being addressed in this moment)
- quote (the most powerful sentence from this segment — verbatim)
- emotionTags (array of 2–5 lowercase single-word emotion states this segment speaks to — choose from: grief, loss, anxiety, fear, hopelessness, depression, anger, loneliness, doubt, confusion, shame, guilt, identity, purpose, direction, hope, gratitude, forgiveness, marriage, prodigal, addiction, suffering, healing, trust, surrender, waiting, courage, failure, rejection, betrayal, comparison, envy, pride, control, worth, relationship)
- helpsWith (1 sentence — "This speaks to someone who is _______")
- momentTitle (4–8 word compelling title for the card, e.g. "On grief no one can see")

Return ONLY a JSON array of segment objects. No extra text.

Transcript:
${transcript.slice(0, 14000)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      messages: [
        { role: "system", content: "You are a sermon analysis AI. Return ONLY valid JSON arrays." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let segments: ParsedSegment[] = [];

    try {
      const parsed = JSON.parse(raw);
      // GPT sometimes wraps in a key
      segments = Array.isArray(parsed) ? parsed : (parsed.segments || parsed.data || []);
    } catch {
      return { success: false, segmentsCreated: 0, error: "AI returned invalid JSON" };
    }

    if (!segments || segments.length === 0) {
      return { success: false, segmentsCreated: 0, error: "No segments extracted" };
    }

    // Store video record
    await db.insert(sermonVideos).values({
      youtubeId,
      title,
      preacher,
      thumbnailUrl: thumbnailUrl || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      durationSeconds: totalSeconds,
    }).onConflictDoNothing();

    // Store segments
    let stored = 0;
    for (const seg of segments) {
      if (
        typeof seg.startSeconds !== "number" ||
        typeof seg.endSeconds !== "number" ||
        !seg.summary ||
        !Array.isArray(seg.emotionTags)
      ) continue;

      await db.insert(sermonSegments).values({
        youtubeId,
        preacher,
        startSeconds: seg.startSeconds,
        endSeconds: seg.endSeconds,
        summary: seg.summary,
        quote: seg.quote || null,
        emotionTags: seg.emotionTags,
        helpsWith: seg.helpsWith || null,
        momentTitle: seg.momentTitle || null,
      });
      stored++;
    }

    console.log(`[sermon] ${youtubeId} ingested: ${stored} segments stored`);
    return { success: true, segmentsCreated: stored };
  } catch (err) {
    console.error("[sermon] Ingestion error:", err);
    return { success: false, segmentsCreated: 0, error: String(err) };
  }
}

// Find the best matching segment(s) for a set of detected emotion tags
export async function findMatchingSegments(
  emotionTags: string[],
  limit = 3
) {
  if (!emotionTags || emotionTags.length === 0) return [];

  const all = await db.select().from(sermonSegments);
  if (all.length === 0) return [];

  // Score each segment by how many emotion tags overlap
  const scored = all.map(seg => {
    const overlap = seg.emotionTags.filter(t => emotionTags.includes(t)).length;
    return { ...seg, score: overlap };
  }).filter(s => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
