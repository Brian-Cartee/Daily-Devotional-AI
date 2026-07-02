import { useEffect, useState } from "react";
import { api, type Member } from "../lib/api";
import { PageHeader, cardStyle, primaryBtn, secondaryBtn, EmptyState } from "../components/ui";

const ROLES = ["member", "leader", "admin", "owner"];

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [invite, setInvite] = useState<{ inviteCode: string; joinUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    const [membersData, inviteData] = await Promise.all([
      api.members.list(),
      api.invite.get().catch(() => null),
    ]);
    setMembers(membersData.members);
    if (inviteData) setInvite({ inviteCode: inviteData.inviteCode, joinUrl: inviteData.joinUrl });
  }

  useEffect(() => {
    load()
      .catch((err: Error) => alert(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId.trim()) return;
    setSaving(true);
    try {
      const { member } = await api.members.create({
        sessionId: sessionId.trim(),
        email: email.trim() || undefined,
        role,
      });
      setMembers((prev) => [member, ...prev.filter((m) => m.id !== member.id)]);
      setSessionId("");
      setEmail("");
      setRole("member");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not add member");
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(id: number, newRole: string) {
    try {
      const { member } = await api.members.update(id, { role: newRole });
      setMembers((prev) => prev.map((m) => (m.id === id ? member : m)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not update role");
    }
  }

  function copyJoinUrl() {
    if (!invite?.joinUrl) return;
    navigator.clipboard.writeText(invite.joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      <PageHeader title="Members" subtitle="Manage roles and share your church join link." />

      {invite && (
        <div style={{ ...cardStyle, marginBottom: 24, background: "rgba(45,106,79,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#2d6a4f", marginBottom: 8 }}>Invite link</div>
          <div style={{ fontSize: 14, marginBottom: 8, wordBreak: "break-all" }}>{invite.joinUrl}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Code: {invite.inviteCode}</div>
          <button type="button" onClick={copyJoinUrl} style={secondaryBtn}>
            {copied ? "Copied!" : "Copy join link"}
          </button>
        </div>
      )}

      <form onSubmit={handleAdd} style={{ ...cardStyle, marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Add member</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Session ID *</label>
            <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="user session id" required />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pastor@church.org" />
          </div>
        </div>
        <div style={{ marginBottom: 16, maxWidth: 200 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={saving} style={primaryBtn}>
          {saving ? "Adding..." : "Add member"}
        </button>
      </form>

      <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 600 }}>All members</h2>
      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading...</p>
      ) : members.length === 0 ? (
        <EmptyState icon="👥" title="No members yet." subtitle="Add a member or share your invite link." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {members.map((m) => (
            <div key={m.id} style={{ ...cardStyle, display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{m.email || m.sessionId}</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  Joined {new Date(m.joinedAt).toLocaleDateString()} · {m.status}
                </div>
              </div>
              <select
                value={m.role}
                onChange={(e) => handleRoleChange(m.id, e.target.value)}
                style={{ width: "auto", minWidth: 120, padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb" }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
