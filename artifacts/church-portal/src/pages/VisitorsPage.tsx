import { useEffect, useState, type CSSProperties } from "react";
import { api, type Visitor, type VisitorFollowUpStatus } from "../lib/api";

const STATUS_OPTIONS: { value: VisitorFollowUpStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "no-response", label: "No response" },
  { value: "connected", label: "Connected" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function statusStyle(status: VisitorFollowUpStatus): CSSProperties {
  switch (status) {
    case "pending":
      return { background: "#fef9c3", color: "#854d0e", borderColor: "#fde047" };
    case "contacted":
      return { background: "#dbeafe", color: "#1e40af", borderColor: "#93c5fd" };
    case "no-response":
      return { background: "#f3f4f6", color: "#4b5563", borderColor: "#d1d5db" };
    case "connected":
      return { background: "var(--green-light)", color: "var(--green)", borderColor: "#b7e4c7" };
    default:
      return { background: "#f3f4f6", color: "#4b5563", borderColor: "#d1d5db" };
  }
}

function displayName(v: Visitor): string {
  return [v.first_name, v.last_name].filter(Boolean).join(" ");
}

function formatVisitDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [visitDate, setVisitDate] = useState(todayIso());
  const [notes, setNotes] = useState("");

  async function loadVisitors() {
    const data = await api.visitors.list();
    setVisitors(data.visitors);
  }

  useEffect(() => {
    loadVisitors()
      .catch((err: Error) => alert(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;
    setSaving(true);
    try {
      const { visitor } = await api.visitors.create({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        visitDate: visitDate || todayIso(),
        notes: notes.trim() || undefined,
      });
      setVisitors((prev) => [visitor, ...prev].slice(0, 50));
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setVisitDate(todayIso());
      setNotes("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not save visitor");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: number, followUpStatus: VisitorFollowUpStatus) {
    setUpdatingId(id);
    try {
      const { visitor } = await api.visitors.updateStatus(id, followUpStatus);
      setVisitors((prev) => prev.map((v) => (v.id === id ? visitor : v)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 600 }}>Visitors</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
          Log first-time guests and track follow-up.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        style={{
          background: "var(--white)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 24,
          marginBottom: 28,
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Log a visitor</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              First name *
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jordan"
              required
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Last name
            </label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan@email.com"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-0100"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Visit date
            </label>
            <input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How they heard about the church, who they came with..."
            rows={3}
            style={{ resize: "vertical" }}
          />
        </div>
        <button type="submit" disabled={saving} style={{ background: "var(--green)", color: "#fff" }}>
          {saving ? "Saving..." : "Add visitor"}
        </button>
      </form>

      <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 600 }}>Recent visitors</h2>

      {loading ? (
        <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading...</p>
      ) : visitors.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
          <p style={{ fontSize: 15 }}>No visitors logged yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visitors.map((v) => {
            const status = v.follow_up_status;
            const badge = statusStyle(status);
            return (
              <div
                key={v.id}
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                    {displayName(v)}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>
                    {[v.email, v.phone].filter(Boolean).join(" · ") || "No contact info"}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    Visited {formatVisitDate(v.visit_date)}
                    {v.notes ? ` — ${v.notes}` : ""}
                  </div>
                </div>
                <select
                  value={status}
                  disabled={updatingId === v.id}
                  onChange={(e) =>
                    handleStatusChange(v.id, e.target.value as VisitorFollowUpStatus)
                  }
                  style={{
                    width: "auto",
                    minWidth: 140,
                    fontSize: 13,
                    fontWeight: 500,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${badge.borderColor}`,
                    background: badge.background,
                    color: badge.color,
                    cursor: updatingId === v.id ? "wait" : "pointer",
                  }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
