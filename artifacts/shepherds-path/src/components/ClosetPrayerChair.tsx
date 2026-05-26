/** Side-view armchair — readable at small sizes in the prayer closet scene */
export function ClosetPrayerChair() {
  return (
    <div
      className="relative pointer-events-none select-none"
      style={{ width: 118, height: 108 }}
      data-testid="closet-chair"
      aria-hidden
    >
      {/* Floor shadow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[100%]"
        style={{
          bottom: 2,
          width: "88%",
          height: 14,
          background: "radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 72%)",
        }}
      />

      {/* Back legs */}
      <div
        className="absolute rounded-sm bg-[#1a1424]"
        style={{ left: 18, bottom: 8, width: 7, height: 22, boxShadow: "inset 1px 0 rgba(255,255,255,0.06)" }}
      />
      <div
        className="absolute rounded-sm bg-[#1a1424]"
        style={{ right: 22, bottom: 8, width: 7, height: 22, boxShadow: "inset 1px 0 rgba(255,255,255,0.06)" }}
      />

      {/* Seat base + cushion */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-md"
        style={{
          bottom: 26,
          width: 92,
          height: 28,
          background: "linear-gradient(180deg, #3d3350 0%, #2a2238 100%)",
          boxShadow: "0 6px 16px rgba(0,0,0,0.45)",
        }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-md"
        style={{
          bottom: 38,
          width: 86,
          height: 22,
          background: "linear-gradient(160deg, #5c4d78 0%, #433858 55%, #322a44 100%)",
          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -3px 8px rgba(0,0,0,0.25)",
        }}
      />

      {/* Backrest */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-t-lg rounded-b-sm"
        style={{
          bottom: 52,
          width: 78,
          height: 52,
          background: "linear-gradient(165deg, #524368 0%, #3a304c 45%, #2a2238 100%)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      />
      {/* Back highlight */}
      <div
        className="absolute rounded-t-md opacity-25"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 68,
          width: 42,
          height: 28,
          background: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)",
        }}
      />

      {/* Arms */}
      <div
        className="absolute rounded-lg"
        style={{
          left: 6,
          bottom: 44,
          width: 14,
          height: 36,
          background: "linear-gradient(90deg, #433858 0%, #322a44 100%)",
          boxShadow: "2px 4px 10px rgba(0,0,0,0.35)",
        }}
      />
      <div
        className="absolute rounded-lg"
        style={{
          right: 6,
          bottom: 44,
          width: 14,
          height: 36,
          background: "linear-gradient(270deg, #433858 0%, #322a44 100%)",
          boxShadow: "-2px 4px 10px rgba(0,0,0,0.35)",
        }}
      />

      {/* Front legs */}
      <div
        className="absolute rounded-sm bg-[#221c2e]"
        style={{ left: 14, bottom: 0, width: 8, height: 26 }}
      />
      <div
        className="absolute rounded-sm bg-[#221c2e]"
        style={{ right: 14, bottom: 0, width: 8, height: 26 }}
      />

      {/* Small accent pillow — reads as “seat for one” */}
      <div
        className="absolute rounded-sm"
        style={{
          left: "50%",
          transform: "translateX(-50%) rotate(-4deg)",
          bottom: 58,
          width: 34,
          height: 26,
          background: "linear-gradient(135deg, rgba(153,27,27,0.75) 0%, rgba(120,53,15,0.65) 100%)",
          boxShadow: "inset 0 1px 0 rgba(251,191,36,0.2)",
          border: "1px solid rgba(251,191,36,0.15)",
        }}
      />
    </div>
  );
}
