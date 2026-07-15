/**
 * Relational weight detection for Philip Voice Lab.
 *
 * Distinguishes relationship/commitment mentions (caring for mom, spouse, kids,
 * friend support, appointments as caregiving) from mere schedule stacking.
 * Never auto-frames caregiving as difficult, exhausting, admirable, or sacrificial.
 */

/** @typedef {{ kind: string; label: string; hint: string; turn?: number }} RelationalAnchor */

const RELATIONAL_PATTERNS = [
  {
    kind: "caregiving_parent",
    label: "caring for a parent",
    re: /\b((taking )?care (of|for)|caring for|looking after|helping)\b.{0,48}\b(my\s+)?(mom|mother|dad|father|parents?)\b/i,
  },
  {
    kind: "caregiving_parent",
    label: "time with a parent",
    // "doing my thing with mom", "with my mother", appointments with mom
    re: /\b(with|for)\s+(my\s+)?(mom|mother|dad|father)\b/i,
  },
  {
    kind: "caregiving_appointments",
    label: "caregiving appointments",
    re: /\b(mom|mother|dad|father|parent).{0,48}\b(doctor'?s?|dr\.?|appointment|appt|clinic|hospital)\b|\b(doctor'?s?|appointment|appt).{0,48}\b(mom|mother|dad|father)\b/i,
  },
  {
    kind: "spouse",
    label: "supporting a spouse",
    re: /\b(my\s+)?(wife|husband|spouse)\b/i,
  },
  {
    kind: "children",
    label: "raising / caring for children",
    re: /\b(my\s+)?(kids?|children|son|daughter)\b/i,
  },
  {
    kind: "friend",
    label: "helping a friend",
    re: /\b(helping|supporting|checking on)\b.{0,32}\b(my\s+)?friend\b|\b(my\s+)?friend\b.{0,32}\b(need|hospital|hard time)\b/i,
  },
];

const USER_FRAMED_HARDSHIP =
  /\b(exhaust|overwhelm|drain|tired|hard|struggl|wearing|worn|burden|heavy|too much)\b/i;

/**
 * @param {string} rawText
 * @returns {{ detected: boolean; caregivingDetected: boolean; anchors: RelationalAnchor[]; primaryHint: string|null; userFramedHardship: boolean }}
 */
export function detectRelationalWeight(rawText) {
  const text = String(rawText || "").trim();
  const anchors = [];
  for (const p of RELATIONAL_PATTERNS) {
    if (p.re.test(text)) {
      anchors.push({ kind: p.kind, label: p.label, hint: p.label });
    }
  }
  // De-dupe by kind
  const seen = new Set();
  const unique = [];
  for (const a of anchors) {
    if (seen.has(a.kind)) continue;
    seen.add(a.kind);
    unique.push(a);
  }
  const caregivingDetected = unique.some((a) =>
    /caregiving|spouse|children|friend/.test(a.kind),
  );
  return {
    detected: unique.length > 0,
    caregivingDetected,
    anchors: unique,
    primaryHint: unique[0]?.label || null,
    userFramedHardship: USER_FRAMED_HARDSHIP.test(text),
  };
}

/**
 * Merge new anchors into state without mechanical repetition dumps.
 * @param {RelationalAnchor[]} existing
 * @param {RelationalAnchor[]} incoming
 * @param {number} turnCount
 */
export function mergeRelationalAnchors(existing = [], incoming = [], turnCount = 0) {
  const out = Array.isArray(existing) ? [...existing] : [];
  for (const a of incoming || []) {
    const idx = out.findIndex((x) => x.kind === a.kind && x.label === a.label);
    if (idx >= 0) {
      out[idx] = { ...out[idx], turn: turnCount };
    } else {
      out.push({ ...a, turn: turnCount });
    }
  }
  // Keep most recent 6
  return out.slice(-6);
}

export function relationalHintsFromState(state) {
  const anchors = state?.relationalAnchors || [];
  return anchors.map((a) => a.label || a.hint).filter(Boolean);
}
