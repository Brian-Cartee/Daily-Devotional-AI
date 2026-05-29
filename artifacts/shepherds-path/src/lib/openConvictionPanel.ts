/** Opens the left-edge conviction sheet (ConvictionPanel must be mounted). */

export const CONVICTION_PANEL_OPEN_EVENT = "sp-open-conviction";

/** Scroll home to “Our Commitment to Scripture” and expand it. */
export const SCROLL_TO_SCRIPTURE_COMMITMENT_EVENT = "sp-scroll-scripture-commitment";

export function openConvictionPanel(): void {
  window.dispatchEvent(new Event(CONVICTION_PANEL_OPEN_EVENT));
}

export function scrollToScriptureCommitment(): void {
  window.dispatchEvent(new Event(SCROLL_TO_SCRIPTURE_COMMITMENT_EVENT));
}
