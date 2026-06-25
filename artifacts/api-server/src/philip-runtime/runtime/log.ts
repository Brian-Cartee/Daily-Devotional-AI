import type { PhilipTurnMetadata } from "./types";

/** Structured log for Philip Runtime turn metadata — no user content. */
export function logPhilipTurn(metadata: PhilipTurnMetadata, sessionId?: string): void {
  console.log(JSON.stringify({
    event: "philip_runtime_turn",
    sessionId: sessionId ?? null,
    philipRuntimeVersion: metadata.philipRuntimeVersion,
    exchangeNum: metadata.exchangeNum,
    lane: metadata.lane,
    move: metadata.move,
    gates: metadata.gates,
    engine: metadata.engine,
    mechanical: metadata.mechanical,
  }));
}
