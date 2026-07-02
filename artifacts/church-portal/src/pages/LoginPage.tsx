import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

interface Props {
  onLogin: (session: any) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [sent, setSent] = useState(false);
  const [devMagicUrl, setDevMagicUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const expired = searchParams.get("error") === "expired";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.auth.requestLink(email.trim(), slug.trim().toLowerCase());
      if (data.devMagicUrl) setDevMagicUrl(data.devMagicUrl);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f9f9f7",
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: "40px 36px",
        width: "100%", maxWidth: 400, boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✝</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#1b4332" }}>
            Shepherd's Path
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6b7280" }}>
            Church Admin Portal
          </p>
        </div>

        {expired && (
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#92400e" }}>
            That link has expired. Request a new one below.
          </div>
        )}

        {sent ? (
          <div style={{ textAlign: "center" }}>
            {devMagicUrl ? (
              <>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
                <p style={{ fontSize: 15, color: "#1a1a1a", fontWeight: 500, marginBottom: 8 }}>
                  Local dev sign-in link
                </p>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                  Email is not configured locally, so use this one-time link instead (expires in 15 minutes).
                </p>
                <a
                  href={devMagicUrl}
                  style={{
                    display: "inline-block",
                    background: "#2d6a4f",
                    color: "#fff",
                    padding: "12px 16px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  Sign in to admin dashboard
                </a>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
                <p style={{ fontSize: 15, color: "#1a1a1a", fontWeight: 500, marginBottom: 8 }}>
                  Check your email
                </p>
                <p style={{ fontSize: 14, color: "#6b7280" }}>
                  We sent a sign-in link to <strong>{email}</strong>. It expires in 15 minutes.
                </p>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "#374151" }}>
                Your email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pastor@yourchurch.com"
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "#374151" }}>
                Church URL slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="grace-community"
                required
              />
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>
                Your church's unique identifier — provided when you signed up
              </p>
            </div>

            {error && (
              <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", background: "#2d6a4f", color: "#fff", padding: "12px", fontSize: 15 }}
            >
              {loading ? "Sending..." : "Send sign-in link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
