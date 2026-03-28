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
            Shaft: x=5, y=26 → y=9 (17 units — clearly a staff)
            Hook: curves over top right and back down, ending at (11,15)
            Visual center: x≈11.5 vs viewBox center x=11 ✓               */}
        <path d="M5 26 L5 9 Q5 2 11 2 Q18 2 18 8 Q18 15 11 15" />
      </svg>
    </div>
  );
}
