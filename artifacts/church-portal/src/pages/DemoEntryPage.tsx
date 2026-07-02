import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Session } from "../App";

interface Props {
  session: Session | null;
  onLogin: (session: Session) => void;
}

export default function DemoEntryPage({ session, onLogin }: Props) {
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (session) {
      navigate("/dashboard", { replace: true });
      return;
    }

    api.auth
      .enterDemo()
      .then(() => api.auth.me())
      .then((data) => {
        if (!data.session) throw new Error("No session");
        onLogin(data.session);
        navigate("/dashboard", { replace: true });
      })
      .catch(() => setError(true));
  }, [session, navigate, onLogin]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9f9f7",
        padding: 24,
      }}
    >
      {error ? (
        <p style={{ fontSize: 15, color: "#6b7280", textAlign: "center" }}>
          Demo unavailable — try again in a moment.
        </p>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid #e5e7eb",
              borderTopColor: "#2d6a4f",
              borderRadius: "50%",
              animation: "demo-spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ margin: 0, fontSize: 15, color: "#6b7280" }}>Loading demo...</p>
        </div>
      )}
      <style>{`
        @keyframes demo-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
