import { useEffect, useState } from "react";
import { api, type Announcement } from "../lib/api";

function sortAnnouncements(list: Announcement[]): Announcement[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  function category(a: Announcement): number {
    if (!a.event_date) return 1;
    const eventMs = new Date(a.event_date + "T00:00:00").getTime();
    return eventMs >= todayMs ? 0 : 2;
  }

  return [...list].sort((a, b) => {
    const catA = category(a);
    const catB = category(b);
    if (catA !== catB) return catA - catB;
    if (catA === 0) {
      return new Date(a.event_date! + "T00:00:00").getTime() - new Date(b.event_date! + "T00:00:00").getTime();
    }
    if (catA === 1) {
      return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
    }
    return new Date(b.event_date! + "T00:00:00").getTime() - new Date(a.event_date! + "T00:00:00").getTime();
  });
}

function formatEventBadge(a: Announcement): string {
  const dateStr = new Date(a.event_date! + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  if (a.location?.trim()) {
    return `📅 ${dateStr}  ·  ${a.location.trim()}`;
  }
  return `📅 ${dateStr}`;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.announcements.list()
      .then((data) => setAnnouncements(sortAnnouncements(data.announcements)))
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setTitle("");
    setBody("");
    setEventDate("");
    setLocation("");
    setPinned(false);
    setShowForm(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.announcements.create({
        title,
        body,
        pinned,
        event_date: eventDate || null,
        location: location.trim() || null,
      });
      const data = await api.announcements.list();
      setAnnouncements(sortAnnouncements(data.announcements));
      resetForm();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this announcement?")) return;
    await api.announcements.delete(id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleTogglePin(a: Announcement) {
    await api.announcements.update(a.id, { pinned: !a.pinned });
    setAnnouncements((prev) => sortAnnouncements(
      prev.map((x) => x.id === a.id ? { ...x, pinned: !x.pinned } : x),
    ));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 600 }}>Announcements</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>Post updates your members see in the app.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: "#2d6a4f", color: "#fff", padding: "10px 20px", fontSize: 14 }}
        >
          {showForm ? "Cancel" : "+ New announcement"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
          padding: "24px", marginBottom: 24,
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sunday service reminder" required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Join us this Sunday at 10am for worship..."
              required
              rows={4}
              style={{ resize: "vertical" }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Event date <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              style={{ maxWidth: 200 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Location <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Fellowship Hall, Room 201"
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <input type="checkbox" id="pinned" checked={pinned} onChange={(e) => setPinned(e.target.checked)} style={{ width: "auto" }} />
            <label htmlFor="pinned" style={{ fontSize: 13, color: "#374151" }}>Pin to top of announcements</label>
          </div>
          <button type="submit" disabled={saving} style={{ background: "#2d6a4f", color: "#fff" }}>
            {saving ? "Posting..." : "Post announcement"}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading...</p>
      ) : announcements.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📢</div>
          <p style={{ fontSize: 15 }}>No announcements yet. Post your first one above.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {announcements.map((a) => (
            <div key={a.id} style={{
              background: "#fff", border: `1px solid ${a.pinned ? "#b7e4c7" : "#e5e7eb"}`,
              borderRadius: 12, padding: "18px 22px",
              borderLeft: a.pinned ? "4px solid #2d6a4f" : "1px solid #e5e7eb",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {a.pinned && <span style={{ fontSize: 11, background: "#e8f5ee", color: "#2d6a4f", padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>Pinned</span>}
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{a.title}</span>
                  </div>
                  {a.event_date && (
                    <div style={{ fontSize: 12, color: "#d97706", marginBottom: 6 }}>
                      {formatEventBadge(a)}
                    </div>
                  )}
                  <p style={{ margin: "0 0 8px", fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{a.body}</p>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>
                    {new Date(a.published_at || a.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, marginLeft: 16, flexShrink: 0 }}>
                  <button
                    onClick={() => handleTogglePin(a)}
                    style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "5px 12px", fontSize: 12 }}
                  >
                    {a.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    style={{ background: "#fff", color: "#dc2626", border: "1px solid #fecaca", padding: "5px 12px", fontSize: 12 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
