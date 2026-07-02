import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || "3003";
const distDir = path.join(__dirname, "dist");
const indexPath = path.join(distDir, "index.html");

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
  ".webmanifest": "application/manifest+json",
};

const ASSET_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".css",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".webmanifest",
]);

function statFile(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  const candidate = path.join(distDir, urlPath);

  const sendFile = (filePath, status = 200) => {
    const ext = path.extname(filePath).toLowerCase();
    const isHtml = ext === ".html" || ext === "";
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
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
  console.log(`Church admin portal serving on port ${PORT}`);
});
