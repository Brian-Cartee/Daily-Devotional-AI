import type { Request, Response } from "express";
import type { ChurchRole } from "@workspace/db";
import { roleAtLeast } from "./permissions";
import type { ChurchAdminSession } from "./auth";

export function getAdminSession(req: Request): ChurchAdminSession {
  return (req as any).churchAdminSession as ChurchAdminSession;
}

export function churchIdOr400(session: ChurchAdminSession, res: Response): string | null {
  if (!session.churchId) {
    res.status(400).json({ message: "No church linked to this account." });
    return null;
  }
  return session.churchId;
}

export function requireMinRole(
  session: ChurchAdminSession,
  res: Response,
  minimum: ChurchRole,
): boolean {
  const role = (session.role ?? "member") as ChurchRole;
  if (!roleAtLeast(role, minimum)) {
    res.status(403).json({ message: "Insufficient permissions." });
    return false;
  }
  return true;
}

export function appBaseUrl(): string {
  return (
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.CHURCH_PORTAL_URL?.replace(/\/$/, "") ||
    "https://www.shepherdspathai.com"
  );
}
