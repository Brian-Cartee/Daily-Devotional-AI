import { useEffect, useState } from "react";
import { api, type SermonFollowup } from "../lib/api";
import { PageHeader, cardStyle, primaryBtn } from "../components/ui";

function mondayOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

export default function SermonFollowupPage() {
  const [form, setForm] = useState<SermonFollowup>({
    title: "",
    verse: "",
    body: "",
    weekStart: mondayOfWeek(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.sermonFollowup.get()
      .then(({ sermonFollowup }) => {
        setForm({
          title: sermonFollowup.title ?? "",
          verse: sermonFollowup.verse ?? "",
          body: sermonFollowup.body ?? "",
          weekStart: sermonFollowup.weekStart || mondayOfWeek(),
        });
      })
      .catch((err: Error) => alert(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { sermonFollowup } = await api.sermonFollowup.update(form);
      setForm(sermonFollowup);
      alert("Sermon follow-up saved.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: "#9ca3af" }}>Loading...</p>;

  return (
    <div>
      <PageHeader title="Sermon follow-up" subtitle="Weekly reflection members see after Sunday." />

      <form onSubmit={handleSave} style={{ ...cardStyle, maxWidth: 640 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Week starting</label>
          <input type="date" value={form.weekStart} onChange={(e) => setForm((f) => ({ ...f, weekStart: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Title</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Walking in faith" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Key verse</label>
          <input value={form.verse} onChange={(e) => setForm((f) => ({ ...f, verse: e.target.value }))} placeholder="Hebrews 11:1" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Reflection</label>
          <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={8} placeholder="This week's sermon invited us to..." />
        </div>
        <button type="submit" disabled={saving} style={primaryBtn}>
          {saving ? "Saving..." : "Save follow-up"}
        </button>
      </form>
    </div>
  );
}
