/**
 * Streaming TTS hook: WebSocket → PCM chunks → Web Audio API gapless playback
 *
 * The server sends base64 PCM (24kHz, 16-bit signed, mono) chunks as they
 * arrive from ElevenLabs. We decode each chunk to Float32 and schedule it on
 * the AudioContext timeline so chunks play back-to-back with no gap.
 *
 * iOS note: AudioContext requires user-gesture activation. The gesture that
 * opens the mic is sufficient. We resume() before every playback in case the
 * context suspended (screen lock, app background).
 */

import { useRef, useCallback } from "react";
import { getSessionId } from "./session";
import { getUserName } from "./userName";
import { buildHeartContext, getCurrentHeartState } from "./heartCheck";
import { isPhilipMode } from "./companionMode";

const SAMPLE_RATE = 24000;

/** Convert raw 16-bit little-endian PCM bytes to Float32 [-1, 1] */
function pcm16ToFloat32(buffer: ArrayBuffer): Float32Array {
  const int16 = new Int16Array(buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export type VoiceStreamCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
  onLimitReached?: () => void;
};

export function usePhilipVoiceStream() {
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const startedRef = useRef(false);
  const callbacksRef = useRef<VoiceStreamCallbacks>({});
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const getAudioCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
      });
    }
    return audioCtxRef.current;
  }, []);

  const resumeCtx = useCallback(async (): Promise<AudioContext> => {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") await ctx.resume();
    return ctx;
  }, [getAudioCtx]);

  const scheduleChunk = useCallback(async (b64: string) => {
    const ctx = await resumeCtx();
    const arrayBuf = base64ToArrayBuffer(b64);
    const float32 = pcm16ToFloat32(arrayBuf);

    const audioBuf = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
    audioBuf.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuf;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(nextStartTimeRef.current, now + 0.02);
    source.start(startAt);
    nextStartTimeRef.current = startAt + audioBuf.duration;

    activeSourcesRef.current.push(source);

    if (!startedRef.current) {
      startedRef.current = true;
      callbacksRef.current.onStart?.();
    }

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
    };
  }, [resumeCtx]);

  const stopAll = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try { src.stop(); } catch {}
    }
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;
    startedRef.current = false;
  }, []);

  const interrupt = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "interrupt" }));
    }
    stopAll();
  }, [stopAll]);

  const connect = useCallback((): Promise<WebSocket> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return Promise.resolve(wsRef.current);
    wsRef.current?.close();

    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/voice`);
      ws.onopen = () => resolve(ws);
      ws.onerror = () => reject(new Error("WS connect failed"));
      wsRef.current = ws;
    });
  }, []);

  const speak = useCallback(async (
    text: string,
    callbacks: VoiceStreamCallbacks = {},
  ) => {
    callbacksRef.current = callbacks;
    startedRef.current = false;
    stopAll();

    // Warm up AudioContext on same call stack as user gesture
    await resumeCtx();

    let ws: WebSocket;
    try {
      ws = await connect();
    } catch {
      callbacks.onError?.();
      callbacks.onEnd?.();
      return;
    }

    const sessionId = getSessionId();

    ws.onmessage = async (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === "audio_chunk" && msg.audio) {
        await scheduleChunk(msg.audio);
      }

      if (msg.type === "audio_done") {
        // Wait for scheduled audio to finish, then fire onEnd
        const ctx = audioCtxRef.current;
        const remaining = ctx ? Math.max(0, nextStartTimeRef.current - ctx.currentTime) : 0;
        setTimeout(() => {
          startedRef.current = false;
          callbacks.onEnd?.();
        }, remaining * 1000 + 100);
      }

      if (msg.type === "limit_reached") {
        callbacks.onLimitReached?.();
        callbacks.onEnd?.();
      }

      if (msg.type === "error" || msg.type === "safety_block") {
        callbacks.onError?.();
        callbacks.onEnd?.();
      }
    };

    ws.onerror = () => {
      callbacks.onError?.();
      callbacks.onEnd?.();
    };

    ws.send(JSON.stringify({
      type: "voice_request",
      text,
      sessionId,
      companionMode: isPhilipMode() ? "philip" : "solo",
      userName: getUserName() ?? undefined,
      heartContext: buildHeartContext(getCurrentHeartState()),
    }));
  }, [connect, resumeCtx, scheduleChunk, stopAll]);

  return { speak, interrupt };
}
