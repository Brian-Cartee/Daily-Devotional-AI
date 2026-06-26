/**
 * Conversation state machine for the Talk It Through flow.
 *
 * Replaces ~15 independent boolean flags with a single ConvoPhase enum,
 * making it impossible for contradictory states (two mics active, two screens)
 * to co-exist. Voice listeners are only active in their designated phase —
 * enforced by the `activeListener` derived value.
 */

import { useReducer } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Phase type
// ─────────────────────────────────────────────────────────────────────────────

export type ConvoPhase =
  | "idle"          // threshold overlay showing
  | "greeting"      // Philip speaking opening line
  | "entry"         // mic / text input for initial situation
  | "processing"    // situation submitted, Phase 1 API in flight
  | "p1-streaming"  // Phase 1 text streaming
  | "p1-speaking"   // Philip speaking Phase 1 (voice sessions only)
  | "p1-silence"    // 3 s reverent pause
  | "p1-reply"      // user replies to Philip (mic or text)
  | "p2-loading"    // Phase 1 reply submitted, Phase 2 API in flight
  | "p2-speaking"   // Philip speaking Phase 2 (voice sessions only)
  | "p2-silence"    // 3 s pause
  | "p2-complete"   // cards revealed, completion fork
  | "fu-speaking"   // Philip speaking follow-up response
  | "fu-reply"      // follow-up mic / text open
  | "sendoff";      // "carry" path — closing

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

export type ConvoAction =
  | { type: "GREETING_START" }
  | { type: "GREETING_END" }          // greeting ended → open entry mic
  | { type: "ENTRY_OPEN" }            // threshold dismissed (solo / text / greeting interrupted)
  | { type: "ENTRY_SUBMIT" }
  | { type: "P1_STREAM_START" }
  | { type: "P1_STREAM_DONE"; voice: boolean }  // voice=false → skip speaking, go to silence
  | { type: "P1_SPEAK_END" }
  | { type: "P1_SILENCE_END" }        // 3 s pause elapsed → open p1-reply
  | { type: "P1_REPLY_OPEN" }
  | { type: "P1_REPLY_SUBMIT" }
  | { type: "P2_STREAM_START"; voice: boolean } // voice=false → skip to p2-silence
  | { type: "P2_SPEAK_END" }
  | { type: "P2_SILENCE_END" }        // 3 s pause elapsed → p2-complete
  | { type: "P2_COMPLETE" }           // reveal stages done (text sessions)
  | { type: "FU_SPEAK_START" }
  | { type: "FU_SPEAK_END" }
  | { type: "FU_REPLY_OPEN" }
  | { type: "FU_REPLY_SUBMIT" }
  | { type: "SENDOFF" }
  | { type: "RESET" }
  | { type: "FLOW_RECOVER_ENTRY" }; // unstuck from failed API / empty capture → entry mic

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

export function convoReducer(phase: ConvoPhase, action: ConvoAction): ConvoPhase {
  switch (action.type) {
    case "GREETING_START":
      return phase === "idle" ? "greeting" : phase;

    case "GREETING_END":
      return phase === "greeting" ? "entry" : phase;

    case "ENTRY_OPEN":
      return (phase === "idle" || phase === "greeting") ? "entry" : phase;

    case "ENTRY_SUBMIT":
      // Allow from "idle" too — startGuidanceFlow dispatches RESET then ENTRY_SUBMIT directly
      return (phase === "entry" || phase === "idle") ? "processing" : phase;

    case "P1_STREAM_START":
      return phase === "processing" ? "p1-streaming" : phase;

    case "P1_STREAM_DONE":
      if (phase !== "p1-streaming") return phase;
      return action.voice ? "p1-speaking" : "p1-silence";

    case "P1_SPEAK_END":
      return phase === "p1-speaking" ? "p1-silence" : phase;

    case "P1_SILENCE_END":
      return phase === "p1-silence" ? "p1-reply" : phase;

    case "P1_REPLY_OPEN":
      return (phase === "p1-silence" || phase === "p1-reply") ? "p1-reply" : phase;

    case "P1_REPLY_SUBMIT":
      return phase === "p1-reply" ? "p2-loading" : phase;

    case "P2_STREAM_START":
      // Also allow from "processing" — covers the fallback path where Phase 1 failed
      // and startGuidanceFlow calls fallbackToSinglePhase without going through p2-loading.
      if (phase !== "p2-loading" && phase !== "processing") return phase;
      return action.voice ? "p2-speaking" : "p2-silence";

    case "P2_SPEAK_END":
      return phase === "p2-speaking" ? "p2-silence" : phase;

    case "P2_SILENCE_END":
      return phase === "p2-silence" ? "p2-complete" : phase;

    case "P2_COMPLETE":
      // Also allow from p2-loading for text sessions that skip the speaking phase
      return (phase === "p2-silence" || phase === "p2-speaking" || phase === "p2-loading")
        ? "p2-complete" : phase;

    case "FU_SPEAK_START":
      return (phase === "p2-complete" || phase === "fu-reply") ? "fu-speaking" : phase;

    case "FU_SPEAK_END":
      return phase === "fu-speaking" ? "fu-reply" : phase;

    case "FU_REPLY_OPEN":
      return (phase === "fu-speaking" || phase === "fu-reply") ? "fu-reply" : phase;

    case "FU_REPLY_SUBMIT":
      return phase === "fu-reply" ? "fu-speaking" : phase;

    case "SENDOFF":
      return (phase === "p2-complete" || phase === "fu-reply" || phase === "fu-speaking")
        ? "sendoff" : phase;

    case "RESET":
      return "idle";

    case "FLOW_RECOVER_ENTRY":
      return (phase === "processing" || phase === "p1-streaming" || phase === "p2-loading" || phase === "p1-reply")
        ? "entry"
        : phase;

    default:
      return phase;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Return type with derived booleans
// Naming matches existing GuidancePage state vars so the call-site diff is minimal.
// ─────────────────────────────────────────────────────────────────────────────

export type ConvoMachine = {
  phase: ConvoPhase;
  dispatch: (action: ConvoAction) => void;

  // Derived booleans — computed from phase, can never contradict each other
  greetingSpeaking: boolean;
  heartListening: boolean;
  processingBridge: boolean;    // true while waiting for any API response
  phase1Speaking: boolean;
  phase1SpeechDone: boolean;
  phase1SilenceActive: boolean;
  phase1Listening: boolean;
  phase2Loading: boolean;
  phase2Speaking: boolean;
  phase2SpeechDone: boolean;
  phase2SilenceActive: boolean;
  followUpSpeaking: boolean;
  followUpListening: boolean;

  // Which listener should be active — only one at a time, enforced by type
  activeListener: "entry" | "p1" | "followup" | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

const AFTER_P1_SPEECH: ConvoPhase[] = [
  "p1-silence", "p1-reply", "p2-loading", "p2-speaking",
  "p2-silence", "p2-complete", "fu-speaking", "fu-reply", "sendoff",
];

const AFTER_P2_SPEECH: ConvoPhase[] = [
  "p2-silence", "p2-complete", "fu-speaking", "fu-reply", "sendoff",
];

export function useConvoMachine(): ConvoMachine {
  const [phase, dispatch] = useReducer(convoReducer, "idle");

  return {
    phase,
    dispatch,

    greetingSpeaking:    phase === "greeting",
    heartListening:      phase === "entry",
    processingBridge:    phase === "processing" || phase === "p1-streaming" || phase === "p2-loading",
    phase1Speaking:      phase === "p1-speaking",
    phase1SpeechDone:    AFTER_P1_SPEECH.includes(phase),
    phase1SilenceActive: phase === "p1-silence",
    phase1Listening:     phase === "p1-reply",
    phase2Loading:       phase === "p2-loading",
    phase2Speaking:      phase === "p2-speaking",
    phase2SpeechDone:    AFTER_P2_SPEECH.includes(phase),
    phase2SilenceActive: phase === "p2-silence",
    followUpSpeaking:    phase === "fu-speaking",
    followUpListening:   phase === "fu-reply",

    activeListener:
      phase === "entry"    ? "entry"    :
      phase === "p1-reply" ? "p1"       :
      phase === "fu-reply" ? "followup" :
      null,
  };
}
