/** In-memory subscriber email confirmed by server or user link — survives storage wipes in same page session. */
let confirmedSubscriberEmail: string | null = null;

export function getConfirmedSubscriberEmail(): string | null {
  if (confirmedSubscriberEmail?.includes("@")) return confirmedSubscriberEmail;
  return null;
}

export function setConfirmedSubscriberEmail(email: string | null): void {
  confirmedSubscriberEmail = email?.includes("@") ? email.trim().toLowerCase() : null;
}
