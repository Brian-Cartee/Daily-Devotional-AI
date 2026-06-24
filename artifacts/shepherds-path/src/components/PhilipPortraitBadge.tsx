/** Compact Philip portrait with gold halo — for home cards and re-entry moments. */
export function PhilipPortraitBadge({ size = 56 }: { size?: number }) {
  const pad = 8;
  const outer = size + pad * 2;

  return (
    <div
      style={{ position: "relative", width: outer, height: outer, flexShrink: 0 }}
      aria-hidden
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(251,191,36,0.38) 0%, rgba(251,191,36,0.08) 55%, transparent 72%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: pad - 2,
          left: pad - 2,
          width: size + 4,
          height: size + 4,
          borderRadius: "50%",
          border: "1.5px solid rgba(251,191,36,0.42)",
        }}
      />
      <img
        src="/philip.jpg"
        alt=""
        style={{
          position: "absolute",
          top: pad,
          left: pad,
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}
