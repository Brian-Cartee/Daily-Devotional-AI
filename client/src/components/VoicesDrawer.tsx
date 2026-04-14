import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ChevronDown, X } from "lucide-react";

const TESTIMONIES = [
  {
    id: 1,
    text: "I opened this app at 2am when I couldn't stop crying. I don't know how to explain it, but I felt less alone by morning.",
    name: "Rachel",
  },
  {
    id: 2,
    text: "My marriage was falling apart and I had nowhere to turn. I started praying through this app every day. We're still together.",
    name: "Marcus",
  },
  {
    id: 3,
    text: "I've been in church my whole life but never felt like I actually knew God. That changed for me this year.",
    name: "Anonymous",
  },
  {
    id: 4,
    text: "Lost my job in March. Spent a lot of mornings just sitting with the devotionals here. Something about that quiet held me together.",
    name: "Daniel",
  },
  {
    id: 5,
    text: "I was angry at God for a long time. I'm not sure when that shifted, but it did. This was part of it.",
    name: "Anonymous",
  },
  {
    id: 6,
    text: "My daughter started using this app after I shared it with her. We pray together now, even from different states.",
    name: "Patricia",
  },
];

export function VoicesDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex flex-col items-center my-1">
      {/* Collapsed handle — subtle, always visible */}
      <AnimatePresence mode="wait">
        {!open && (
          <motion.button
            key="handle"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            onClick={() => setOpen(true)}
            data-testid="button-voices-open"
            aria-label="Open Voices — stories from the community"
            className="group flex items-center gap-2 px-4 py-2 rounded-full border border-foreground/10 bg-background/30 backdrop-blur-sm hover:bg-background/50 hover:border-foreground/20 transition-all duration-300"
            style={{ opacity: 0.48 }}
          >
            <MessageCircle
              className="w-3.5 h-3.5 text-foreground/70 group-hover:text-foreground/90 transition-colors"
              strokeWidth={1.8}
            />
            <span className="text-[11px] font-semibold text-foreground/70 group-hover:text-foreground/90 tracking-wide transition-colors">
              Voices
            </span>
            <ChevronDown
              className="w-3 h-3 text-foreground/50 group-hover:text-foreground/70 transition-colors"
              strokeWidth={2}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full overflow-hidden"
          >
            <div className="pt-1 pb-2">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4 px-0.5">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-muted-foreground/70" strokeWidth={1.8} />
                  <span className="text-[12px] font-semibold text-muted-foreground/80 tracking-wide uppercase">
                    Voices
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  data-testid="button-voices-close"
                  aria-label="Close Voices"
                  className="p-1.5 rounded-full hover:bg-muted/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground/60" />
                </button>
              </div>

              {/* Testimony cards */}
              <div className="flex flex-col gap-2.5">
                {TESTIMONIES.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06, ease: "easeOut" }}
                    className="rounded-2xl bg-muted/35 border border-foreground/[0.06] px-4 py-3.5"
                  >
                    <p
                      className="text-[14px] text-foreground/75 leading-[1.65] mb-2"
                      style={{ fontFamily: "var(--font-reading, Georgia, serif)" }}
                    >
                      "{item.text}"
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground/55 tracking-wide">
                      — {item.name}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Close nudge */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setOpen(false)}
                  data-testid="button-voices-collapse"
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
                >
                  <ChevronDown className="w-3 h-3 rotate-180" strokeWidth={2} />
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
