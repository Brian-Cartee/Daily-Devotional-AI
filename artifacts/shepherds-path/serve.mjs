import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || "3000";

const distDir = path.join(__dirname, "dist/public");
const indexPath = path.join(distDir, "index.html");
const nativeShellPath = path.join(distDir, "native-shell.html");

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
};

function statFile(p) {
  try { return fs.statSync(p); } catch { return null; }
}

const server = http.createServer((req, res) => {
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
        "Cache-Control": isHtml ? "no-cache" : "public, max-age=31536000, immutable",
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
    sendFile(indexPath);
  }
});

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Shepherd's Path serving on port ${PORT}`);
});
