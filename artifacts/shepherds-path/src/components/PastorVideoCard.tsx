interface PastorVideoCardProps {
  pastorName: string;
  churchName: string;
  title: string;
  youtubeUrl: string;
  sectionLabel?: string;
}

export function PastorVideoCard({
  pastorName,
  churchName,
  title,
  youtubeUrl,
  sectionLabel = "A PASTOR FOR THIS MOMENT",
}: PastorVideoCardProps) {
  return (
    <div className="mt-6" data-testid="card-pastor-video">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70 text-center mb-3">
        {sectionLabel}
      </p>
      <div
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-violet-950/40 to-slate-900/90 px-5 py-4 shadow-lg shadow-black/20"
        style={{ background: "linear-gradient(145deg, rgba(15,10,32,0.95) 0%, rgba(30,20,55,0.88) 100%)" }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="text-violet-400/90 text-sm leading-none mt-0.5 flex-shrink-0" aria-hidden>
              ✝
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-white leading-tight">{pastorName}</p>
              <p className="text-[12px] text-white/45 mt-0.5 leading-snug">{churchName}</p>
            </div>
          </div>
        </div>
        <p className="text-[14px] font-medium text-white/90 leading-snug line-clamp-2 mb-4">
          {title}
        </p>
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="btn-pastor-video-watch"
          className="flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/8 hover:bg-white/12 text-white text-[13px] font-semibold py-2.5 transition-colors"
        >
          Watch →
        </a>
      </div>
    </div>
  );
}
