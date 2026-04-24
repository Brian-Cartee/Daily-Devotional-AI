import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, User, BookOpen, X, Loader2 } from "lucide-react";

// Words that start sentences or are common pronouns — not proper nouns
const COMMON_WORDS = new Set([
  "The","A","An","And","But","For","Nor","Or","So","Yet","In","On","At",
  "By","To","Of","As","If","He","She","It","We","I","You","My","His","Her",
  "Our","Your","Its","Their","This","That","These","Those","Then","Now",
  "When","Where","Who","What","Why","How","All","With","From","Was","Is",
  "Are","Were","Be","Been","Being","Have","Has","Had","Do","Does","Did",
  "Will","Would","Could","Should","May","Might","Shall","Can","Not","No",
  "Ye","Thy","Thee","Thou","Hath","Doth","Yea","Nay","Lo","O","Unto",
  "Upon","Behold","Therefore","Wherefore","Thus","Hence","Thence","Thither",
  "Hither","Also","Even","After","Before","Against","Between","Through",
  "Over","Under","Into","Out","Up","Down","Away","Back","There","Here",
]);

// Detect likely proper nouns: capitalized, 3+ chars, not in common list,
// and not at the very start of a sentence (after . ! ?)
function tokenizeWithProperNouns(text: string): Array<{ word: string; isProper: boolean }> {
  // Split keeping separators
  const tokens = text.split(/(\s+|[,;:'"()—–-])/);
  const result: Array<{ word: string; isProper: boolean }> = [];
  let prevWasSentenceEnd = true; // treat very first word as sentence-start

  for (const token of tokens) {
    if (!token) continue;
    if (/^\s+$/.test(token) || /^[,;:'"()—–-]$/.test(token)) {
      result.push({ word: token, isProper: false });
      // Check if this ends a sentence
      if (/[.!?]$/.test(token)) prevWasSentenceEnd = true;
      continue;
    }

    // Strip trailing punctuation for analysis
    const clean = token.replace(/[.,;:!?'"()]+$/, "");
    const trailing = token.slice(clean.length);

    const isCapitalized = /^[A-Z]/.test(clean);
    const isLongEnough = clean.length >= 3;
    const isNotCommon = !COMMON_WORDS.has(clean);
    const isNotSentenceStart = !prevWasSentenceEnd;

    const isProper = isCapitalized && isLongEnough && isNotCommon && isNotSentenceStart;

    if (trailing) {
      result.push({ word: clean, isProper });
      result.push({ word: trailing, isProper: false });
    } else {
      result.push({ word: token, isProper });
    }

    // Update sentence-end tracking
    prevWasSentenceEnd = /[.!?]$/.test(token);
  }

  return result;
}

interface LookupResult {
  term: string;
  type: string;
  summary: string;
}

interface Props {
  text: string;
  className?: string;
  verseNumClassName?: string;
  enableLookup?: boolean;
  lookupContext?: string;
}

export function BiblePassageText({ text, className, verseNumClassName, enableLookup, lookupContext }: Props) {
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const parts = text.split(/(\[\d+\])/g);
  const verses: Array<{ num: string | null; body: string }> = [];
  let current: { num: string | null; body: string } = { num: null, body: "" };

  for (const part of parts) {
    if (/^\[\d+\]$/.test(part)) {
      if (current.body.trim()) verses.push(current);
      current = { num: part.replace(/\[|\]/g, ""), body: "" };
    } else {
      current.body += part;
    }
  }
  if (current.body.trim()) verses.push(current);

  const handleLookup = async (term: string) => {
    if (activeTerm === term) {
      setActiveTerm(null);
      setLookupResult(null);
      return;
    }
    setActiveTerm(term);
    setLookupResult(null);
    setLookupLoading(true);
    try {
      const res = await fetch("/api/bible/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, context: lookupContext }),
      });
      const data = await res.json();
      setLookupResult(data);
    } catch {
      setLookupResult({ term, type: "person", summary: "Could not load information right now." });
    } finally {
      setLookupLoading(false);
    }
  };

  const typeIcon = (type: string) => {
    if (type === "place") return <MapPin className="w-3.5 h-3.5 text-emerald-500" />;
    if (type === "person") return <User className="w-3.5 h-3.5 text-blue-500" />;
    return <BookOpen className="w-3.5 h-3.5 text-violet-500" />;
  };

  const renderVerseBody = (body: string) => {
    if (!enableLookup) {
      return <span>{body.replace(/\n+/g, " ").trim()} </span>;
    }
    const tokens = tokenizeWithProperNouns(body.replace(/\n+/g, " ").trim());
    return (
      <>
        {tokens.map((t, i) =>
          t.isProper ? (
            <button
              key={i}
              data-testid={`lookup-term-${t.word}`}
              onClick={() => handleLookup(t.word)}
              className={`inline underline decoration-dotted underline-offset-2 cursor-pointer transition-colors ${
                activeTerm === t.word
                  ? "text-primary decoration-primary"
                  : "decoration-primary/40 hover:text-primary hover:decoration-primary"
              }`}
            >
              {t.word}
            </button>
          ) : (
            <span key={i}>{t.word}</span>
          )
        )}
        {" "}
      </>
    );
  };

  return (
    <>
      <div className={className ?? "text-sm leading-[1.9]"}>
        {verses.map((v, i) => (
          <span key={i} className="inline">
            {v.num && (
              <sup className={verseNumClassName ?? "text-[10px] font-semibold text-primary/30 mr-0.5 select-none"}>
                {v.num}
              </sup>
            )}
            {renderVerseBody(v.body)}
          </span>
        ))}
        {enableLookup && (
          <p className="text-[11px] text-muted-foreground/50 mt-4 flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" />
            <span>Tap any underlined name or place to learn more</span>
          </p>
        )}
      </div>

      {/* Lookup popover */}
      <AnimatePresence>
        {activeTerm && (
          <motion.div
            key="lookup-sheet"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-50 rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
            data-testid="lookup-sheet"
          >
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-violet-500 to-amber-400" />
            <div className="px-4 pt-4 pb-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  {lookupResult ? typeIcon(lookupResult.type) : <BookOpen className="w-3.5 h-3.5 text-primary" />}
                  <p className="text-[15px] font-bold text-foreground">{activeTerm}</p>
                  {lookupResult && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {lookupResult.type}
                    </span>
                  )}
                </div>
                <button
                  data-testid="btn-close-lookup"
                  onClick={() => { setActiveTerm(null); setLookupResult(null); }}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {lookupLoading && (
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Looking up {activeTerm}…</span>
                </div>
              )}

              {lookupResult && !lookupLoading && (
                <p className="text-[14px] text-foreground/80 leading-relaxed">
                  {lookupResult.summary}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
