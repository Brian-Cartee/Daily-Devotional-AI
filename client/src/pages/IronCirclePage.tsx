import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { Users, Shield, Star, Plus, X, ChevronDown, ChevronUp, Pencil, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "sp_iron_circle";

interface CirclePerson {
  id: string;
  name: string;
  note: string;
}

interface CircleData {
  pray: CirclePerson[];
  walk: CirclePerson[];
  aspire: CirclePerson[];
}

const defaultData: CircleData = { pray: [], walk: [], aspire: [] };

function loadCircle(): CircleData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    return JSON.parse(raw);
  } catch { return defaultData; }
}

function saveCircle(data: CircleData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Prayer prompts per ring ────────────────────────────────────────────────────

const PRAY_PROMPTS = [
  "Lord, cover {name} today — in their home, their work, and anything they're carrying that I don't even know about.",
  "Father, let {name} feel Your presence in a way they can't explain away. Draw them close.",
  "Give {name} wisdom for the decision they're facing right now. Let them hear You clearly.",
  "Protect {name}'s faith, Lord. Let nothing shake what You've built in them.",
  "Bless {name}'s family. Strengthen the relationships they love most.",
  "Where there is weariness in {name}'s life, Lord — be their rest. Where there is fear, be their peace.",
  "Open the right doors for {name} this season. Close the ones that aren't from You.",
];

const WALK_PROMPTS = [
  "Lord, make me the kind of friend {name} can be completely honest with. No performance, no pretending.",
  "Help me to show up for {name} this week — not just in words, but in presence.",
  "Father, am I sharpening {name}, or am I just comfortable? Show me where I can go deeper with them.",
  "Where {name} and I agree too easily, show me what we're both missing.",
  "Thank You for {name}. Help me not to take this friendship for granted.",
  "Let me encourage {name} with something specific — not just generic praise, but something true I see in them.",
  "Lord, where have I let {name} down lately? Give me the courage to make it right.",
];

const ASPIRE_PROMPTS = [
  "{name} lives something out that I want to grow into. Father, show me what it costs them — and what it would cost me.",
  "Lord, what am I learning from watching {name} walk with You? Let me name it and pursue it.",
  "Help me to be humble enough to learn from {name} without making them an idol. You alone are the source.",
  "What quality in {name} have I been admiring from a distance? Give me the courage to actually pursue it.",
  "Father, who in my life is {name} showing me I could become? Let that vision sharpen my walk.",
  "Let the way {name} handles difficulty become an example I actually follow — not just admire.",
  "Thank You for putting {name} in my path. Don't let me waste what their life is teaching me.",
];

const WEEK_Q_PROMPTS = [
  "If your five closest relationships were all you had to show for this season of life, what would that say?",
  "Who are you becoming because of who you're spending time with? Is that who you want to be?",
  "Is there someone in your 'pray for' circle you've been avoiding in person? What's behind that?",
  "Who do you need to move closer to — and who might need to move further?",
  "When was the last time someone in your circle spoke hard truth to you? Did you receive it?",
  "Who in your life is further ahead in faith? Have you told them what you're learning from watching them?",
  "If Jesus were reviewing your inner circle with you, what would He say first?",
];

function getWeekPromptIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) % WEEK_Q_PROMPTS.length;
}

function getDayPrayerPrompt(ring: "pray" | "walk" | "aspire", name: string): string {
  const prompts = ring === "pray" ? PRAY_PROMPTS : ring === "walk" ? WALK_PROMPTS : ASPIRE_PROMPTS;
  const seed = new Date().getDate() + name.length;
  const raw = prompts[seed % prompts.length];
  return raw.replace(/{name}/g, name.split(" ")[0]);
}

// ── Ring config type ────────────────────────────────────────────────────────────

interface RingConfig {
  key: "pray" | "walk" | "aspire";
  label: string;
  tagline: string;
  verse: string;
  verseRef: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  border: string;
  bg: string;
  accent: string;
  pillBg: string;
  pillText: string;
}

// ── Person Card ────────────────────────────────────────────────────────────────

function PersonCard({
  person, ring, onDelete, onEdit,
}: { person: CirclePerson; ring: "pray" | "walk" | "aspire"; onDelete: () => void; onEdit: (name: string, note: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(person.name);
  const [editNote, setEditNote] = useState(person.note);
  const [promptIdx, setPromptIdx] = useState(0);
  const prompts = ring === "pray" ? PRAY_PROMPTS : ring === "walk" ? WALK_PROMPTS : ASPIRE_PROMPTS;
  const firstName = person.name.split(" ")[0];

  const getPrompt = (idx: number) => prompts[idx % prompts.length].replace(/{name}/g, firstName);

  function saveEdit() {
    if (!editName.trim()) return;
    onEdit(editName.trim(), editNote.trim());
    setEditing(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => !editing && setExpanded(v => !v)}
      >
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-base font-bold text-foreground/60 select-none">
          {person.name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-foreground truncate">{person.name}</p>
          {person.note && <p className="text-[11px] text-muted-foreground truncate">{person.note}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setEditing(v => !v); setExpanded(true); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Edit"
            data-testid={`btn-edit-person-${person.id}`}
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            aria-label="Remove"
            data-testid={`btn-remove-person-${person.id}`}
          >
            <X className="w-3 h-3" />
          </button>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
              {editing ? (
                <>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    data-testid={`input-edit-name-${person.id}`}
                    className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/25"
                    placeholder="Name"
                  />
                  <textarea
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    spellCheck
                    data-testid={`input-edit-note-${person.id}`}
                    rows={2}
                    className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25 resize-none"
                    placeholder="A note about why they're in this circle..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} data-testid={`btn-save-person-${person.id}`} className="rounded-xl px-4">
                      <Check className="w-3 h-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditName(person.name); setEditNote(person.note); }} className="rounded-xl px-4">
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-muted/40 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Prayer for {firstName}</p>
                    <p className="text-[13px] text-foreground/85 leading-relaxed italic">"{getPrompt(promptIdx)}"</p>
                  </div>
                  <button
                    onClick={() => setPromptIdx(i => i + 1)}
                    data-testid={`btn-new-prompt-${person.id}`}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Another prayer
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Add Person Form ────────────────────────────────────────────────────────────

function AddPersonForm({ onAdd, onCancel, ring }: { onAdd: (name: string, note: string) => void; onCancel: () => void; ring: "pray" | "walk" | "aspire" }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const placeholder = ring === "pray"
    ? "e.g. a friend, family member, or prodigal..."
    : ring === "walk"
    ? "e.g. a close friend you do life with..."
    : "e.g. a mentor, elder, or person you admire...";

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="rounded-xl border border-border bg-card shadow-sm px-4 py-4 space-y-3"
    >
      <input
        ref={ref}
        value={name}
        onChange={e => setName(e.target.value)}
        data-testid={`input-add-person-name-${ring}`}
        placeholder="Name"
        className="w-full bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/25"
        onKeyDown={e => { if (e.key === "Enter" && name.trim()) onAdd(name.trim(), note.trim()); }}
      />
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        spellCheck
        data-testid={`input-add-person-note-${ring}`}
        rows={2}
        placeholder={placeholder}
        className="w-full bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 resize-none"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => { if (name.trim()) onAdd(name.trim(), note.trim()); }}
          disabled={!name.trim()}
          data-testid={`btn-confirm-add-person-${ring}`}
          className="rounded-xl px-5"
        >
          <Check className="w-3 h-3 mr-1" /> Add
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="rounded-xl px-4">Cancel</Button>
      </div>
    </motion.div>
  );
}

// ── Ring Section ───────────────────────────────────────────────────────────────

function RingSection({ ring, circle, onChange }: { ring: RingConfig; circle: CircleData; onChange: (updated: CircleData) => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const people = circle[ring.key];
  const atMax = people.length >= 5;

  function addPerson(name: string, note: string) {
    const updated = { ...circle, [ring.key]: [...people, { id: uid(), name, note }] };
    onChange(updated);
    setAddOpen(false);
  }

  function removePerson(id: string) {
    onChange({ ...circle, [ring.key]: people.filter(p => p.id !== id) });
  }

  function editPerson(id: string, name: string, note: string) {
    onChange({ ...circle, [ring.key]: people.map(p => p.id === id ? { ...p, name, note } : p) });
  }

  const { Icon } = ring;

  return (
    <div className={`rounded-2xl border ${ring.border} ${ring.bg} overflow-hidden mb-5`}>
      <div className={`absolute inset-x-0 top-0 h-[3px] ${ring.accent}`} style={{ position: "relative" }} />
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl ${ring.pillBg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${ring.color}`} />
            </div>
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-widest ${ring.pillText} mb-0.5`}>{ring.label}</p>
              <p className="text-[15px] font-extrabold text-foreground leading-snug">{ring.tagline}</p>
            </div>
          </div>
          <span className={`text-[11px] font-bold shrink-0 mt-1 ${ring.pillText} ${ring.pillBg} rounded-full px-2 py-0.5`}>
            {people.length}/5
          </span>
        </div>

        {/* Scripture foundation — bold, unmissable */}
        <div className="mb-4 rounded-xl bg-background/70 border border-current/10 px-4 py-3 relative overflow-hidden">
          <span
            className={`absolute left-2 top-1 text-5xl font-serif leading-none ${ring.color} opacity-15 select-none pointer-events-none`}
            aria-hidden="true"
          >"</span>
          <p className={`text-[14px] font-bold leading-snug text-foreground/90 pl-4`}>
            {ring.verse}
          </p>
          <p className={`text-[11px] font-bold uppercase tracking-widest mt-1.5 pl-4 ${ring.pillText}`}>
            — {ring.verseRef}
          </p>
        </div>

        <div className="space-y-2 mb-3">
          <AnimatePresence mode="popLayout">
            {people.map(p => (
              <PersonCard
                key={p.id}
                person={p}
                ring={ring.key}
                onDelete={() => removePerson(p.id)}
                onEdit={(name, note) => editPerson(p.id, name, note)}
              />
            ))}
            {addOpen && (
              <AddPersonForm
                key="add-form"
                ring={ring.key}
                onAdd={addPerson}
                onCancel={() => setAddOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {!atMax && !addOpen && (
          <button
            onClick={() => setAddOpen(true)}
            data-testid={`btn-add-person-${ring.key}`}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-current/30 ${ring.color} opacity-60 hover:opacity-90 transition-opacity text-[12px] font-bold uppercase tracking-wide`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add someone
          </button>
        )}

        {atMax && !addOpen && (
          <p className="text-center text-[11px] text-muted-foreground italic mt-1">Your circle is full. Remove someone to add another.</p>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function IronCirclePage() {
  const RINGS: RingConfig[] = [
    {
      key: "pray",
      label: "Pray For",
      tagline: "People you intercede for — whether or not they know it.",
      verse: "I urge, then, that petitions, prayers, intercession and thanksgiving be made for all people.",
      verseRef: "1 Timothy 2:1",
      Icon: Shield,
      color: "text-violet-500",
      border: "border-violet-200 dark:border-violet-800/50",
      bg: "bg-violet-50/60 dark:bg-violet-950/20",
      accent: "bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-400",
      pillBg: "bg-violet-100 dark:bg-violet-900/40",
      pillText: "text-violet-700 dark:text-violet-300",
    },
    {
      key: "walk",
      label: "Walk With",
      tagline: "Your inner circle — people you actually do life with.",
      verse: "Walk with the wise and become wise, for a companion of fools suffers harm.",
      verseRef: "Proverbs 13:20",
      Icon: Users,
      color: "text-blue-500",
      border: "border-blue-200 dark:border-blue-800/50",
      bg: "bg-blue-50/60 dark:bg-blue-950/20",
      accent: "bg-gradient-to-r from-blue-500 via-sky-500 to-blue-400",
      pillBg: "bg-blue-100 dark:bg-blue-900/40",
      pillText: "text-blue-700 dark:text-blue-300",
    },
    {
      key: "aspire",
      label: "Aspire Toward",
      tagline: "People further ahead in faith whose lives call you upward.",
      verse: "As iron sharpens iron, so one person sharpens another.",
      verseRef: "Proverbs 27:17",
      Icon: Star,
      color: "text-amber-500",
      border: "border-amber-200 dark:border-amber-800/50",
      bg: "bg-amber-50/60 dark:bg-amber-950/20",
      accent: "bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400",
      pillBg: "bg-amber-100 dark:bg-amber-900/40",
      pillText: "text-amber-700 dark:text-amber-300",
    },
  ];

  const [circle, setCircle] = useState<CircleData>(loadCircle);
  const weekQ = WEEK_Q_PROMPTS[getWeekPromptIndex()];

  function handleChange(updated: CircleData) {
    setCircle(updated);
    saveCircle(updated);
  }

  const totalPeople = circle.pray.length + circle.walk.length + circle.aspire.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <NavBar />

      {/* Hero */}
      <div className="relative pt-14">
        <div
          className="w-full flex flex-col items-center justify-end pb-8 pt-8 text-center px-6"
          style={{ background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 40%, #a16207 100%)" }}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-white text-xl font-extrabold tracking-tight leading-snug drop-shadow-md">
            Your Iron Circle
          </h1>
          {/* Foundation verse — front and center */}
          <div className="mt-4 max-w-xs mx-auto bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
            <p className="text-white text-[14px] font-bold leading-snug drop-shadow-sm">
              "As iron sharpens iron, so one person sharpens another."
            </p>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mt-1.5">
              Proverbs 27:17
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-5 py-6">

        {/* Intro — Scripture first */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
        >
          <div className="bg-gradient-to-r from-primary/8 to-amber-500/5 border-b border-border/50 px-5 py-3">
            <p className="text-[13px] font-bold text-foreground/85 leading-snug italic">
              "Do not be deceived: Bad company corrupts good character."
            </p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary/60 mt-1">
              1 Corinthians 15:33
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[14px] text-foreground/80 leading-relaxed">
              Most believers drift into their friend group by accident. God's Word is clear: proximity shapes formation.
              The Iron Circle is an invitation to be <em>intentional</em> — to name the people you're interceding for,
              the ones you're walking with, and the ones whose lives are calling you forward.
            </p>
            <p className="text-[12px] text-muted-foreground leading-relaxed mt-2">
              Everything here is completely private — it never leaves your device.
            </p>
          </div>
        </motion.div>

        {/* Weekly reflection question */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="mb-6 rounded-2xl border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/60 dark:bg-indigo-950/20 px-5 py-4 shadow-sm overflow-hidden relative"
        >
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-400" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">
            This week's question
          </p>
          <p className="text-[15px] font-bold text-foreground leading-snug">
            {weekQ}
          </p>
        </motion.div>

        {/* Three rings */}
        {RINGS.map((ring, i) => (
          <motion.div
            key={ring.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
          >
            <RingSection ring={ring} circle={circle} onChange={handleChange} />
          </motion.div>
        ))}

        {/* Reflection note — after they've added people */}
        {totalPeople >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-muted/30 px-5 py-4 text-center"
          >
            <p className="text-[13px] text-muted-foreground leading-relaxed italic">
              "Show me your friends and I'll show you your future."
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">— paraphrase of Proverbs 13:20</p>
          </motion.div>
        )}

      </main>
    </div>
  );
}
