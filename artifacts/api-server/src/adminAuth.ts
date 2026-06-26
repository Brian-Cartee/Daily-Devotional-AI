import type { Request, Response } from "express";
import { config } from "./config";

/** Shepherd's Path internal admin gate (`x-admin-token`). */
export function adminAuth(req: Request, res: Response): boolean {
  const password = config.adminPassword;
  const bypass = config.adminBypass;
  if (!password && !bypass) {
    res.status(503).json({ message: "Admin not configured." });
    return false;
  }
  const token = req.headers["x-admin-token"] as string | undefined;
  if (token !== password && token !== bypass) {
    res.status(401).json({ message: "Unauthorized." });
    return false;
  }
  return true;
}
