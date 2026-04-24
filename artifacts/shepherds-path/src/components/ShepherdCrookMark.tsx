interface ShepherdCrookMarkProps {
  className?: string;
  rounded?: string;
}

export function ShepherdCrookMark({ className = "w-7 h-7", rounded = "rounded-lg" }: ShepherdCrookMarkProps) {
  return (
    <div className={`${className} ${rounded} bg-primary flex items-center justify-center shrink-0`}>
      <svg
        viewBox="0 0 22 28"
        fill="none"
        stroke="white"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[60%] h-[60%]"
      >
        {/* Long shaft + crook centered in the viewBox.
            Shaft: x=5, y=26 → y=7 (19 units — clearly a staff)
            Hook: tight crook from y=7 up to y=2, curves to x=15, back down to y=11
            Visual center: x≈10 vs viewBox center x=11 ✓                  */}
        <path d="M5 26 L5 7 Q5 2 9.5 2 Q15 2 15 7 Q15 11 9.5 11" />
      </svg>
    </div>
  );
}
