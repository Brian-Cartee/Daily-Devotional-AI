import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || "3000";

const distDir = path.join(__dirname, "dist/public");
const indexPath = path.join(distDir, "index.html");
const nativeShellPath = path.join(distDir, "native-shell.html");
const manifestPath = path.join(distDir, "native-manifest.json");

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch {
    return null;
  }
}

/** 302 native app entry to ?_cb=builtAt so WKWebView cannot serve stale cached HTML. */
function nativeCacheBustRedirect(reqUrl) {
  const raw = reqUrl || "/";
  const qmark = raw.indexOf("?");
  const pathOnly = qmark >= 0 ? raw.slice(0, qmark) : raw;
  const qs = qmark >= 0 ? raw.slice(qmark + 1) : "";
  if (pathOnly !== "/" && pathOnly !== "/index.html") return null;
  if (!qs.includes("native=1")) return null;

  const manifest = readManifest();
  const builtAt = manifest?.builtAt;
  if (!builtAt) return null;

  const params = new URLSearchParams(qs);
  if (params.get("_cb") === builtAt) return null;

  params.set("_cb", builtAt);
  const base = pathOnly === "/index.html" ? "/index.html" : "/";
  return `${base}?${params.toString()}`;
}

function wantsNativeBootstrap(url) {
  const q = (url || "").split("?")[1] || "";
  if (!q.includes("native=1")) return false;
  if (q.includes("enter=1")) return false;
  const pathOnly = (url || "/").split("?")[0];
  return pathOnly === "/" || pathOnly === "/index.html";
}

if (!fs.existsSync(distDir)) {
  console.error(`Build output not found at ${distDir}. Run 'pnpm build' first.`);
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
  ".gz": "application/gzip",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
};

const ASSET_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".ogg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".js",
  ".mjs",
  ".css",
  ".json",
  ".webmanifest",
  ".xml",
  ".txt",
  ".gz",
]);

function statFile(p) {
  try { return fs.statSync(p); } catch { return null; }
}

const server = http.createServer((req, res) => {
  const bustTarget = nativeCacheBustRedirect(req.url);
  if (bustTarget && bustTarget !== req.url) {
    res.writeHead(302, {
      Location: bustTarget,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    });
    res.end();
    return;
  }

  if (wantsNativeBootstrap(req.url) && fs.existsSync(nativeShellPath)) {
    const sendFile = (filePath, status = 200) => {
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end("Not found"); return; }
        res.writeHead(status, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache",
        });
        res.end(data);
      });
    };
    sendFile(nativeShellPath);
    return;
  }

  const urlPath = (req.url || "/").split("?")[0];
  const candidate = path.join(distDir, urlPath);

  const sendFile = (filePath, status = 200) => {
    const ext = path.extname(filePath).toLowerCase();
    const isHtml = ext === ".html" || ext === "";
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end("Not found"); return; }
      res.writeHead(status, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": isHtml ? "no-store, no-cache, must-revalidate" : "public, max-age=3600",
      });
      res.end(data);
    });
  };

  const stat = statFile(candidate);

  if (stat && stat.isFile()) {
    sendFile(candidate);
  } else if (stat && stat.isDirectory()) {
    const idx = path.join(candidate, "index.html");
    statFile(idx) ? sendFile(idx) : sendFile(indexPath);
  } else {
    const ext = path.extname(urlPath).toLowerCase();
    if (ASSET_EXTENSIONS.has(ext)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    sendFile(indexPath);
  }
});

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Shepherd's Path serving on port ${PORT}`);
});
