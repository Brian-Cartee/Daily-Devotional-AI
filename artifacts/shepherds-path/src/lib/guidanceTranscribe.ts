import { getSessionId } from "@/lib/session";
import { isProVerifiedLocally } from "@/lib/proStatus";

export function pickGuidanceAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/mp4";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  return "audio/mp4";
}

export async function transcribeGuidanceAudio(blob: Blob, mimeType: string): Promise<string> {
  const ext = mimeType.includes("mp4") ? "m4a" : "webm";
  const form = new FormData();
  form.append("audio", blob, `guidance.${ext}`);
  form.append("sessionId", getSessionId());
  form.append("isPro", String(isProVerifiedLocally()));
  const res = await fetch("/api/guidance/transcribe", { method: "POST", body: form });
  if (!res.ok) throw new Error("transcribe_failed");
  const data = (await res.json()) as { text?: string };
  return data.text?.trim() ?? "";
}
