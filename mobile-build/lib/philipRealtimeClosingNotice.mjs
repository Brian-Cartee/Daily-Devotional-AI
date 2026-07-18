/**
 * Near-limit closing support. The notice is context only: it must never cancel
 * active audio and never force a response. The hard stop remains the final
 * safety boundary.
 */
export function closingNoticeDelayMs(maxDurationMs, noticeLeadMs) {
  return Math.max(0, Number(maxDurationMs) - Number(noticeLeadMs));
}

export function buildClosingNoticeEvent() {
  return {
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "system",
      content: [
        {
          type: "input_text",
          text: "The session ends in under twenty seconds. Finish the current thought, then close warmly in one sentence without asking a new question.",
        },
      ],
    },
  };
}
