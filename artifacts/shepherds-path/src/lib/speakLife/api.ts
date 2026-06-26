import { apiSessionExtras } from "@/lib/requestExtras";
import type { SpeakLifeConversationState } from "./types";

export interface SpeakLifeDetected {
  recipient_is_living: boolean | null;
  recipient_is_believer: boolean | null;
  relationship_is_estranged: boolean;
  sender_uses_god_language: boolean;
}

function buildPayload(state: SpeakLifeConversationState) {
  return {
    recipient_name: state.recipient_name,
    recipient_relationship: state.recipient_relationship,
    god_moment_captured: state.god_moment_captured,
    specific_memory: state.specific_memory,
    what_god_sees: state.what_god_sees,
    sender_exact_words: state.sender_exact_words,
    recipient_is_living: state.recipient_is_living,
    recipient_is_believer: state.recipient_is_believer,
    relationship_is_estranged: state.relationship_is_estranged,
    sender_uses_god_language: state.sender_uses_god_language,
    ...apiSessionExtras(),
  };
}

export async function generateAppreciation(
  state: SpeakLifeConversationState
): Promise<{ appreciation_text: string; detected: SpeakLifeDetected }> {
  const res = await fetch("/api/speak-life/generate-appreciation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(state)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Generation failed");
  if (data.blocked) throw new Error(data.message ?? "Unable to continue");
  return data;
}

export async function generatePrayer(
  state: SpeakLifeConversationState
): Promise<{ prayer_text: string }> {
  const res = await fetch("/api/speak-life/generate-prayer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...buildPayload(state),
      appreciation_text: state.appreciation_text,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Prayer generation failed");
  if (data.blocked) throw new Error(data.message ?? "Unable to continue");
  return data;
}
