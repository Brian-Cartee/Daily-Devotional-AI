import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PageHeader, cardStyle, primaryBtn } from "../components/ui";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2d6a4f");
  const [website, setWebsite] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [serviceTimes, setServiceTimes] = useState("");

  useEffect(() => {
    api.church.get()
      .then(({ church }) => {
        setName(church.name);
        setLogoUrl(church.logoUrl ?? "");
        setPrimaryColor(church.primaryColor ?? "#2d6a4f");
        setWebsite(church.settings.website ?? "");
        setWelcomeMessage(church.settings.welcomeMessage ?? "");
        setServiceTimes(church.settings.serviceTimes ?? "");
      })
      .catch((err: Error) => alert(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.church.update({
        name: name.trim(),
        logoUrl: logoUrl.trim() || null,
        primaryColor: primaryColor.trim() || null,
        settings: {
          website: website.trim(),
          welcomeMessage: welcomeMessage.trim(),
          serviceTimes: serviceTimes.trim(),
        },
      });
      alert("Settings saved.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: "#9ca3af" }}>Loading...</p>;

  return (
    <div>
      <PageHeader title="Church profile" subtitle="Name, branding, and welcome info members see in the app." />

      <form onSubmit={handleSave} style={{ ...cardStyle, maxWidth: 640 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Church name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Logo URL</label>
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Primary color</label>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ width: 48, padding: 4 }} />
            <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ flex: 1 }} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Website</label>
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourchurch.org" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Service times</label>
          <textarea value={serviceTimes} onChange={(e) => setServiceTimes(e.target.value)} rows={3} placeholder="Sundays 10am & 6pm" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Welcome message</label>
          <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={4} placeholder="We're glad you're here..." />
        </div>
        <button type="submit" disabled={saving} style={primaryBtn}>
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
