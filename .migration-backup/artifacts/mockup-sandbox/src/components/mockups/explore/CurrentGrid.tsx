import { Compass, BookOpen, BookMarked, Trophy, Swords, HandHeart, Star, Sunrise, Sparkles, Play } from "lucide-react";

const tiles = [
  { label: "Bible Journeys",      desc: "Start a guided path",                    color: "text-indigo-400",  bg: "border-indigo-500/25 bg-indigo-500/8" },
  { label: "Read the Bible",      desc: "KJV, WEB, and ASV",                      color: "text-amber-400",   bg: "border-amber-500/25  bg-amber-500/8" },
  { label: "Prayer Journal",      desc: "Your saved prayers & reflections",        color: "text-teal-400",    bg: "border-teal-500/25   bg-teal-500/8" },
  { label: "Bible Trivia",        desc: "Test your scripture knowledge",           color: "text-violet-400",  bg: "border-violet-500/25 bg-violet-500/8" },
  { label: "Iron Sharpens Iron",  desc: "Walk alongside others in faith",          color: "text-rose-400",    bg: "border-rose-500/25   bg-rose-500/8" },
  { label: "Prayer Wall",         desc: "Lift each other up",                      color: "text-sky-400",     bg: "border-sky-500/25    bg-sky-500/8" },
  { label: "Bible in a Year",     desc: "A daily path through all of Scripture",   color: "text-emerald-400", bg: "border-emerald-500/25 bg-emerald-500/8" },
  { label: "Beginning with Jesus",desc: "Begin your faith journey",                color: "text-amber-400",   bg: "border-amber-500/25  bg-amber-500/8" },
  { label: "Explore Scripture",   desc: "A question, a passage, anything on your mind", color: "text-amber-400", bg: "border-amber-500/25 bg-amber-500/8" },
  { label: "Stories",             desc: "Real testimonies of faith",               color: "text-violet-400",  bg: "border-violet-500/25 bg-violet-500/8" },
];

const icons = [Compass, BookOpen, BookMarked, Trophy, Swords, HandHeart, Star, Sunrise, Sparkles, Play];

export default function CurrentGrid() {
  return (
    <div className="min-h-screen bg-[#0d0a1a] flex flex-col items-center justify-start p-4 pt-8">
      <div className="w-full max-w-[358px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-purple-500/40" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Explore</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-purple-500/30 to-purple-500/40" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {tiles.map((tile, i) => {
            const Icon = icons[i];
            return (
              <div
                key={tile.label}
                className={`rounded-2xl border p-4 flex flex-col gap-2 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all ${tile.bg}`}
              >
                <Icon className={`w-6 h-6 ${tile.color}`} strokeWidth={1.6} />
                <div>
                  <p className="text-[14px] font-bold text-white leading-tight">{tile.label}</p>
                  <p className={`text-[11px] mt-0.5 leading-snug ${tile.color} opacity-80`}>{tile.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
