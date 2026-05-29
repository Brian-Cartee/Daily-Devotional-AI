/** Opens the home “Why we built this” manifesto sheet (WhyThisExistsPanel must be mounted). */
export const WHY_PANEL_OPEN_EVENT = "sp-open-why";

export function openWhyPanel(): void {
  window.dispatchEvent(new Event(WHY_PANEL_OPEN_EVENT));
}
