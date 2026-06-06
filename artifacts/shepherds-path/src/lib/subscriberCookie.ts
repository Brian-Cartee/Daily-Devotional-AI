/** Shared cookie options — parent domain so www + apex stay in sync. */
export function subscriberCookieOptions(): {
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  domain?: string;
} {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const useParentDomain = host.endsWith("shepherdspathai.com");
  return {
    maxAge: 63072000000,
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    ...(useParentDomain ? { domain: ".shepherdspathai.com" } : {}),
  };
}

export function writeSubscriberCookie(name: string, value: string): void {
  try {
    const opts = subscriberCookieOptions();
    const secure = opts.secure ? "; Secure" : "";
    const domain = opts.domain ? `; domain=${opts.domain}` : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; path=${opts.path}; max-age=${Math.floor(opts.maxAge / 1000)}; SameSite=Lax${secure}${domain}`;
  } catch {
    /* ignore */
  }
}
