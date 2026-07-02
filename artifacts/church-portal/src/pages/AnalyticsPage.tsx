import { useEffect, useState } from "react";
import { api, type AnalyticsResponse } from "../lib/api";
import { PageHeader, cardStyle } from "../components/ui";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.analytics.get()
      .then(setData)
      .catch((err: Error) => alert(err.message))
      .finally(() => setLoading(false));
  }, []);

  const cards = data
    ? [
        { label: "New members", value: data.newMembers, sub: "joined in last 30 days" },
        { label: "Prayer requests", value: data.prayerRequests, sub: "submitted" },
        { label: "Visitors logged", value: data.visitorsLogged, sub: "recorded" },
        { label: "Announcements", value: data.announcementsPublished, sub: "published" },
      ]
    : [];

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Activity over the last 30 days." />

      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading...</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
            {cards.map((card) => (
              <div key={card.label} style={cardStyle}>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 32, fontWeight: 600, color: "#1b4332", marginBottom: 4 }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>{card.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ ...cardStyle, background: "rgba(45,106,79,0.06)" }}>
            <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
              These counts reflect church-scoped activity in Shepherd's Path over the past {data?.periodDays ?? 30} days.
              Use them to spot trends in engagement — prayer volume, visitor follow-up, and member growth.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
