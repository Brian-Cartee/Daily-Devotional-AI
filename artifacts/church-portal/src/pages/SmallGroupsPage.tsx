import { useEffect, useState } from "react";
import { api, type SmallGroup } from "../lib/api";
import { cardStyle, primaryBtn, secondaryBtn, EmptyState } from "../components/ui";

export default function SmallGroupsPage() {
  const [groups, setGroups] = useState<SmallGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [leader, setLeader] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [contact, setContact] = useState("");

  async function load() {
    const data = await api.smallGroups.list();
    setGroups(data.smallGroups);
  }

  useEffect(() => {
    load()
      .catch((err: Error) => alert(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { smallGroups } = await api.smallGroups.create({
        name: name.trim(),
        leader: leader.trim(),
        meetingTime: meetingTime.trim(),
        contact: contact.trim(),
      });
      setGroups(smallGroups);
      setName("");
      setLeader("");
      setMeetingTime("");
      setContact("");
      setShowForm(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not create group");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this small group?")) return;
    try {
      const { smallGroups } = await api.smallGroups.delete(id);
      setGroups(smallGroups);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 600 }}>Small groups</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>Groups members can browse and join.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>
          {showForm ? "Cancel" : "+ Add group"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Leader</label>
              <input value={leader} onChange={(e) => setLeader(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Meeting time</label>
              <input value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} placeholder="Wednesdays 7pm" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Contact</label>
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="email or phone" />
            </div>
          </div>
          <button type="submit" disabled={saving} style={primaryBtn}>
            {saving ? "Saving..." : "Create group"}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading...</p>
      ) : groups.length === 0 ? (
        <EmptyState icon="🤝" title="No small groups yet." subtitle="Add your first group to help members connect." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groups.map((g) => (
            <div key={g.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{g.name}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  {[g.leader && `Leader: ${g.leader}`, g.meetingTime, g.contact].filter(Boolean).join(" · ") || "No details yet"}
                </div>
              </div>
              <button type="button" onClick={() => handleDelete(g.id)} style={{ ...secondaryBtn, color: "#dc2626", borderColor: "#fecaca" }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
