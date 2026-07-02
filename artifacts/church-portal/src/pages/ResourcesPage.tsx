import { useEffect, useState } from "react";
import { api, type ResourceLink } from "../lib/api";
import { PageHeader, cardStyle, primaryBtn, secondaryBtn, EmptyState } from "../components/ui";

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `link-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function newLink(): ResourceLink {
  return { id: newId(), label: "", url: "", sortOrder: 0 };
}

export default function ResourcesPage() {
  const [links, setLinks] = useState<ResourceLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.resources.get()
      .then((data) => setLinks(data.resourceLinks.length ? data.resourceLinks : []))
      .catch((err: Error) => alert(err.message))
      .finally(() => setLoading(false));
  }, []);

  function updateLink(id: string, patch: Partial<ResourceLink>) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLink() {
    setLinks((prev) => [...prev, { ...newLink(), sortOrder: prev.length }]);
  }

  function removeLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const valid = links.filter((l) => l.label.trim() && l.url.trim());
    setSaving(true);
    try {
      const { resourceLinks } = await api.resources.update(
        valid.map((l, i) => ({ ...l, sortOrder: i })),
      );
      setLinks(resourceLinks);
      alert("Resources saved.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: "#9ca3af" }}>Loading...</p>;

  return (
    <div>
      <PageHeader title="Resource links" subtitle="Helpful links your members see on your church page." />

      <form onSubmit={handleSave}>
        {links.length === 0 ? (
          <EmptyState icon="🔗" title="No resource links yet." subtitle="Add links to your website, giving page, or forms." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {links.map((link) => (
              <div key={link.id} style={{ ...cardStyle, display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Label</label>
                  <input value={link.label} onChange={(e) => updateLink(link.id, { label: e.target.value })} placeholder="Give online" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>URL</label>
                  <input value={link.url} onChange={(e) => updateLink(link.id, { url: e.target.value })} placeholder="https://..." />
                </div>
                <button type="button" onClick={() => removeLink(link.id)} style={{ ...secondaryBtn, color: "#dc2626", borderColor: "#fecaca" }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={addLink} style={secondaryBtn}>+ Add link</button>
          <button type="submit" disabled={saving} style={primaryBtn}>
            {saving ? "Saving..." : "Save resources"}
          </button>
        </div>
      </form>
    </div>
  );
}
