/**
 * Magic-link auth for church admins and pastors.
 * No passwords. Pastor enters email → gets a link → clicks → logged in.
 * Token stored in church_magic_links table (survives server restarts).
 */
import crypto from "crypto";
import { pool } from "../db";
import { getUncachableResendClient } from "../resend";

const TOKEN_TTL_MINUTES = 15;
const SESSION_COOKIE = "sp_church_admin";
const SESSION_TTL_DAYS = 30;

export interface ChurchAdminSession {
  email: string;
  churchId: string | null;
  role: string;
  isDemo?: boolean;
}

// ── Token generation ──────────────────────────────────────────────────────────

export async function createMagicLink(
  email: string,
  churchId: string | null,
  baseUrl: string,
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await pool.query(
    `INSERT INTO church_magic_links (email, token, church_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [email.toLowerCase().trim(), token, churchId ?? null, expiresAt],
  );

  return `${baseUrl}/admin/auth/verify?token=${token}`;
}

// ── Token verification ────────────────────────────────────────────────────────

export async function verifyMagicToken(token: string): Promise<{
  email: string;
  churchId: string | null;
} | null> {
  const result = await pool.query(
    `UPDATE church_magic_links
     SET used = true
     WHERE token = $1
       AND used = false
       AND expires_at > now()
     RETURNING email, church_id`,
    [token],
  );

  if (result.rows.length === 0) return null;

  return {
    email: result.rows[0].email,
    churchId: result.rows[0].church_id ?? null,
  };
}

// ── Session cookie helpers ────────────────────────────────────────────────────

export function setAdminSessionCookie(
  res: import("express").Response,
  session: ChurchAdminSession,
): void {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64");
  res.cookie(SESSION_COOKIE, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAdminSessionCookie(res: import("express").Response): void {
  res.clearCookie(SESSION_COOKIE);
}

export function parseAdminSession(
  req: import("express").Request,
): ChurchAdminSession | null {
  try {
    const raw = req.cookies?.[SESSION_COOKIE];
    if (!raw) return null;
    const session = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (!session?.email) return null;
    return session as ChurchAdminSession;
  } catch {
    return null;
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

export function requireChurchAdmin(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  const session = parseAdminSession(req);
  if (!session) {
    res.status(401).json({ code: "auth_required", message: "Please log in." });
    return;
  }
  (req as any).churchAdminSession = session;
  next();
}

// ── Email send ────────────────────────────────────────────────────────────────

export async function sendMagicLinkEmail(
  email: string,
  magicUrl: string,
  churchName: string,
): Promise<void> {
  const { client, fromEmail } = await getUncachableResendClient();
  await client.emails.send({
    from: fromEmail,
    to: email,
    subject: `Your ${churchName} admin sign-in link`,
    html: `
      <p>Hello,</p>
      <p>Click the link below to sign in to your <strong>${churchName}</strong> Shepherd's Path admin dashboard.</p>
      <p><a href="${magicUrl}" style="font-size:16px;">Sign in to admin dashboard →</a></p>
      <p>This link expires in ${TOKEN_TTL_MINUTES} minutes and can only be used once.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });
}

// ── Cleanup (run periodically or on boot) ────────────────────────────────────

export async function cleanExpiredTokens(): Promise<void> {
  await pool.query(
    `DELETE FROM church_magic_links WHERE expires_at < now() OR used = true`,
  );
}
