import OpenAI from "openai";
import { config } from "./config";
import { YoutubeTranscript } from "youtube-transcript";
import { db } from "./db";
import { sermonVideos, sermonSegments } from "@workspace/db";
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

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function preacherMatches(hint: string | undefined, preacher: string): boolean {
  if (!hint?.trim()) return false;
  const h = hint.toLowerCase().replace(/\./g, "").trim();
  const p = preacher.toLowerCase().replace(/\./g, "").trim();
  return p.includes(h) || h.includes(p) || h.split(/\s+/).some((w) => w.length > 2 && p.includes(w));
}

/** Format seconds as m:ss or h:mm:ss for UI badges */
export function formatClipDuration(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Find the best matching segment(s) for a set of detected emotion tags
export async function findMatchingSegments(
  emotionTags: string[],
  limit = 3,
) {
  if (!emotionTags || emotionTags.length === 0) return [];

  const all = await db.select().from(sermonSegments);
  if (all.length === 0) return [];

  const scored = all
    .map((seg) => {
      const overlap = seg.emotionTags.filter((t: string) => emotionTags.includes(t)).length;
      return { ...seg, score: overlap };
    })
    .filter((s) => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Library-first pick for daily devotional — scored by emotion tags, optional preacher fit,
 * stable rotation so the same verse/day doesn't always return the same segment when ties exist.
 */
export async function findBestDailySegment(opts: {
  emotionTags: string[];
  pastorHint?: string;
  rotationSeed?: string;
}) {
  const { emotionTags, pastorHint, rotationSeed } = opts;
  if (!emotionTags?.length) return null;

  const all = await db.select().from(sermonSegments);
  if (all.length === 0) return null;

  const scored = all
    .map((seg) => {
      const overlap = seg.emotionTags.filter((t: string) => emotionTags.includes(t)).length;
      let score = overlap * 10;
      if (pastorHint && preacherMatches(pastorHint, seg.preacher)) score += 4;
      const clipLen = seg.endSeconds - seg.startSeconds;
      if (clipLen >= 120 && clipLen <= 720) score += 2;
      return { ...seg, score };
    })
    .filter((s) => s.score > 0);

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(5, scored.length));
  const idx = rotationSeed ? hashSeed(rotationSeed) % top.length : 0;
  return top[idx] ?? null;
}

export async function getSermonLibraryStats() {
  const videos = await db.select().from(sermonVideos);
  const segments = await db.select().from(sermonSegments);
  return {
    videoCount: videos.length,
    segmentCount: segments.length,
    readyForDailyMatching: segments.length > 0,
  };
}
