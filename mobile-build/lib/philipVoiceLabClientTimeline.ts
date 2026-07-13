export type TimelineEvent = {
  event: string;
  ts: number;
  iso: string;
  elapsedMs: number;
  [key: string]: unknown;
};

export type ClientTimelineRecorder = {
  conversationId: string;
  sessionId: string;
  startedAt: number;
  events: TimelineEvent[];
  agentSnapshots: unknown[];
  mark: (event: string, data?: Record<string, unknown>) => TimelineEvent;
  ingestAgentPayload: (payload: Record<string, unknown>) => void;
  toJSON: () => {
    conversationId: string;
    sessionId: string;
    startedAt: number;
    events: TimelineEvent[];
    agentSnapshots: unknown[];
  };
};

export function createClientTimeline(
  conversationId: string,
  sessionId: string,
): ClientTimelineRecorder {
  const startedAt = Date.now();
  const events: TimelineEvent[] = [];
  const agentSnapshots: unknown[] = [];

  const mark = (event: string, data: Record<string, unknown> = {}) => {
    const entry: TimelineEvent = {
      event,
      ts: Date.now(),
      iso: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      ...data,
    };
    events.push(entry);
    return entry;
  };

  return {
    conversationId,
    sessionId,
    startedAt,
    events,
    agentSnapshots,
    mark,
    ingestAgentPayload(payload) {
      // Keep summaries only — full agent timelines balloon after many turns (413 on upload).
      const timeline = payload.timeline as { turns?: Array<{ phase1Preview?: string }> } | undefined;
      const lastTurn = timeline?.turns?.at(-1);
      agentSnapshots.push({
        receivedAt: Date.now(),
        phase: payload.phase,
        phase1Preview:
          (typeof payload.phase1Text === "string" && payload.phase1Text.slice(0, 200)) ||
          lastTurn?.phase1Preview ||
          undefined,
        turnCount: timeline?.turns?.length,
      });
      if (payload.timeline) {
        mark("agent_timeline_received", {
          phase: payload.phase,
          turnCount: timeline?.turns?.length,
        });
      }
    },
    toJSON() {
      return { conversationId, sessionId, startedAt, events, agentSnapshots };
    },
  };
}

export type ClientTimelineJSON = ReturnType<ClientTimelineRecorder["toJSON"]>;

/** Strip bulky fields before upload — ratings matter more than full debug payloads. */
export function slimClientTimelineForUpload(
  timeline: ClientTimelineJSON,
): ClientTimelineJSON {
  return {
    conversationId: timeline.conversationId,
    sessionId: timeline.sessionId,
    startedAt: timeline.startedAt,
    events: timeline.events.slice(-80),
    agentSnapshots: timeline.agentSnapshots.slice(-20),
  };
}
