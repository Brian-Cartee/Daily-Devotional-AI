/**
 * WebSocket voice stream: GPT-4o text → ElevenLabs PCM → client audio chunks
 *
 * Flow:
 *   client → { type:"voice_request", text, sessionId, companionMode, userName, heartContext, isPro }
 *   server → ElevenLabs WS (eleven_flash_v2_5, pcm_24000)
 *   server → { type:"audio_chunk", audio: base64 }  (repeated)
 *   server → { type:"audio_done" }
 *   client → { type:"interrupt" }  (cancels in-flight streams)
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import OpenAI from "openai";
import { buildVariantSystemPrompt } from "../talkItThroughVariants";
import { scanUserText, shouldBlockLlm, concerningSystemNote } from "../guidanceSafety";
import { touchSessionFirstSeen, getServerDaysWithApp, incrementGuidanceConversationCount } from "../sessionFirstSeen";
import { checkAiDailyLimit, parseProFlag } from "../costGuards";
import { storage } from "../storage";
import { freeTrialGrants } from "../freeTrialConfig";
import { recordGuidanceConversationStart } from "../guidanceWeeklyLimits";

const ELEVENLABS_VOICE_ID = "4bt9GD5FhAuJpgPoDNut";
const ELEVENLABS_MODEL = "eleven_flash_v2_5";
const SAMPLE_RATE = 24000;
const OPENAI_MODEL = "gpt-4o";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SOLO_SYSTEM_PROMPT = `You are providing Christian spiritual guidance inside Shepherd's Path. Do not refer to yourself as Philip. Do not use companion-persona language. Offer calm, biblical, emotionally honest guidance. Be direct, gentle, and grounded in Scripture. One faithful question to go deeper. Under 100 words.`;

/** Detect first sentence boundary for early TTS flush */
function firstSentenceEnd(text: string): number {
  const m = text.match(/^[\s\S]{30,}?[.!?]/);
  return m ? m[0].length : -1;
}

/** Buffer GPT tokens into sentence-ready chunks before sending to ElevenLabs */
function shouldFlushChunk(buf: string, firstSent: boolean): boolean {
  const words = buf.trim().split(/\s+/).length;
  if (!firstSent) return words >= 12 || /[.!?,;]/.test(buf.slice(-2));
  return /[.!?]/.test(buf) || words >= 20;
}

export function registerVoiceStreamWS(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/voice" });

  wss.on("connection", (ws) => {
    let interrupted = false;
    let elevenWs: WebSocket | null = null;
    let gptAbort: AbortController | null = null;

    const cleanup = () => {
      interrupted = true;
      gptAbort?.abort();
      if (elevenWs && elevenWs.readyState === WebSocket.OPEN) {
        try { elevenWs.close(); } catch {}
      }
      elevenWs = null;
    };

    ws.on("message", async (raw) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === "interrupt") {
        cleanup();
        ws.send(JSON.stringify({ type: "audio_done" }));
        return;
      }

      if (msg.type !== "voice_request") return;

      // Reset state for new request
      interrupted = false;
      cleanup();
      interrupted = false;

      const { text, sessionId, companionMode, userName, heartContext, isPro } = msg as {
        text: string;
        sessionId?: string;
        companionMode?: string;
        userName?: string;
        heartContext?: string;
        isPro?: boolean;
      };

      if (!text?.trim()) { ws.send(JSON.stringify({ type: "error", message: "text required" })); return; }
      if (text.length > 2000) { ws.send(JSON.stringify({ type: "error", message: "Input too long" })); return; }

      // Safety check
      const safety = scanUserText(text.trim());
      if (shouldBlockLlm(safety)) {
        ws.send(JSON.stringify({ type: "safety_block", level: safety.level }));
        return;
      }

      // Rate limit
      if (sessionId) touchSessionFirstSeen(sessionId);
      if (sessionId) incrementGuidanceConversationCount(sessionId);
      const daysWithApp = sessionId ? getServerDaysWithApp(sessionId) : 1;
      const isProFlag = parseProFlag(isPro);
      const guard = checkAiDailyLimit(sessionId, daysWithApp, isProFlag);
      if (!guard.ok) {
        ws.send(JSON.stringify({ type: "limit_reached", message: guard.message }));
        return;
      }
      if (sessionId) void storage.logAiUsage({ sessionId, feature: "guidance", daysWithApp, platform: "web" }).catch(() => {});
      if (sessionId && !isProFlag && daysWithApp > 7 && !freeTrialGrants("talk_it_through")) {
        recordGuidanceConversationStart(sessionId);
      }

      const isSolo = companionMode === "solo";
      const safetyNote = concerningSystemNote(safety);
      const nameNote = userName ? `\n\nTheir name is ${userName}. You may use it once, gently, only if it feels natural.` : "";
      const heartNote = heartContext ? `\n\nHeart check context: ${heartContext} Let this quietly shape your tone — don't reference it directly.` : "";

      const systemContent = isSolo
        ? `${SOLO_SYSTEM_PROMPT}${nameNote}${safetyNote}`
        : `${buildVariantSystemPrompt(sessionId ?? "", "phase1").prompt}${nameNote}${heartNote}${safetyNote}`;

      const elevenKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenKey) {
        ws.send(JSON.stringify({ type: "error", message: "ElevenLabs not configured" }));
        return;
      }

      // Open ElevenLabs WebSocket
      elevenWs = new WebSocket(
        `wss://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream-input?model_id=${ELEVENLABS_MODEL}&output_format=pcm_${SAMPLE_RATE}`,
      );

      const elevenReady = new Promise<void>((resolve, reject) => {
        elevenWs!.once("open", resolve);
        elevenWs!.once("error", reject);
      });

      elevenWs.on("message", (data) => {
        if (interrupted) return;
        try {
          const payload = JSON.parse(data.toString()) as { audio?: string; isFinal?: boolean };
          if (payload.audio) {
            ws.send(JSON.stringify({ type: "audio_chunk", audio: payload.audio }));
          }
          if (payload.isFinal) {
            ws.send(JSON.stringify({ type: "audio_done" }));
          }
        } catch {}
      });

      elevenWs.on("error", () => {
        if (!interrupted) ws.send(JSON.stringify({ type: "audio_done" }));
      });

      elevenWs.on("close", () => {
        if (!interrupted) ws.send(JSON.stringify({ type: "audio_done" }));
      });

      try {
        await elevenReady;
        if (interrupted) return;

        // Send ElevenLabs init frame
        elevenWs.send(JSON.stringify({
          text: " ",
          voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
          xi_api_key: elevenKey,
        }));

        // Stream GPT-4o and pipe sentence chunks to ElevenLabs
        gptAbort = new AbortController();
        const stream = await openai.chat.completions.create(
          {
            model: OPENAI_MODEL,
            messages: [
              { role: "system", content: systemContent },
              { role: "user", content: text.trim() },
            ],
            stream: true,
            max_tokens: 120,
            temperature: 0.78,
          },
          { signal: gptAbort.signal },
        );

        let textBuf = "";
        let firstChunkSent = false;

        for await (const chunk of stream) {
          if (interrupted) break;
          const token = chunk.choices[0]?.delta?.content ?? "";
          if (!token) continue;
          textBuf += token;

          if (shouldFlushChunk(textBuf, firstChunkSent)) {
            if (elevenWs?.readyState === WebSocket.OPEN) {
              elevenWs.send(JSON.stringify({ text: textBuf, try_trigger_generation: true }));
            }
            textBuf = "";
            firstChunkSent = true;
          }
        }

        // Flush remainder
        if (textBuf.trim() && !interrupted && elevenWs?.readyState === WebSocket.OPEN) {
          elevenWs.send(JSON.stringify({ text: textBuf, try_trigger_generation: true }));
        }

        // Signal end of text to ElevenLabs
        if (!interrupted && elevenWs?.readyState === WebSocket.OPEN) {
          elevenWs.send(JSON.stringify({ text: "", flush: true }));
        }

      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("[voiceStream] GPT error:", err?.message);
          if (!interrupted) ws.send(JSON.stringify({ type: "audio_done" }));
        }
      }
    });

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });

  console.log("[voiceStream] WebSocket registered at /ws/voice");
}
