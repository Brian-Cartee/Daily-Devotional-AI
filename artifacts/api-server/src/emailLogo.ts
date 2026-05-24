import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

let cachedLogoSrc: string | null = null;

/** Logo for email headers — inline base64 when possible so Gmail always shows it. */
export function getEmailLogoSrc(appUrl: string): string {
  if (cachedLogoSrc) return cachedLogoSrc;

  const candidates = [
    path.resolve(process.cwd(), "assets/sp-email-logo.png"),
    path.resolve(moduleDir, "../assets/sp-email-logo.png"),
    path.resolve(process.cwd(), "../shepherds-path/public/sp-email-logo.png"),
    path.resolve(process.cwd(), "../shepherds-path/public/sp-cross-logo.png"),
  ];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const b64 = fs.readFileSync(filePath).toString("base64");
        cachedLogoSrc = `data:image/png;base64,${b64}`;
        return cachedLogoSrc;
      }
    } catch {
      // try next path
    }
  }

  const base = (appUrl || "https://www.shepherdspathai.com").replace(/\/$/, "");
  return `${base}/sp-email-logo.png`;
}
