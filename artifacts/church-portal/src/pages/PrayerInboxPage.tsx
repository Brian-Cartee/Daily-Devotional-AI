import { useEffect, useState } from "react";
import { api, type PrayerRequest } from "../lib/api";

function looksLikePhone(name: string | null): boolean {
  if (!name?.trim()) return false;
  const trimmed = name.trim();
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && /^[\d\s().+-]+$/.test(trimmed);
}

function telHref(displayName: string | null): string {
  if (!looksLikePhone(displayName)) return "tel:";
  const digits = displayName!.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

export default function PrayerInboxPage() {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState("active");

  useEffect(() => {
    setLoading(true);
    api.prayer.list(filter)
      .then((data) => setRequests(data.requests))
      .finally(() => setLoading(false));
  }, [filter]);

  async function handleDraft(id: number) {
    setDrafting(id);
    try {
      const { draft } = await api.prayer.draft(id);
      setDrafts((prev) => ({ ...prev, [id]: draft }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDrafting(null);
    }
  }

  async function handleMarkAnswered(id: number) {
    const text = drafts[id] || "";
    await api.prayer.updateStatus(id, "answered", text || undefined);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleArchive(id: number) {
    await api.prayer.updateStatus(id, "archived");
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 600 }}>Prayer Inbox</h1>
      <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 14 }}>
        Review and respond to your congregation's prayer requests.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["active", "answered", "archived"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              background: filter === s ? "#2d6a4f" : "#fff",
              color: filter === s ? "#fff" : "#374151",
              border: "1px solid #e5e7eb",
              padding: "6px 16px", fontSize: 13, borderRadius: 20,
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading...</p>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🙏</div>
          <p style={{ fontSize: 15 }}>No {filter} prayer requests.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {requests.map((r) => {
            const urgent = r.urgency_flagged === true;
            return (
            <div key={r.id} style={{
              background: "#fff", border: "1px solid #e5e7eb",
              borderLeft: urgent ? "4px solid #dc2626" : undefined,
              borderRadius: 12, padding: "20px 24px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#1b4332" }}>
                    {r.is_anonymous ? "Anonymous" : (r.display_name || "Member")}
                  </span>
                  <span style={{
                    marginLeft: 10, fontSize: 11, background: "#f3f4f6",
                    color: "#6b7280", padding: "2px 8px", borderRadius: 20,
                  }}>
                    {r.category}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  {urgent && (
                    <>
                      <span style={{
                        fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                        background: "#fee2e2", color: "#991b1b",
                        padding: "2px 8px", borderRadius: 20,
                      }}>
                        URGENT
                      </span>
                      {r.urgency_reason && (
                        <span style={{ fontSize: 12, fontStyle: "italic", color: "#991b1b", textAlign: "right", maxWidth: 280 }}>
                          {r.urgency_reason}
                        </span>
                      )}
                    </>
                  )}
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.6, color: "#374151" }}>
                {r.request}
              </p>

              {drafts[r.id] && (
                <div style={{
                  background: "#e8f5ee", border: "1px solid #b7e4c7",
                  borderRadius: 8, padding: "14px 16px", marginBottom: 16,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#2d6a4f", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    AI draft — review before sending
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: "#1b4332", lineHeight: 1.6 }}>
                    {drafts[r.id]}
                  </p>
                </div>
              )}

              {filter === "active" && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleDraft(r.id)}
                    disabled={drafting === r.id}
                    style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", fontSize: 13, padding: "7px 14px" }}
                  >
                    {drafting === r.id ? "Drafting..." : "✦ Draft reply"}
                  </button>
                  {urgent && (
                    <a
                      href={telHref(r.is_anonymous ? null : r.display_name)}
                      style={{
                        background: "#dc2626", color: "#fff", fontSize: 13,
                        padding: "7px 14px", borderRadius: 6, textDecoration: "none",
                        display: "inline-block",
                      }}
                    >
                      {looksLikePhone(r.is_anonymous ? null : r.display_name)
                        ? r.display_name
                        : "Call member"}
                    </a>
                  )}
                  <button
                    onClick={() => handleMarkAnswered(r.id)}
                    style={{ background: "#2d6a4f", color: "#fff", fontSize: 13, padding: "7px 14px" }}
                  >
                    Mark answered
                  </button>
                  <button
                    onClick={() => handleArchive(r.id)}
                    style={{ background: "#fff", color: "#9ca3af", border: "1px solid #e5e7eb", fontSize: 13, padding: "7px 14px" }}
                  >
                    Archive
                  </button>
                </div>
              )}
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
