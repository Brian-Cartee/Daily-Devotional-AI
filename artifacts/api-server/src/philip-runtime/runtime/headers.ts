import type { PhilipTurnMetadata } from "./types";

export const PHILIP_RUNTIME_VERSION_HEADER = "X-Philip-Runtime-Version";
/** @deprecated Read-only compat for older eval clients */
export const PHILIP_OS_VERSION_HEADER = "X-Philip-OS-Version";

export const PHILIP_LANE_HEADER = "X-Philip-Lane";
export const PHILIP_MOVE_HEADER = "X-Philip-Move";
export const PHILIP_GATES_HEADER = "X-Philip-Gates";

export function turnMetadataToHeaders(metadata: PhilipTurnMetadata): Record<string, string> {
  return {
    [PHILIP_RUNTIME_VERSION_HEADER]: metadata.philipRuntimeVersion,
    [PHILIP_LANE_HEADER]: metadata.lane,
    [PHILIP_MOVE_HEADER]: metadata.move ?? "",
    [PHILIP_GATES_HEADER]: metadata.gates.join(","),
  };
}

export function parseTurnHeaders(
  headers: Headers,
): Pick<PhilipTurnMetadata, "philipRuntimeVersion" | "lane" | "move" | "gates"> {
  const gatesRaw = headers.get(PHILIP_GATES_HEADER) ?? "";
  const moveRaw = headers.get(PHILIP_MOVE_HEADER);
  const version =
    headers.get(PHILIP_RUNTIME_VERSION_HEADER)
    ?? headers.get(PHILIP_OS_VERSION_HEADER)
    ?? "";
  return {
    philipRuntimeVersion: version,
    lane: (headers.get(PHILIP_LANE_HEADER) ?? "standard") as PhilipTurnMetadata["lane"],
    move: moveRaw ? (moveRaw as PhilipTurnMetadata["move"]) : null,
    gates: gatesRaw ? (gatesRaw.split(",").filter(Boolean) as PhilipTurnMetadata["gates"]) : [],
  };
}
