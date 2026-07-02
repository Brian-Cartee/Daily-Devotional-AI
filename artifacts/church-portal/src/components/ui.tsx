import type { CSSProperties } from "react";
import { useChurch } from "../contexts/ChurchContext";

export function EmptyState({ icon, title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "#9ca3af" }}>
      {icon && <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>}
      <p style={{ fontSize: 15, margin: "0 0 4px" }}>{title}</p>
      {subtitle && <p style={{ fontSize: 13, margin: 0 }}>{subtitle}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { church } = useChurch();
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 600 }}>{title}</h1>
      {subtitle && (
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>{subtitle}</p>
      )}
      {church && (
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#9ca3af" }}>{church.name}</p>
      )}
    </div>
  );
}

export const cardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "20px 24px",
};

export const primaryBtn: CSSProperties = {
  background: "#2d6a4f",
  color: "#fff",
  padding: "10px 20px",
  fontSize: 14,
};

export const secondaryBtn: CSSProperties = {
  background: "#f3f4f6",
  color: "#374151",
  border: "1px solid #e5e7eb",
  padding: "7px 14px",
  fontSize: 13,
};
