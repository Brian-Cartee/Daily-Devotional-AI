/**
 * Browser API URL helpers.
 *
 * Dev (default): leave VITE_API_BASE_URL unset — use relative `/api/*` paths;
 * Vite proxies them to api-server via VITE_API_PROXY_TARGET.
 *
 * Direct mode: set VITE_API_BASE_URL (e.g. http://localhost:8080) to call
 * api-server without the dev proxy.
 */
export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (typeof base === "string" && base.trim()) {
    return base.trim().replace(/\/$/, "");
  }
  return "";
}

/** Resolve an `/api/...` path against VITE_API_BASE_URL when set. */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}

/** When VITE_API_BASE_URL is set, rewrite relative `/api/*` fetch calls. */
export function installApiFetch(): void {
  const base = getApiBaseUrl();
  if (!base) return;

  const nativeFetch = window.fetch.bind(window);

  const rewriteUrl = (url: string): string | null => {
    if (url.startsWith("/api/")) return `${base}${url}`;
    try {
      const parsed = new URL(url, window.location.origin);
      if (
        parsed.origin === window.location.origin &&
        parsed.pathname.startsWith("/api/")
      ) {
        return `${base}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      /* ignore invalid URLs */
    }
    return null;
  };

  window.fetch = function apiFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    if (typeof input === "string") {
      const next = rewriteUrl(input);
      if (next) return nativeFetch(next, init);
    } else if (input instanceof URL) {
      const next = rewriteUrl(`${input.pathname}${input.search}`);
      if (next) return nativeFetch(next, init);
    } else if (input instanceof Request) {
      const next = rewriteUrl(input.url);
      if (next) return nativeFetch(new Request(next, input), init);
    }
    return nativeFetch(input, init);
  };
}
