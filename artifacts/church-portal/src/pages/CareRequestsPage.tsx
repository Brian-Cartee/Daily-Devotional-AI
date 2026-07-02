import { useEffect, useState } from "react";
import { api, type CareRequest } from "../lib/api";

const REQUEST_TYPES = [
  { value: "hospital", label: "Hospital visit", icon: "🏥" },
  { value: "meal", label: "Meal train", icon: "🍽️" },
  { value: "counseling", label: "Counseling referral", icon: "💬" },
  { value: "grief", label: "Grief support", icon: "🤍" },
  { value: "financial", label: "Financial assistance", icon: "💰" },
  { value: "other", label: "Other", icon: "📋" },
] as const;

function typeMeta(requestType: string) {
  return REQUEST_TYPES.find((t) => t.value === requestType) ?? REQUEST_TYPES[REQUEST_TYPES.length - 1];
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function isPastDue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return dueDate < new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sortOpen(requests: CareRequest[]): CareRequest[] {
  return requests
    .filter((r) => r.status === "open" || r.status === "in_progress")
    .sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
}

function completedThisWeek(requests: CareRequest[]): CareRequest[] {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return requests
    .filter(
      (r) =>
        r.status === "completed" &&
        r.completed_at &&
        new Date(r.completed_at).getTime() >= weekAgo,
    )
    .sort(
      (a, b) =>
        new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime(),
    );
}

export default function CareRequestsPage() {
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const [personName, setPersonName] = useState("");
  const [requestType, setRequestType] = useState("hospital");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function loadRequests() {
    const data = await api.careRequests.list();
    setRequests(data.careRequests);
  }

  useEffect(() => {
    loadRequests()
      .catch((err: Error) => alert(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!personName.trim() || !description.trim()) return;
    setSaving(true);
    try {
      const { careRequest } = await api.careRequests.create({
        personName: personName.trim(),
        requestType,
        description: description.trim(),
        assignedTo: assignedTo.trim() || undefined,
        dueDate: dueDate || undefined,
      });
      setRequests((prev) => [careRequest, ...prev]);
      setPersonName("");
      setRequestType("hospital");
      setDescription("");
      setAssignedTo("");
      setDueDate("");
      setFormOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not create request");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkComplete(id: number) {
    setCompletingId(id);
    try {
      const { careRequest } = await api.careRequests.updateStatus(id, "completed");
      setRequests((prev) => prev.map((r) => (r.id === id ? careRequest : r)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not update request");
    } finally {
      setCompletingId(null);
    }
  }

  const openRequests = sortOpen(requests);
  const completedRequests = completedThisWeek(requests);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 600 }}>Care Requests</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
            Track pastoral care needs for your congregation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((o) => !o)}
          style={{ background: "#2d6a4f", color: "#fff", fontSize: 14, padding: "10px 18px" }}
        >
          {formOpen ? "Cancel" : "+ New request"}
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleCreate}
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 24,
            marginBottom: 28,
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>New care request</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Person name *
              </label>
              <input
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Jordan Smith"
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Request type
              </label>
              <select value={requestType} onChange={(e) => setRequestType(e.target.value)}>
                {REQUEST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Assigned to
              </label>
              <input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Staff member name"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Due date
              </label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What care is needed?"
              rows={3}
              required
              style={{ resize: "vertical", width: "100%" }}
            />
          </div>
          <button type="submit" disabled={saving} style={{ background: "#2d6a4f", color: "#fff" }}>
            {saving ? "Creating..." : "Create request"}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading...</p>
      ) : (
        <>
          <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 600 }}>OPEN</h2>
          {openRequests.length === 0 ? (
            <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 14, padding: "32px 0", marginBottom: 32 }}>
              No open care requests. The congregation is in good hands.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {openRequests.map((r) => {
                const meta = typeMeta(r.request_type);
                const pastDue = isPastDue(r.due_date);
                return (
                  <div
                    key={r.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: "16px 20px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#1b4332", marginBottom: 4 }}>
                          {meta.icon} {r.person_name}
                          <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 8, fontSize: 13 }}>
                            {meta.label}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 8px", fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
                          {truncate(r.description, 100)}
                        </p>
                        {r.assigned_to && (
                          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
                            Assigned to {r.assigned_to}
                          </div>
                        )}
                        {r.due_date && (
                          <div style={{ fontSize: 12, color: pastDue ? "#dc2626" : "#6b7280" }}>
                            Due {formatDate(r.due_date)}
                            {pastDue ? " (past due)" : ""}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMarkComplete(r.id)}
                        disabled={completingId === r.id}
                        style={{
                          background: "#2d6a4f",
                          color: "#fff",
                          fontSize: 13,
                          padding: "7px 14px",
                          flexShrink: 0,
                        }}
                      >
                        {completingId === r.id ? "Saving..." : "Mark complete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 600 }}>COMPLETED THIS WEEK</h2>
          {completedRequests.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 14 }}>No requests completed in the last 7 days.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {completedRequests.map((r) => {
                const meta = typeMeta(r.request_type);
                return (
                  <div
                    key={r.id}
                    style={{
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: "14px 20px",
                      opacity: 0.85,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", marginBottom: 4 }}>
                      ✓ {meta.icon} {r.person_name}
                      <span style={{ fontWeight: 400, marginLeft: 8, fontSize: 13 }}>
                        {meta.label}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#9ca3af", lineHeight: 1.5 }}>
                      {truncate(r.description, 100)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
