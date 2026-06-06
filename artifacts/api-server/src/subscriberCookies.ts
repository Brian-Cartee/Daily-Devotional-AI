/** Cookie options for subscriber identity cookies (shared across www + apex). */
export function subscriberCookieOptions(isProduction: boolean): {
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  domain?: string;
} {
  return {
    maxAge: 63072000000,
    httpOnly: false,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    domain: isProduction ? ".shepherdspathai.com" : undefined,
  };
}
