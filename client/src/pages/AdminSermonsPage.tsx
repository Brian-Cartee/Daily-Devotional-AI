import { useState } from "react";
import { CheckCircle, XCircle, Loader2, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

const CURATED_SERMONS = [
  {
    youtubeId: "HBKJkRpFJgE",
    title: "Walking with God Through Pain and Suffering",
    preacher: "Tim Keller",
  },
  {
    youtubeId: "PZ5q00eKLq4",
    title: "The Prodigal God",
    preacher: "Tim Keller",
  },
  {
    youtubeId: "eCNE0_V3wbI",
    title: "Identity in Christ",
    preacher: "Tim Keller",
  },
  {
    youtubeId: "PV2yEHi5KLQ",
    title: "Waiting on God — When He Seems Silent",
    preacher: "Louie Giglio",
  },
  {
    youtubeId: "UJGX5nFfbhU",
    title: "Anxiety and the Peace That Passes Understanding",
    preacher: "Louie Giglio",
  },
  {
    youtubeId: "FZiOmaTFnzU",
    title: "Facing Suffering with Faith",
    preacher: "David Platt",
  },
  {
    youtubeId: "6_GJRN0Z8MY",
    title: "Forgiveness: Releasing What We Cannot Hold",
    preacher: "David Platt",
  },
  {
    youtubeId: "oBxuVTgXI0M",
    title: "Crazy Love — Stop Settling for Comfortable",
    preacher: "Francis Chan",
  },
  {
    youtubeId: "CgqEUoA_V5g",
    title: "Doubt and the Darkness Before Dawn",
    preacher: "Matt Chandler",
  },
  {
    youtubeId: "w5FbxJ_E9kU",
    title: "Marriage: Two Broken People Becoming One",
    preacher: "Matt Chandler",
  },
];

type IngestStatus = "idle" | "loading" | "success" | "error";

interface SermonStatus {
  status: IngestStatus;
  segmentsCreated?: number;
  error?: string;
}

export default function AdminSermonsPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [statuses, setStatuses] = useState<Record<string, SermonStatus>>({});
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({});

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/admin/sermons?adminPassword=" + encodeURIComponent(password));
      if (res.status === 401) {
        setAuthError("Incorrect password.");
        return;
      }
      setAuthenticated(true);
    } catch {
      setAuthError("Server error. Try again.");
    }
  };

  const ingest = async (sermon: typeof CURATED_SERMONS[0]) => {
    setStatuses(prev => ({ ...prev, [sermon.youtubeId]: { status: "loading" } }));
    try {
      const res = await fetch("/api/admin/sermons/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(sermon),
      });
      const data = await res.json();
      if (data.success) {
        setStatuses(prev => ({ ...prev, [sermon.youtubeId]: { status: "success", segmentsCreated: data.segmentsCreated } }));
      } else {
        setStatuses(prev => ({ ...prev, [sermon.youtubeId]: { status: "error", error: data.error || "Failed" } }));
      }
    } catch (err) {
      setStatuses(prev => ({ ...prev, [sermon.youtubeId]: { status: "error", error: String(err) } }));
    }
  };

  const ingestAll = async () => {
    for (const sermon of CURATED_SERMONS) {
      const current = statuses[sermon.youtubeId];
      if (current?.status === "success") continue;
      await ingest(sermon);
      await new Promise(r => setTimeout(r, 1500));
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0a1a" }}>
        <div className="w-full max-w-sm p-8 rounded-2xl" style={{ background: "#1a0f35", border: "1px solid rgba(122,1,141,0.3)" }}>
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-6 h-6" style={{ color: "#7a018d" }} />
            <h1 className="text-white text-xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>Sermon Library Admin</h1>
          </div>
          <form onSubmit={handleAuth}>
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              data-testid="input-admin-password"
              className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none mb-3"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
            {authError && <p className="text-red-400 text-xs mb-3">{authError}</p>}
            <button
              type="submit"
              data-testid="btn-admin-login"
              className="w-full py-3 rounded-xl text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #7a018d, #442f74)" }}
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "#0d0a1a" }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6" style={{ color: "#7a018d" }} />
            <h1 className="text-white text-xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>Sermon Segment Library</h1>
          </div>
          <button
            onClick={ingestAll}
            data-testid="btn-ingest-all"
            className="text-sm font-bold px-4 py-2 rounded-xl"
            style={{ background: "linear-gradient(135deg, #7a018d, #442f74)", color: "white" }}
          >
            Ingest All
          </button>
        </div>

        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
          Each sermon will be fetched, transcribed into timestamped segments, and tagged by emotional theme.
          Segments are matched to users' guidance conversations for precision delivery.
        </p>

        <div className="space-y-3">
          {CURATED_SERMONS.map(sermon => {
            const status = statuses[sermon.youtubeId];
            return (
              <div
                key={sermon.youtubeId}
                className="rounded-xl p-4 flex items-start justify-between gap-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold leading-snug" style={{ fontFamily: "'Georgia', serif" }}>
                    {sermon.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(180,120,255,0.7)" }}>{sermon.preacher}</p>
                  <p className="text-[10px] mt-1 font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {sermon.youtubeId}
                  </p>
                  {status?.status === "success" && (
                    <p className="text-xs mt-1" style={{ color: "rgba(120,220,120,0.8)" }}>
                      {status.segmentsCreated === 0 ? "Already in library" : `${status.segmentsCreated} segments stored`}
                    </p>
                  )}
                  {status?.status === "error" && (
                    <p className="text-xs mt-1" style={{ color: "rgba(220,100,100,0.8)" }}>{status.error}</p>
                  )}
                </div>
                <button
                  onClick={() => ingest(sermon)}
                  disabled={status?.status === "loading" || status?.status === "success"}
                  data-testid={`btn-ingest-${sermon.youtubeId}`}
                  className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-opacity"
                  style={{
                    background: status?.status === "success"
                      ? "rgba(120,220,120,0.15)"
                      : status?.status === "error"
                        ? "rgba(220,100,100,0.15)"
                        : "rgba(122,1,141,0.3)",
                    color: status?.status === "success"
                      ? "rgba(120,220,120,0.9)"
                      : status?.status === "error"
                        ? "rgba(220,100,100,0.9)"
                        : "rgba(255,255,255,0.85)",
                    opacity: status?.status === "loading" ? 0.7 : 1,
                  }}
                >
                  {status?.status === "loading" && <Loader2 className="w-3 h-3 animate-spin" />}
                  {status?.status === "success" && <CheckCircle className="w-3 h-3" />}
                  {status?.status === "error" && <XCircle className="w-3 h-3" />}
                  {!status && "Ingest"}
                  {status?.status === "loading" && "Processing..."}
                  {status?.status === "success" && "Done"}
                  {status?.status === "error" && "Retry"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
