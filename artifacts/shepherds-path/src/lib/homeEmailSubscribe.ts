export const HOME_EMAIL_SUBSCRIBE_ANCHOR_ID = "home-footer-email-subscribe";

export const SCROLL_TO_HOME_EMAIL_SUBSCRIBE_EVENT = "sp-scroll-home-email-subscribe";

function focusSubscribeEmailInput(anchor: HTMLElement): void {
  const input = anchor.querySelector<HTMLInputElement>('input[type="email"]');
  input?.focus({ preventScroll: true });
}

export function scrollHomeEmailSubscribeIntoView(behavior: ScrollBehavior = "smooth"): void {
  const el = document.getElementById(HOME_EMAIL_SUBSCRIBE_ANCHOR_ID);
  if (!el) return;
  try {
    el.scrollIntoView({ behavior, block: "center", inline: "nearest" });
  } catch {
    el.scrollIntoView(true);
  }
  const delay = behavior === "smooth" ? 450 : 80;
  window.setTimeout(() => focusSubscribeEmailInput(el), delay);
  window.setTimeout(() => focusSubscribeEmailInput(el), delay + 200);
}

export function scrollToHomeEmailSubscribe(behavior: ScrollBehavior = "smooth"): void {
  scrollHomeEmailSubscribeIntoView(behavior);
  window.dispatchEvent(new Event(SCROLL_TO_HOME_EMAIL_SUBSCRIBE_EVENT));
}

export function isHomeEmailSubscribeHash(): boolean {
  return window.location.hash === `#${HOME_EMAIL_SUBSCRIBE_ANCHOR_ID}`;
}
