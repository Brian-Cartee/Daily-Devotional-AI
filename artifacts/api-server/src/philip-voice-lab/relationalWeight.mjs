/**
 * Relational weight detection for Philip Voice Lab.
 *
 * Distinguishes relationship/commitment mentions from schedule stacking.
 * Never auto-frames caregiving as difficult, exhausting, admirable, or sacrificial.
 *
 * Anchors store concise context (relationship, role, meaningful event, involvement,
 * faith connection) — not free-form transcripts or diagnostic labels.
 */

/**
 * @typedef {{
 *   kind: string,
 *   label: string,
 *   hint: string,
 *   relationship?: string,
 *   roleContext?: string,
 *   meaningfulEvent?: string|null,
 *   userInvolvement?: string|null,
 *   faithConnection?: string|null,
 *   userFraming?: string,
 *   sourceTurn?: number,
 *   lastRelevantTurn?: number,
 *   turn?: number,
 * }} RelationalAnchor
 */

const RELATIONAL_PATTERNS = [
  {
    kind: "caregiving_parent",
    relationship: "parent",
    roleContext: "caregiving/support",
    label: "caring for a parent",
    re: /\b((taking )?care (of|for)|caring for|looking after|helping|taken care of|looked after)\b.{0,48}\b(my\s+)?(mom|mother|dad|father|parents?)\b/i,
  },
  {
    kind: "caregiving_parent",
    relationship: "parent",
    roleContext: "shared time / support",
    label: "time with a parent",
    re: /\b(with|for)\s+(my\s+)?(mom|mother|dad|father)\b/i,
  },
  {
    kind: "caregiving_appointments",
    relationship: "parent",
    roleContext: "caregiving appointments",
    label: "caregiving appointments",
    re: /\b(mom|mother|dad|father|parent).{0,48}\b(doctor'?s?|dr\.?|appointment|appt|clinic|hospital)\b|\b(doctor'?s?|appointment|appt).{0,48}\b(mom|mother|dad|father)\b/i,
  },
  {
    kind: "spouse",
    relationship: "spouse",
    roleContext: "support",
    label: "supporting a spouse",
    re: /\b(my\s+)?(wife|husband|spouse)\b/i,
  },
  {
    kind: "children",
    relationship: "child",
    roleContext: "parenting",
    label: "raising / caring for children",
    re: /\b(my\s+)?(kids?|children|son|daughter)\b/i,
  },
  {
    kind: "friend",
    relationship: "friend",
    roleContext: "support",
    label: "helping a friend",
    re: /\b(helping|supporting|checking on)\b.{0,32}\b(my\s+)?friend\b|\b(my\s+)?friend\b.{0,32}\b(need|hospital|hard time)\b/i,
  },
];

const USER_FRAMED_HARDSHIP =
  /\b(exhaust|overwhelm|drain|tired|hard|struggl|wearing|worn|burden|heavy|too much)\b/i;

const SERIOUS_ILLNESS_RECOVERY =
  /\b(leukemia|cancer|chemotherapy|chemo|tumor|surgery|hospitali[sz]ed|recover(?:ed|ing|y)? from)\b/i;

const ACCOMPANIMENT_RE =
  /\b(step[- ]by[- ]step|throughout the (whole )?(process|ordeal)|been with (her|him|them)|looked after|taken care of)\b/i;

const ANSWERED_PRAYER_RE =
  /\b(god answered|answered (our |my )?prayers?|prayer(s)? (were |was )?answered)\b/i;

const FAITH_SUSTAIN_RE =
  /\b(peace|strength).{0,40}\b(through|prayer|scripture)|scripture.{0,40}\b(peace|strength)|prayer.{0,40}\b(peace|strength)\b/i;

/**
 * True when descriptive faith is tied to meaningful relational weight
 * (illness/recovery, caregiving, grief, answered prayer, major transition).
 */
export function isWeightyDescriptiveFaithContext(rawText, state = null) {
  const text = String(rawText || "");
  // Prefer current-turn evidence. Prior anchors only reinforce when the current
  // turn already names faith practice — never alone invent weight on unrelated turns.
  const currentRelational = detectRelationalWeight(text);
  const anchorBlob = currentRelational.detected
    ? [
        ...(state?.relationalAnchors || []).map((a) =>
          [a.label, a.meaningfulEvent, a.faithConnection, a.userInvolvement, a.roleContext]
            .filter(Boolean)
            .join(" "),
        ),
      ].join(" ")
    : "";
  const blob = [text, anchorBlob].join(" ");
  if (!/\b(scripture|prayer|pray|god|bible|faith)\b/i.test(text) && !ANSWERED_PRAYER_RE.test(text)) {
    return false;
  }
  return (
    SERIOUS_ILLNESS_RECOVERY.test(blob) ||
    ACCOMPANIMENT_RE.test(blob) ||
    ANSWERED_PRAYER_RE.test(blob) ||
    /\b(grief|funeral|died|dying|passed away|reconciliat|caregiv|looking after)\b/i.test(blob) ||
    (Boolean(currentRelational.detected && currentRelational.anchors.some((a) => a.meaningfulEvent)) &&
      /\b(scripture|prayer|pray|peace|strength)\b/i.test(text))
  );
}

/**
 * @param {string} rawText
 */
export function detectRelationalWeight(rawText) {
  const text = String(rawText || "").trim();
  const anchors = [];
  for (const p of RELATIONAL_PATTERNS) {
    if (p.re.test(text)) {
      anchors.push(enrichAnchorFromText({
        kind: p.kind,
        label: p.label,
        hint: p.label,
        relationship: p.relationship,
        roleContext: p.roleContext,
      }, text));
    }
  }
  // Illness + parent mention without explicit "with mom" still deserves an event on existing parent.
  if (SERIOUS_ILLNESS_RECOVERY.test(text) && /\b(mom|mother|dad|father|parent)\b/i.test(text)) {
    if (!anchors.some((a) => a.kind === "caregiving_parent")) {
      anchors.push(
        enrichAnchorFromText(
          {
            kind: "caregiving_parent",
            label: "parent health / recovery",
            hint: "parent health / recovery",
            relationship: "parent",
            roleContext: "caregiving/support",
          },
          text,
        ),
      );
    }
  }

  const seen = new Set();
  const unique = [];
  for (const a of anchors) {
    const key = `${a.kind}:${a.relationship || ""}:${a.meaningfulEvent || ""}`;
    if (seen.has(a.kind) && !a.meaningfulEvent) continue;
    if (seen.has(key)) continue;
    seen.add(a.kind);
    seen.add(key);
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
    weightyRelationalContext: unique.some((a) => Boolean(a.meaningfulEvent || a.faithConnection)),
  };
}

function enrichAnchorFromText(base, text) {
  const out = { ...base };
  if (SERIOUS_ILLNESS_RECOVERY.test(text)) {
    // Concise non-diagnostic event label — do not store raw medical transcript.
    out.meaningfulEvent = /\brecover/i.test(text)
      ? "serious illness and recovery"
      : "serious illness";
  }
  if (ACCOMPANIMENT_RE.test(text) || /\btaken care of|looked after\b/i.test(text)) {
    out.userInvolvement = "accompanied them through the process";
  }
  if (ANSWERED_PRAYER_RE.test(text)) {
    out.faithConnection = "prayer experienced as answered/sustaining";
  } else if (FAITH_SUSTAIN_RE.test(text)) {
    out.faithConnection = "prayer/scripture experienced as sustaining";
  }
  if (USER_FRAMED_HARDSHIP.test(text)) out.userFraming = "hardship_named";
  else if (/\b(nice|peace|strength|wonderful|entertaining|good)\b/i.test(text)) {
    out.userFraming = "positive_or_steady";
  } else {
    out.userFraming = "unspecified";
  }
  // Compact human-readable hint for prompts (not full transcript).
  const bits = [
    out.relationship && `relationship:${out.relationship}`,
    out.roleContext && `role:${out.roleContext}`,
    out.meaningfulEvent && `event:${out.meaningfulEvent}`,
    out.userInvolvement && `involvement:${out.userInvolvement}`,
    out.faithConnection && `faith:${out.faithConnection}`,
  ].filter(Boolean);
  if (bits.length) out.hint = bits.join("; ");
  return out;
}

/**
 * Merge anchors; enrich existing parent/caregiving entries with new ordeal/faith context
 * without duplicating illness into every later turn's prose.
 */
export function mergeRelationalAnchors(existing = [], incoming = [], turnCount = 0) {
  const out = Array.isArray(existing) ? existing.map((a) => ({ ...a })) : [];
  for (const a of incoming || []) {
    const idx = out.findIndex(
      (x) => x.kind === a.kind || (x.relationship && x.relationship === a.relationship),
    );
    if (idx >= 0) {
      const prev = out[idx];
      out[idx] = {
        ...prev,
        ...a,
        meaningfulEvent: a.meaningfulEvent || prev.meaningfulEvent || null,
        userInvolvement: a.userInvolvement || prev.userInvolvement || null,
        faithConnection: a.faithConnection || prev.faithConnection || null,
        sourceTurn: prev.sourceTurn ?? turnCount,
        lastRelevantTurn: turnCount,
        turn: turnCount,
        hint: a.hint || prev.hint,
      };
    } else {
      out.push({
        ...a,
        sourceTurn: turnCount,
        lastRelevantTurn: turnCount,
        turn: turnCount,
      });
    }
  }
  return out.slice(-6);
}

export function relationalHintsFromState(state) {
  const anchors = state?.relationalAnchors || [];
  return anchors
    .map((a) => a.hint || a.label)
    .filter(Boolean);
}

const UNRELATED_TOPIC_ONLY =
  /\b(world cup|championship|match|game|kettlebell|workout|gym|training|sore|exercise|football|soccer)\b/i;

const RELATIONAL_CONTINUITY_CUES =
  /\b(mom|mother|dad|father|parent|wife|husband|spouse|kids?|children|son|daughter|friend|caregiv|caring for|looking after|spending time with (her|him|them|my))\b/i;

/**
 * Session anchors continue only when the current turn is meaningfully connected
 * to that relationship/topic — not merely because it appeared earlier.
 */
export function isRelationallyContinuousTurn(rawText, priorHints = []) {
  const text = String(rawText || "").trim();
  if (!text || !(priorHints || []).length) return false;
  if (detectRelationalWeight(text).detected) return true;
  if (RELATIONAL_CONTINUITY_CUES.test(text)) return true;
  // Explicit continuity language about a prior relationship without re-naming it.
  if (
    /\b(spending time with her|being with her|caring for her|she has mattered|that time with her|looking after her)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  // Unrelated ordinary topics alone must not inherit caregiving anchors.
  if (UNRELATED_TOPIC_ONLY.test(text) && !RELATIONAL_CONTINUITY_CUES.test(text)) {
    return false;
  }
  const hintBlob = (priorHints || []).join(" ").toLowerCase();
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  const overlap = tokens.some((w) => hintBlob.includes(w) && !/^(with|that|this|just|been|from|have|about)$/.test(w));
  return overlap && RELATIONAL_CONTINUITY_CUES.test(hintBlob);
}

/**
 * Only expose a relational hint to Terra when supported by:
 * - the current turn transcript, or
 * - current-session state anchors (allowSessionContinuation), or
 * - durable memory explicitly retrieved with provenance.
 * Never silently inherit fixture / unrelated prior-session hints.
 */
export function groundedRelationalHint({
  turnLocal,
  priorHints = [],
  retrievedMemory = null,
  allowSessionContinuation = false,
} = {}) {
  if (retrievedMemory?.hint && retrievedMemory?.provenance) {
    return String(retrievedMemory.hint);
  }
  if (turnLocal?.detected && turnLocal?.primaryHint) return turnLocal.primaryHint;
  if (allowSessionContinuation && priorHints?.length) return String(priorHints[0]);
  return null;
}

export function groundedPriorRelationalHints({
  turnLocal,
  priorHints = [],
  retrievedMemory = null,
  allowSessionContinuation = false,
} = {}) {
  if (retrievedMemory?.hint && retrievedMemory?.provenance) {
    return [String(retrievedMemory.hint)];
  }
  if (turnLocal?.detected) {
    // Current-turn anchors may be reinforced by prior session anchors of the same kind.
    return (priorHints || []).slice(0, 4);
  }
  if (allowSessionContinuation && priorHints?.length) {
    return (priorHints || []).slice(0, 4);
  }
  return [];
}

export function relationalAnchorProvenance({
  turnLocal,
  retrievedMemory = null,
  allowSessionContinuation = false,
  priorHints = [],
} = {}) {
  if (retrievedMemory?.hint && retrievedMemory?.provenance) {
    return {
      source: "retrieved_memory",
      provenance: String(retrievedMemory.provenance).slice(0, 80),
      hintPresent: true,
    };
  }
  if (turnLocal?.detected) {
    return {
      source: "current_turn",
      provenance: "session_transcript",
      hintPresent: true,
      kinds: (turnLocal.anchors || []).map((a) => a.kind).filter(Boolean),
    };
  }
  if (allowSessionContinuation && priorHints?.length) {
    return {
      source: "session_state",
      provenance: "prior_turn_in_session",
      hintPresent: true,
    };
  }
  return {
    source: "none",
    provenance: null,
    hintPresent: false,
  };
}

/** Compact serializable anchors for observability (no long free text). */
export function serializeRelationalAnchors(anchors = []) {
  return (anchors || []).map((a) => ({
    kind: a.kind,
    label: a.label,
    relationship: a.relationship || null,
    roleContext: a.roleContext || null,
    meaningfulEvent: a.meaningfulEvent || null,
    userInvolvement: a.userInvolvement || null,
    faithConnection: a.faithConnection || null,
    userFraming: a.userFraming || null,
    sourceTurn: a.sourceTurn ?? a.turn ?? null,
    lastRelevantTurn: a.lastRelevantTurn ?? a.turn ?? null,
  }));
}
