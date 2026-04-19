import { useEffect } from "react";

export default function OgPreview() {
  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.margin = "";
      document.body.style.padding = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(135deg, #5b0ea6 0%, #7c1fba 50%, #6610a8 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "60px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        zIndex: 99999,
      }}
    >
      <img
        src="/sp-icon.png"
        alt="Shepherd's Path"
        style={{ width: "200px", height: "200px", borderRadius: "40px", flexShrink: 0 }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div
          style={{
            fontSize: "68px",
            fontWeight: "800",
            color: "#ffffff",
            lineHeight: 1.05,
            letterSpacing: "-1px",
          }}
        >
          Shepherd's<br />Path
        </div>
        <div
          style={{
            fontSize: "26px",
            color: "rgba(255,255,255,0.80)",
            fontWeight: "400",
            lineHeight: 1.4,
          }}
        >
          You don't have to walk this alone.
        </div>
      </div>
    </div>
  );
}
