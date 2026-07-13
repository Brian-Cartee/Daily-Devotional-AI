import crypto from "node:crypto";

export const LAB_PREFIX = "philip-lab-";

/** Ensure lab session IDs are namespaced in production guidance logs. */
export function normalizeLabSessionId(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s.startsWith(LAB_PREFIX) ? s : `${LAB_PREFIX}${s}`;
}

export function labSessionSlug(sessionId) {
  const base = sessionId.startsWith(LAB_PREFIX) ? sessionId.slice(LAB_PREFIX.length) : sessionId;
  const slug = base.slice(0, 12).replace(/[^a-zA-Z0-9._-]/g, "_");
  return slug || "session";
}

export function mintLabRoomName(sessionId) {
  const slug = labSessionSlug(normalizeLabSessionId(sessionId));
  return `${LAB_PREFIX}${slug}-${crypto.randomBytes(4).toString("hex")}`;
}

export function mintLabParticipantIdentity(sessionId) {
  const slug = labSessionSlug(normalizeLabSessionId(sessionId)).slice(0, 24);
  return `${LAB_PREFIX}user-${slug}`;
}

export function mintLabAgentIdentity(roomName) {
  const suffix = roomName.startsWith(LAB_PREFIX) ? roomName.slice(LAB_PREFIX.length) : roomName;
  return `${LAB_PREFIX}agent-${suffix.slice(0, 40)}`;
}

export function isLabAgentIdentity(identity) {
  return String(identity || "").startsWith(`${LAB_PREFIX}agent-`);
}
