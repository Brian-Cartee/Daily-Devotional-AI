interface Props {
  text: string;
  className?: string;
  verseNumClassName?: string;
}

export function BiblePassageText({ text, className, verseNumClassName }: Props) {
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

  return (
    <div className={className ?? "text-sm leading-[1.9]"}>
      {verses.map((v, i) => (
        <span key={i} className="inline">
          {v.num && (
            <sup className={verseNumClassName ?? "text-[10px] font-bold text-primary/60 mr-0.5 select-none"}>
              {v.num}
            </sup>
          )}
          {v.body.replace(/\n+/g, " ").trim()}
          {" "}
        </span>
      ))}
    </div>
  );
}
