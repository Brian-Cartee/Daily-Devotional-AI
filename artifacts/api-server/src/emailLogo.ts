import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

let cachedLogoSrc: string | null = null;

/** Logo for email — current speech-bubble mark (same as app BRAND_ICON). */
export function getEmailLogoSrc(appUrl: string): string {
  if (cachedLogoSrc) return cachedLogoSrc;

  const candidates = [
    path.resolve(process.cwd(), "assets/sp-email-logo.png"),
    path.resolve(moduleDir, "../assets/sp-email-logo.png"),
    path.resolve(process.cwd(), "../shepherds-path/public/sp-email-logo.png"),
    path.resolve(process.cwd(), "../shepherds-path/public/talk-it-through-icon.png"),
  ];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const b64 = fs.readFileSync(filePath).toString("base64");
        const ext = filePath.endsWith(".png") ? "png" : "jpeg";
        cachedLogoSrc = `data:image/${ext};base64,${b64}`;
        return cachedLogoSrc;
      }
    } catch {
      /* try next path */
    }
  }

  const base = (appUrl || "https://www.shepherdspathai.com").replace(/\/$/, "");
  return `${base}/talk-it-through-icon.png`;
}
