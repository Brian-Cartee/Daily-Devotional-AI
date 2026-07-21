/**
 * Unpaid Realtime Lab diagnostics helpers.
 *
 * Pure functions only: build sanitized evidence events for mic readiness,
 * audio-route snapshots, assistant-audio play duration, and interruption
 * tagging. Never stores raw audio samples or PCM buffers.
 */

/**
 * @param {object | null | undefined} track
 * @param {"published" | "not_published" | "unknown"} publicationState
 */
export function snapshotLocalMicrophoneTrack(track, publicationState = "unknown") {
  return {
    trackId: track?.id ?? null,
    enabled: typeof track?.enabled === "boolean" ? track.enabled : null,
    muted: typeof track?.muted === "boolean" ? track.muted : null,
    readyState: track?.readyState ?? null,
    publicationState,
  };
}

/**
 * @param {{
 *   dataChannelReady: boolean,
 *   providerSessionCreated: boolean,
 *   remoteAudioReady: boolean,
 *   conversationallyReady: boolean,
 * }} flags
 */
export function snapshotReadinessFlags(flags) {
  return {
    dataChannelReady: !!flags.dataChannelReady,
    providerSessionCreated: !!flags.providerSessionCreated,
    remoteAudioReady: !!flags.remoteAudioReady,
    conversationallyReady: !!flags.conversationallyReady,
  };
}

/**
 * @param {number | null | undefined} startedAtMs
 * @param {number} endedAtMs
 */
export function assistantAudioPlayedMs(startedAtMs, endedAtMs) {
  if (startedAtMs == null || typeof startedAtMs !== "number") return null;
  if (typeof endedAtMs !== "number") return null;
  return Math.max(0, endedAtMs - startedAtMs);
}

/**
 * @param {{
 *   atMs: number,
 *   mic: ReturnType<typeof snapshotLocalMicrophoneTrack>,
 *   readinessFlags: ReturnType<typeof snapshotReadinessFlags>,
 *   audioRoute: Record<string, unknown> | null,
 * }} args
 */
export function buildConversationReadyDiagnosticsEvent(args) {
  return {
    type: "conversation_ready_diagnostics",
    atMs: args.atMs,
    itemId: null,
    microphone: args.mic,
    readinessFlags: args.readinessFlags,
    audioRoute: args.audioRoute,
    // Explicit contract: diagnostics never embed media.
    audioRecorded: false,
    audioPersisted: false,
  };
}

/**
 * @param {{
 *   atMs: number,
 *   reason: "readiness" | "first_assistant_audio" | "output_cleared" | "output_stopped" | "interruption" | "route_poll",
 *   audioRoute: Record<string, unknown> | null,
 *   assistantAudioPlayedMs?: number | null,
 * }} args
 */
export function buildAudioRouteDiagnosticsEvent(args) {
  const event = {
    type: "audio_route_diagnostics",
    atMs: args.atMs,
    itemId: null,
    reason: args.reason,
    audioRoute: args.audioRoute,
    audioRecorded: false,
    audioPersisted: false,
  };
  if (args.assistantAudioPlayedMs != null) {
    event.assistantAudioPlayedMs = args.assistantAudioPlayedMs;
  }
  return event;
}

/**
 * @param {{
 *   detectedAtMs: number,
 *   duringAssistantAudio: boolean,
 *   assistantAudioStartedAtMs: number | null,
 *   audioRoute: Record<string, unknown> | null,
 * }} args
 */
export function buildInterruptionDiagnostics(args) {
  const during = !!args.duringAssistantAudio;
  return {
    detectedAtMs: args.detectedAtMs,
    duringAssistantAudio: during,
    // Backward-compatible alias used by earlier evidence readers.
    assistantWasAudible: during,
    assistantAudioPlayedBeforeInterruptMs: during
      ? assistantAudioPlayedMs(args.assistantAudioStartedAtMs, args.detectedAtMs)
      : null,
    audioRoute: args.audioRoute,
  };
}

/**
 * Sanitize a route snapshot so secrets/raw media never leak into evidence.
 * @param {Record<string, unknown> | null | undefined} route
 */
export function sanitizeAudioRouteSnapshot(route) {
  if (!route || typeof route !== "object") {
    return {
      available: false,
      platform: null,
      outputs: [],
      selectedOutput: null,
      inputHint: null,
      routeChangeMonitoring: "unavailable_without_new_dependency",
      note: "no_route_snapshot",
    };
  }
  const outputs = Array.isArray(route.outputs)
    ? route.outputs.map((o) => String(o)).slice(0, 16)
    : [];
  return {
    available: route.available !== false,
    platform: route.platform == null ? null : String(route.platform),
    outputs,
    selectedOutput: route.selectedOutput == null ? null : String(route.selectedOutput),
    inputHint: route.inputHint == null ? null : String(route.inputHint).slice(0, 80),
    routeChangeMonitoring:
      route.routeChangeMonitoring == null
        ? "unavailable_without_new_dependency"
        : String(route.routeChangeMonitoring).slice(0, 80),
    note: route.note == null ? null : String(route.note).slice(0, 160),
  };
}

/**
 * True if an evidence object contains forbidden raw-audio payload keys.
 * @param {unknown} value
 */
export function evidenceContainsRawAudioPayload(value) {
  const forbidden = new Set([
    "pcm",
    "pcm16",
    "rawAudio",
    "raw_audio",
    "audioBytes",
    "audio_bytes",
    "base64Audio",
    "base64_audio",
    "samples",
    "wav",
    "audioBuffer",
  ]);
  const stack = [value];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    if (Array.isArray(cur)) {
      for (const item of cur) stack.push(item);
      continue;
    }
    for (const [k, v] of Object.entries(cur)) {
      if (forbidden.has(k)) return true;
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return false;
}
