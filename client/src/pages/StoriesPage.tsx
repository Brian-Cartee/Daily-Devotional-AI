import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Star, Send, Check, X, ChevronDown } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import storiesHero from "@assets/REV1001_S_P_(1400_x_600_px)-2_1773097642649.png";

const CATEGORIES = [
  "All",
  "Spiritual Guidance",
  "Daily Devotional",
  "Prayer",
  "Bible Journey",
  "Dark Season",
  "Scripture",
];

const STORIES = [
  {
    id: 1,
    name: "Marcus",
    initial: "M",
    category: "Spiritual Guidance",
    avatarBg: "bg-primary/15",
    avatarColor: "text-primary",
    accent: "from-primary via-violet-500 to-amber-400",
    quote: "I was in the middle of the hardest season of my life and didn't know where to turn. I typed out what I was feeling and within seconds I had scripture that felt like it was written exactly for my situation. It wasn't generic — it was pastoral. I cried. I'm not embarrassed to say that.",
    detail: "Spiritual Guidance",
  },
  {
    id: 2,
    name: "Sarah",
    initial: "S",
    category: "Daily Devotional",
    avatarBg: "bg-amber-500/15",
    avatarColor: "text-amber-700 dark:text-amber-400",
    accent: "from-amber-400 via-orange-400 to-primary",
    quote: "I've tried Bible apps before but always abandoned them after a week. The daily devotionals here feel like they were written for where I am right now. Three months in and I haven't missed a day. That's never happened in my life.",
    detail: "Daily Devotional",
  },
  {
    id: 3,
    name: "David",
    initial: "D",
    category: "Bible Journey",
    avatarBg: "bg-violet-500/15",
    avatarColor: "text-violet-700 dark:text-violet-400",
    accent: "from-violet-500 to-amber-400",
    quote: "My faith had gone cold. I knew the Bible but it had stopped feeling alive. The Life of Jesus journey walked me through passages I'd read a hundred times and somehow I saw things I'd never noticed. I started underlining things in my physical Bible again.",
    detail: "Journey: Life of Jesus",
  },
  {
    id: 4,
    name: "Priya",
    initial: "P",
    category: "Dark Season",
    avatarBg: "bg-rose-500/15",
    avatarColor: "text-rose-700 dark:text-rose-400",
    accent: "from-rose-400 via-primary to-violet-500",
    quote: "After my divorce I stopped praying entirely. I felt like God couldn't hear me or didn't want to. A friend sent me this app. I typed 'I don't even know how to talk to God anymore' and the response met me exactly there — no judgment, just grace. I've been praying again for six weeks.",
    detail: "Dark Season",
  },
  {
    id: 5,
    name: "James",
    initial: "J",
    category: "Prayer",
    avatarBg: "bg-green-500/15",
    avatarColor: "text-green-700 dark:text-green-400",
    accent: "from-green-500 via-primary to-violet-400",
    quote: "I use the prayer journal every morning before my family wakes up. Seeing my entries from months ago is like reading letters from a different version of myself — and seeing how God answered things I'd forgotten I'd asked for is breathtaking.",
    detail: "Prayer Journal",
  },
  {
    id: 6,
    name: "Cheryl",
    initial: "C",
    category: "Spiritual Guidance",
    avatarBg: "bg-sky-500/15",
    avatarColor: "text-sky-700 dark:text-sky-400",
    accent: "from-sky-400 via-primary to-violet-400",
    quote: "I'm a pastor and I was skeptical. But I've started quietly recommending this to people in my congregation who don't have a spiritual director or counselor. The pastoral depth surprised me. It knows when to give comfort and when to gently challenge.",
    detail: "Spiritual Guidance",
  },
  {
    id: 7,
    name: "Ray",
    initial: "R",
    category: "Scripture",
    avatarBg: "bg-amber-500/15",
    avatarColor: "text-amber-700 dark:text-amber-400",
    accent: "from-amber-400 via-orange-400 to-rose-400",
    quote: "I've never been a 'Bible person' — I always felt like it was for people who already had it figured out. This app made me feel like a beginner was welcome. I used the scripture finder to look up a story my grandmother used to tell me and found it in minutes. I actually read the whole chapter.",
    detail: "Scripture",
  },
  {
    id: 8,
    name: "Leanne",
    initial: "L",
    category: "Daily Devotional",
    avatarBg: "bg-violet-500/15",
    avatarColor: "text-violet-700 dark:text-violet-400",
    accent: "from-violet-500 via-primary to-amber-400",
    quote: "I listen to the devotionals on my commute now. Hearing the words spoken aloud somehow lands differently than reading — like being read to by someone who actually cares what happens to you. I've started my day with faith for the first time in years.",
    detail: "Daily Devotional",
  },
];

interface StoryFormData {
  name: string;
  category: string;
  story: string;
}

export default function StoriesPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StoryFormData>({ name: "", category: "Spiritual Guidance", story: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  const openShareForm = () => {
    setShowForm(true);
    setTimeout(() => {
      shareRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const filtered = activeCategory === "All"
    ? STORIES
    : STORIES.filter(s => s.category === activeCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.story.trim()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background pt-14">

        {/* Hero */}
        <div className="relative w-full overflow-hidden" style={{ height: 260 }}>
          <img
            src={storiesHero}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center 30%" }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%)" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 text-center px-6">
            <h1 className="text-[26px] font-bold text-white leading-tight mb-1">Real Faith. Real Stories.</h1>
            <p className="text-[13px] text-white/75 max-w-xs leading-snug">
              What happens when scripture meets a real moment in someone's life.
            </p>
          </div>
        </div>

        {/* Category filter */}
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40">
          <div className="max-w-xl mx-auto px-4 py-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  data-testid={`filter-${cat.toLowerCase().replace(/\s/g, "-")}`}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stories feed */}
        <main className="max-w-xl mx-auto px-4 py-6 pb-32">

          <AnimatePresence mode="popLayout">
            {filtered.map((story, i) => (
              <motion.div
                key={story.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                data-testid={`card-story-${story.id}`}
                className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-sm mb-4"
              >
                <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${story.accent}`} />
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                      {story.category}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-[15px] text-foreground leading-relaxed italic font-medium mb-4">
                    &ldquo;{story.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-2.5 pt-3 border-t border-border/60">
                    <div className={`w-8 h-8 rounded-full ${story.avatarBg} flex items-center justify-center text-[13px] font-bold ${story.avatarColor}`}>
                      {story.initial}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground leading-none">{story.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{story.detail}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Share your story CTA */}
          <motion.div
            ref={shareRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-4"
          >
            <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-violet-500/5 to-amber-500/5">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-violet-500 to-amber-400" />
              <div className="px-5 pt-5 pb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-primary" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary/70">Your Story Matters</p>
                </div>
                <p className="text-[15px] font-bold text-foreground leading-snug mb-1.5">
                  Has God met you through this app?
                </p>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
                  Your experience could be exactly what someone else needs to hear. Share a moment — big or small — and we may feature it here.
                </p>

                <AnimatePresence mode="wait">
                  {!showForm && !submitted && (
                    <motion.button
                      key="cta"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={openShareForm}
                      data-testid="button-share-story"
                      className="flex items-center gap-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-semibold px-5 py-2.5 transition-colors shadow-sm"
                    >
                      <Heart className="w-3.5 h-3.5" />
                      Share your story
                    </motion.button>
                  )}

                  {showForm && !submitted && (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-3"
                    >
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Your first name</label>
                        <input
                          type="text"
                          spellCheck
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="e.g. Sarah"
                          data-testid="input-story-name"
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Category</label>
                        <div className="relative">
                          <select
                            value={form.category}
                            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                            data-testid="select-story-category"
                            className="w-full appearance-none bg-background border border-border rounded-xl px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-primary/30 pr-8"
                          >
                            {CATEGORIES.filter(c => c !== "All").map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Your story</label>
                        <textarea
                          value={form.story}
                          onChange={e => setForm(f => ({ ...f, story: e.target.value }))}
                          placeholder="What happened? How did God show up? How did scripture meet your moment?"
                          spellCheck
                          rows={5}
                          data-testid="textarea-story-content"
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all resize-none leading-relaxed placeholder:text-muted-foreground/60"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={!form.name.trim() || !form.story.trim() || submitting}
                          data-testid="button-story-submit"
                          className="flex items-center gap-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-semibold px-5 py-2.5 transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {submitting
                            ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            : <Send className="w-3.5 h-3.5" />
                          }
                          {submitting ? "Sending…" : "Send my story"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowForm(false)}
                          data-testid="button-story-cancel"
                          className="text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.form>
                  )}

                  {submitted && (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 py-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-foreground">Thank you, {form.name}.</p>
                        <p className="text-[12px] text-muted-foreground">Your story is being reviewed and may be featured here.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

        </main>
      </div>

      {/* Floating share button — visible while scrolling, hides when form is open or submitted */}
      <AnimatePresence>
        {!showForm && !submitted && (
          <motion.button
            key="fab"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3 }}
            onClick={openShareForm}
            data-testid="button-fab-share"
            className="fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold px-4 py-3 shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all sm:bottom-6"
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            Share your story
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
