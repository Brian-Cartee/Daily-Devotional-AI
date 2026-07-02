import { useEffect, useState } from "react";
import { api, type PrayerWallSettings } from "../lib/api";
import { PageHeader, cardStyle, primaryBtn } from "../components/ui";

const DEFAULT_CATEGORIES = ["general", "health", "family", "guidance"];

export default function PrayerSettingsPage() {
  const [settings, setSettings] = useState<PrayerWallSettings>({
    allowAnonymous: true,
    moderationEnabled: false,
    categories: DEFAULT_CATEGORIES,
  });
  const [categoriesText, setCategoriesText] = useState(DEFAULT_CATEGORIES.join(", "));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.prayerSettings.get()
      .then(({ prayerWall }) => {
        setSettings(prayerWall);
        setCategoriesText(prayerWall.categories.join(", "));
      })
      .catch((err: Error) => alert(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const categories = categoriesText
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const payload = { ...settings, categories };
    setSaving(true);
    try {
      const { prayerWall } = await api.prayerSettings.update(payload);
      setSettings(prayerWall);
      setCategoriesText(prayerWall.categories.join(", "));
      alert("Prayer wall settings saved.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: "#9ca3af" }}>Loading...</p>;

  return (
    <div>
      <PageHeader title="Prayer wall settings" subtitle="Control how members submit prayer requests." />

      <form onSubmit={handleSave} style={{ ...cardStyle, maxWidth: 560 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={settings.allowAnonymous}
            onChange={(e) => setSettings((s) => ({ ...s, allowAnonymous: e.target.checked }))}
            style={{ width: "auto" }}
          />
          Allow anonymous prayer requests
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={settings.moderationEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, moderationEnabled: e.target.checked }))}
            style={{ width: "auto" }}
          />
          Require moderation before requests appear publicly
        </label>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Categories (comma-separated)
          </label>
          <input
            value={categoriesText}
            onChange={(e) => setCategoriesText(e.target.value)}
            placeholder="general, health, family"
          />
        </div>

        <button type="submit" disabled={saving} style={primaryBtn}>
          {saving ? "Saving..." : "Save settings"}
        </button>
      </form>
    </div>
  );
}
