import { useState } from "react";
import { CheckCircle, XCircle, Loader2, BookOpen, Search, Plus, Library } from "lucide-react";

const CURATED_SERMONS = [
  { youtubeId: "HBKJkRpFJgE", title: "Walking with God Through Pain and Suffering", preacher: "Tim Keller" },
  { youtubeId: "PZ5q00eKLq4", title: "The Prodigal God", preacher: "Tim Keller" },
  { youtubeId: "eCNE0_V3wbI", title: "Identity in Christ", preacher: "Tim Keller" },
  { youtubeId: "PV2yEHi5KLQ", title: "Waiting on God — When He Seems Silent", preacher: "Louie Giglio" },
  { youtubeId: "UJGX5nFfbhU", title: "Anxiety and the Peace That Passes Understanding", preacher: "Louie Giglio" },
  { youtubeId: "FZiOmaTFnzU", title: "Facing Suffering with Faith", preacher: "David Platt" },
  { youtubeId: "6_GJRN0Z8MY", title: "Forgiveness: Releasing What We Cannot Hold", preacher: "David Platt" },
  { youtubeId: "oBxuVTgXI0M", title: "Crazy Love — Stop Settling for Comfortable", preacher: "Francis Chan" },
  { youtubeId: "CgqEUoA_V5g", title: "Doubt and the Darkness Before Dawn", preacher: "Matt Chandler" },
  { youtubeId: "w5FbxJ_E9kU", title: "Marriage: Two Broken People Becoming One", preacher: "Matt Chandler" },
];

type IngestStatus = "idle" | "loading" | "success" | "error";

interface SermonStatus {
  status: IngestStatus;
  segmentsCreated?: number;
  error?: string;
}

interface SearchResult {
  youtubeId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  views: string;
}

interface QueuedSermon {
  youtubeId: string;
  title: string;
  preacher: string;
  thumbnail?: string;
}

export default function AdminSermonsPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"curated" | "search">("search");

  // Curated state
  const [statuses, setStatuses] = useState<Record<string, SermonStatus>>({});

  // Search state
  const [searchPreacher, setSearchPreacher] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState("");
  const [queue, setQueue] = useState<QueuedSermon[]>([]);
  const [queueStatuses, setQueueStatuses] = useState<Record<string, SermonStatus>>({});
  const [preacherName, setPreacherName] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/admin/sermons?adminPassword=" + encodeURIComponent(password));
      if (res.status === 401) { setAuthError("Incorrect password."); return; }
      setAuthenticated(true);
    } catch { setAuthError("Server error. Try again."); }
  };

  const ingest = async (sermon: { youtubeId: string; title: string; preacher: string }, isQueue = false) => {
    const setter = isQueue ? setQueueStatuses : setStatuses;
    setter(prev => ({ ...prev, [sermon.youtubeId]: { status: "loading" } }));
    try {
      const res = await fetch("/api/admin/sermons/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify(sermon),
      });
      const data = await res.json();
      if (data.success) {
        setter(prev => ({ ...prev, [sermon.youtubeId]: { status: "success", segmentsCreated: data.segmentsCreated } }));
      } else {
        setter(prev => ({ ...prev, [sermon.youtubeId]: { status: "error", error: data.error || "Failed" } }));
      }
    } catch (err) {
      setter(prev => ({ ...prev, [sermon.youtubeId]: { status: "error", error: String(err) } }));
    }
  };

  const ingestAll = async () => {
    for (const sermon of CURATED_SERMONS) {
      if (statuses[sermon.youtubeId]?.status === "success") continue;
      await ingest(sermon, false);
      await new Promise(r => setTimeout(r, 1500));
    }
  };

  const ingestQueue = async () => {
    for (const sermon of queue) {
      if (queueStatuses[sermon.youtubeId]?.status === "success") continue;
      await ingest(sermon, true);
      await new Promise(r => setTimeout(r, 1500));
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPreacher.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    setSearchResults([]);
    try {
      const res = await fetch(
        `/api/admin/sermons/search?preacher=${encodeURIComponent(searchPreacher)}&adminPassword=${encodeURIComponent(password)}`
      );
      const data = await res.json();
      if (data.error) { setSearchError(data.error); return; }
      setSearchResults(data.results || []);
      if (data.results?.length === 0) setSearchError("No results found. Try a different name.");
    } catch (err) {
      setSearchError(String(err));
    } finally {
      setSearchLoading(false);
    }
  };

  const addToQueue = (result: SearchResult) => {
    if (queue.find(q => q.youtubeId === result.youtubeId)) return;
    setQueue(prev => [...prev, {
      youtubeId: result.youtubeId,
      title: result.title,
      preacher: preacherName || searchPreacher,
      thumbnail: result.thumbnail,
    }]);
  };

  const removeFromQueue = (youtubeId: string) => {
    setQueue(prev => prev.filter(q => q.youtubeId !== youtubeId));
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

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="w-6 h-6" style={{ color: "#7a018d" }} />
          <h1 className="text-white text-xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>Sermon Segment Library</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "search", label: "Search YouTube", icon: Search },
            { id: "curated", label: "Curated List", icon: Library },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              data-testid={`tab-${tab.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: activeTab === tab.id ? "linear-gradient(135deg, #7a018d, #442f74)" : "rgba(255,255,255,0.06)",
                color: activeTab === tab.id ? "white" : "rgba(255,255,255,0.5)",
              }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── SEARCH TAB ─────────────────────────────────────────── */}
        {activeTab === "search" && (
          <div>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
              Search by preacher name. Pick the sermons you want segmented, add them to the queue, then ingest all at once.
            </p>

            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="e.g. Michael Todd, Phillip Anthony Mitchell..."
                value={searchPreacher}
                onChange={e => setSearchPreacher(e.target.value)}
                data-testid="input-search-preacher"
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
              <button
                type="submit"
                disabled={searchLoading}
                data-testid="btn-search-sermons"
                className="px-4 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, #7a018d, #442f74)", opacity: searchLoading ? 0.7 : 1 }}
              >
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </form>

            {/* Optional preacher name override */}
            {searchResults.length > 0 && (
              <div className="mb-4">
                <p className="text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Preacher name to tag segments with (edit if YouTube channel name differs):
                </p>
                <input
                  type="text"
                  placeholder={searchPreacher}
                  value={preacherName}
                  onChange={e => setPreacherName(e.target.value)}
                  data-testid="input-preacher-name"
                  className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
            )}

            {searchError && <p className="text-red-400 text-xs mb-3">{searchError}</p>}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 mb-6">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {searchResults.length} results — tap + to queue
                </p>
                {searchResults.map(result => {
                  const inQueue = queue.some(q => q.youtubeId === result.youtubeId);
                  return (
                    <div
                      key={result.youtubeId}
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      {result.thumbnail && (
                        <img src={result.thumbnail} alt="" className="w-20 h-12 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-xs font-semibold leading-snug line-clamp-2" style={{ fontFamily: "'Georgia', serif" }}>
                          {result.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px]" style={{ color: "rgba(180,120,255,0.65)" }}>{result.duration}</p>
                          {result.views && <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{result.views} views</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => addToQueue(result)}
                        disabled={inQueue}
                        data-testid={`btn-queue-${result.youtubeId}`}
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: inQueue ? "rgba(120,220,120,0.2)" : "rgba(122,1,141,0.4)",
                          color: inQueue ? "rgba(120,220,120,0.9)" : "white",
                        }}
                      >
                        {inQueue ? <CheckCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Queue */}
            {queue.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Queue ({queue.length})
                  </p>
                  <button
                    onClick={ingestQueue}
                    data-testid="btn-ingest-queue"
                    className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                    style={{ background: "linear-gradient(135deg, #7a018d, #442f74)" }}
                  >
                    Ingest All
                  </button>
                </div>
                <div className="space-y-2">
                  {queue.map(sermon => {
                    const s = queueStatuses[sermon.youtubeId];
                    return (
                      <div
                        key={sermon.youtubeId}
                        className="flex items-center gap-3 rounded-xl p-3"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        {sermon.thumbnail && (
                          <img src={sermon.thumbnail} alt="" className="w-16 h-10 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-xs font-semibold leading-snug line-clamp-1" style={{ fontFamily: "'Georgia', serif" }}>
                            {sermon.title}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: "rgba(180,120,255,0.65)" }}>{sermon.preacher}</p>
                          {s?.status === "success" && (
                            <p className="text-[10px] mt-0.5" style={{ color: "rgba(120,220,120,0.8)" }}>
                              {s.segmentsCreated === 0 ? "Already in library" : `${s.segmentsCreated} segments stored`}
                            </p>
                          )}
                          {s?.status === "error" && (
                            <p className="text-[10px] mt-0.5" style={{ color: "rgba(220,100,100,0.8)" }}>{s.error}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!s && (
                            <button
                              onClick={() => ingest(sermon, true)}
                              data-testid={`btn-ingest-single-${sermon.youtubeId}`}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                              style={{ background: "rgba(122,1,141,0.3)", color: "rgba(255,255,255,0.8)" }}
                            >
                              Ingest
                            </button>
                          )}
                          {s?.status === "loading" && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(180,120,255,0.8)" }} />}
                          {s?.status === "success" && <CheckCircle className="w-4 h-4" style={{ color: "rgba(120,220,120,0.8)" }} />}
                          {s?.status === "error" && (
                            <button onClick={() => ingest(sermon, true)}>
                              <XCircle className="w-4 h-4" style={{ color: "rgba(220,100,100,0.8)" }} />
                            </button>
                          )}
                          {(!s || s.status === "idle") && (
                            <button
                              onClick={() => removeFromQueue(sermon.youtubeId)}
                              className="text-[10px] px-2 py-1 rounded"
                              style={{ color: "rgba(255,255,255,0.25)" }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CURATED TAB ────────────────────────────────────────── */}
        {activeTab === "curated" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>Pre-selected sermon library starter pack.</p>
              <button
                onClick={ingestAll}
                data-testid="btn-ingest-all"
                className="text-sm font-bold px-4 py-2 rounded-xl"
                style={{ background: "linear-gradient(135deg, #7a018d, #442f74)", color: "white" }}
              >
                Ingest All
              </button>
            </div>
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
                      <p className="text-[10px] mt-1 font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{sermon.youtubeId}</p>
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
                      onClick={() => ingest(sermon, false)}
                      disabled={status?.status === "loading" || status?.status === "success"}
                      data-testid={`btn-ingest-${sermon.youtubeId}`}
                      className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                      style={{
                        background: status?.status === "success" ? "rgba(120,220,120,0.15)"
                          : status?.status === "error" ? "rgba(220,100,100,0.15)"
                            : "rgba(122,1,141,0.3)",
                        color: status?.status === "success" ? "rgba(120,220,120,0.9)"
                          : status?.status === "error" ? "rgba(220,100,100,0.9)"
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
        )}
      </div>
    </div>
  );
}
