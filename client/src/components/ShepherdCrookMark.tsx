interface ShepherdCrookMarkProps {
  className?: string;
  rounded?: string;
}

export function ShepherdCrookMark({ className = "w-7 h-7", rounded = "rounded-lg" }: ShepherdCrookMarkProps) {
  return (
    <div className={`${className} ${rounded} bg-primary flex items-center justify-center shrink-0`}>
      <svg
        viewBox="0 0 18 22"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[58%] h-[58%]"
      >
        <path d="M9 21 L9 9 Q9 2 13 2 Q17 2 17 6 Q17 11 13 11" />
      </svg>
    </div>
  );
}
