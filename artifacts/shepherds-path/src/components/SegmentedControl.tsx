interface Segment<T extends string> {
  id: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  testId?: string;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  className = "",
  testId = "segmented-control",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`flex rounded-xl bg-muted/60 dark:bg-muted/30 p-1 gap-1 ${className}`}
      data-testid={testId}
      role="tablist"
    >
      {segments.map((seg) => {
        const active = seg.id === value;
        return (
          <button
            key={seg.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`${testId}-${seg.id}`}
            onClick={() => onChange(seg.id)}
            className={`flex-1 py-2.5 px-2 rounded-lg text-[13px] font-semibold transition-all ${
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
