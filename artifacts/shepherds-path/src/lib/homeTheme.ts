/** WKWebView-safe homepage palette — hex/rgba only (no hsl(var()) slash syntax). */
export const HOME_DARK = {
  pageBg: "#0a0610",
  heroBg: "#09031e",
  card: "#1a1820",
  cardBorder: "rgba(255,255,255,0.10)",
  text: "#f0ebe3",
  textSoft: "rgba(240,235,227,0.80)",
  textMuted: "rgba(240,235,227,0.62)",
  textSubtle: "rgba(240,235,227,0.48)",
  primary: "#d946ef",
  teal: "#2dd4bf",
} as const;

export const homeStackStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "12px",
  maxWidth: "36rem",
  marginLeft: "auto",
  marginRight: "auto",
  paddingLeft: "16px",
  paddingRight: "16px",
  width: "100%",
  boxSizing: "border-box" as const,
};
