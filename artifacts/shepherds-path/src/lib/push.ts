import { getSessionId } from "@/lib/session";

export async function urlBase64ToUint8Array(base64String: string): Promise<Uint8Array> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

export function isPushGranted(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

export async function subscribePush(overrideSettings?: Record<string, unknown>): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return false;
    const reg = await navigator.serviceWorker.ready;
    const vapidRes = await fetch("/api/push/vapid-key");
    const { publicKey } = await vapidRes.json();
    const convertedKey = await urlBase64ToUint8Array(publicKey);
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: convertedKey });
    const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const sessionId = getSessionId();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, subscription: subJson, ...overrideSettings }),
    });
    return true;
  } catch {
    return false;
  }
}
