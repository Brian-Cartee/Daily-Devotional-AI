/** Client-side crisis phrase detection — routes to full guidance + server safety copy. */

const CRISIS_PHRASES = [
  "suicidal",
  "want to die",
  "kill myself",
  "end my life",
  "don't want to live",
  "wish i was dead",
  "ending it all",
  "not worth living",
  "hurt myself",
  "self-harm",
  "cut myself",
  "harm myself",
  "no reason to live",
  "better off dead",
  "want to kill myself",
  "thinking about suicide",
  "don't want to be here anymore",
  "i want to disappear forever",
  "tired of being alive",
  "tired of living",
  "can't go on anymore",
  "nothing left to live for",
  "everyone would be better without me",
  "don't see the point of living",
];

export function detectCrisisClient(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_PHRASES.some((p) => lower.includes(p));
}
