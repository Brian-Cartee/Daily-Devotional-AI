import { Compass, BookOpen, BookMarked, Trophy, Swords, HandHeart, Star, Sunrise, Sparkles, Play } from "lucide-react";

const group1 = [
  { label: "Beginning with Jesus", desc: "Begin your faith journey",      color: "text-amber-400",   bg: "border-amber-500/25  bg-amber-500/8",  Icon: Sunrise },
  { label: "Bible Journeys",       desc: "Start a guided path",            color: "text-indigo-400",  bg: "border-indigo-500/25 bg-indigo-500/8", Icon: Compass },
  { label: "Prayer Wall",          desc: "Lift each other up",             color: "text-sky-400",     bg: "border-sky-500/25    bg-sky-500/8",    Icon: HandHeart },
  { label: "Iron Sharpens Iron",   desc: "Walk alongside others in faith", color: "text-rose-400",    bg: "border-rose-500/25   bg-rose-500/8",   Icon: Swords },
];

const group2Pair = [
  { label: "Prayer Journal",    desc: "Your saved prayers & reflections",      color: "text-teal-400",    bg: "border-teal-500/25   bg-teal-500/8",    Icon: BookMarked },
  { label: "Bible in a Year",   desc: "A daily path through all of Scripture", color: "text-emerald-400", bg: "border-emerald-500/25 bg-emerald-500/8", Icon: Star },
];
const exploreTile = { label: "Explore Scripture", desc: "A question, a passage, anything on your mind", color: "text-amber-400", bg: "border-amber-500/25 bg-amber-500/8", Icon: Sparkles };

const group3 = [
  { label: "Read the Bible", desc: "KJV, WEB, and ASV",            color: "text-amber-400",  bg: "border-amber-500/25  bg-amber-500/8",  Icon: BookOpen },
  { label: "Stories",        desc: "Real testimonies of faith",    color: "text-violet-400", bg: "border-violet-500/25 bg-violet-500/8", Icon: Play },
  { label: "Bible Trivia",   desc: "Test your scripture knowledge",color: "text-violet-400", bg: "border-violet-500/25 bg-violet-500/8", Icon: Trophy },
];

function TileRow({ tiles }: { tiles: typeof group1 }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {tiles.map(({ label, desc, color, bg, Icon }) => (
        <div key={label} className={`rounded-2xl border p-4 flex flex-col gap-2 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all ${bg}`}>
          <Icon className={`w-6 h-6 ${color}`} strokeWidth={1.6} />
          <div>
            <p className="text-[14px] font-bold text-white leading-tight">{label}</p>
            <p className={`text-[11px] mt-0.5 leading-snug ${color} opacity-80`}>{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function WideTile({ tile }: { tile: typeof exploreTile }) {
  const Icon = tile.Icon;
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all ${tile.bg}`}>
      <Icon className={`w-6 h-6 ${tile.color} shrink-0`} strokeWidth={1.6} />
      <div>
        <p className="text-[14px] font-bold text-white leading-tight">{tile.label}</p>
        <p className={`text-[11px] mt-0.5 leading-snug ${tile.color} opacity-80`}>{tile.desc}</p>
      </div>
    </div>
  );
}

export default function GroupedGrid() {
  return (
    <div className="min-h-screen bg-[#0d0a1a] flex flex-col items-center justify-start p-4 pt-8">
      <div className="w-full max-w-[358px] flex flex-col gap-5">

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-purple-500/40" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Explore</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-purple-500/30 to-purple-500/40" />
        </div>

        {/* Group 1 — Entry & Community */}
        <TileRow tiles={group1} />

        {/* Thin divider */}
        <div className="h-px bg-white/6 mx-2 -mt-1" />

        {/* Group 2 — Practice */}
        <div className="flex flex-col gap-2.5 -mt-1">
          <TileRow tiles={group2Pair} />
          <WideTile tile={exploreTile} />
        </div>

        {/* Thin divider */}
        <div className="h-px bg-white/6 mx-2 -mt-1" />

        {/* Group 3 — Light / Optional */}
        <div className="-mt-1">
          <TileRow tiles={group3} />
        </div>

      </div>
    </div>
  );
}
