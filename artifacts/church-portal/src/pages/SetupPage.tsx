import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Session } from "../App";

interface Props {
  session: Session | null;
}

const PURPLE = "#7c3aed";
const PURPLE_DARK = "#5b21b6";

export default function SetupPage({ session }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(session?.email && !session.isDemo ? session.email : "");
  const [churchName, setChurchName] = useState("");
  const [city, setCity] = useState("");
  const [congregationSize, setCongregationSize] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.setup.submitInterest({
        name: name.trim(),
        email: email.trim(),
        churchName: churchName.trim(),
        city: city.trim() || undefined,
        congregationSize: congregationSize || undefined,
        message: message.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f7f9",
        padding: "32px 20px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "40px 36px",
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✝</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#1b1030" }}>
            Set up your church
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>
            Shepherd&apos;s Path is onboarding churches one at a time. Tell us about yours and
            we&apos;ll reach out within a business day.
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🙏</div>
            <p style={{ fontSize: 15, color: "#1a1a1a", fontWeight: 500, marginBottom: 8 }}>
              We got it — thank you
            </p>
            <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 24 }}>
              We&apos;ll email you at <strong>{email}</strong> soon to get{" "}
              <strong>{churchName}</strong> set up.
            </p>
            {session?.isDemo ? (
              <Link
                to="/dashboard"
                style={{
                  display: "inline-block",
                  background: PURPLE,
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Keep exploring the demo
              </Link>
            ) : (
              <Link to="/" style={{ fontSize: 14, color: PURPLE, textDecoration: "none" }}>
                ← Back to home
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pastor James"
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pastor@yourchurch.com"
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Church name</label>
              <input
                type="text"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                placeholder="Grace Community Church"
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>City / area</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Austin, TX"
                />
              </div>
              <div>
                <label style={labelStyle}>Congregation size</label>
                <select
                  value={congregationSize}
                  onChange={(e) => setCongregationSize(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
                >
                  <option value="">Select…</option>
                  <option value="Under 50">Under 50</option>
                  <option value="50–150">50–150</option>
                  <option value="150–300">150–300</option>
                  <option value="300–500">300–500</option>
                  <option value="500+">500+</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Anything else? (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What drew you to Shepherd's Path?"
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {error && (
              <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: PURPLE,
                color: "#fff",
                padding: "12px",
                fontSize: 15,
                border: "none",
                borderRadius: 8,
                cursor: loading ? "wait" : "pointer",
                fontWeight: 500,
              }}
            >
              {loading ? "Sending…" : "Request setup"}
            </button>

            <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "#6b7280" }}>
              {session?.isDemo && (
                <>
                  <Link to="/dashboard" style={{ color: PURPLE_DARK, textDecoration: "none" }}>
                    Keep exploring demo
                  </Link>
                  <span style={{ margin: "0 8px" }}>·</span>
                </>
              )}
              <Link to="/login" style={{ color: PURPLE_DARK, textDecoration: "none" }}>
                Already have access? Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 6,
  color: "#374151",
};
