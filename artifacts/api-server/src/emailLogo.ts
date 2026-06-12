import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EMAIL_THEME } from "./emailTheme";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

let cachedLogoSrc: string | null = null;

/** Public HTTPS logo — preferred in HTML emails (reliable across clients). */
export function getEmailLogoUrl(appUrl: string): string {
  const base = (appUrl || "https://www.shepherdspathai.com").replace(/\/$/, "");
  return `${base}/sp-email-logo.png?v=1`;
}

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

  return getEmailLogoUrl(appUrl);
}

/** Brand row with icon on the left + title/subtitle (daily email, welcome, etc.). */
export function buildEmailBrandHeaderRow(appUrl: string, subtitle: string): string {
  const T = EMAIL_THEME;
  const logoUrl = getEmailLogoUrl(appUrl);

  return `
        <tr>
          <td align="center" style="padding:0 0 20px;">
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
              <tr>
                <td style="padding-right:14px;vertical-align:middle;">
                  <img src="${logoUrl}"
                       alt="Shepherd's Path"
                       width="52"
                       height="52"
                       style="display:block;width:52px;height:52px;border:0;border-radius:14px;" />
                </td>
                <td style="vertical-align:middle;text-align:left;">
                  <p style="margin:0 0 4px;font-family:${T.serif};font-size:22px;font-weight:400;color:${T.text};letter-spacing:0.02em;line-height:1.2;">
                    Shepherd&rsquo;s Path
                  </p>
                  <p style="margin:0;font-family:${T.sans};font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:${T.textMuted};">
                    ${subtitle}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
}
