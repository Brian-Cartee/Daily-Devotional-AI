import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

// Generate a stable version string for this build. Using a timestamp so every
// production build gets a unique cache name, which triggers the activate
// handler to delete all previous caches.
const SW_CACHE_VERSION = `v${Date.now()}`;

function swCacheVersionPlugin() {
  return {
    name: "sw-cache-version",

    // In dev mode: intercept GET /sw.js and serve a replaced version
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== "/sw.js") return next();
        const swPath = path.resolve(import.meta.dirname, "public/sw.js");
        try {
          const content = fs.readFileSync(swPath, "utf-8").replace(
            /__SW_CACHE_VERSION__/g,
            SW_CACHE_VERSION,
          );
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Cache-Control", "no-store");
          res.end(content);
        } catch {
          next();
        }
      });
    },

    // In production: post-process the copied sw.js in the output dir
    closeBundle() {
      const outSwPath = path.resolve(
        import.meta.dirname,
        "dist/public/sw.js",
      );
      if (!fs.existsSync(outSwPath)) return;
      const content = fs.readFileSync(outSwPath, "utf-8").replace(
        /__SW_CACHE_VERSION__/g,
        SW_CACHE_VERSION,
      );
      fs.writeFileSync(outSwPath, content, "utf-8");
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    runtimeErrorOverlay(),
    swCacheVersionPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  css: {
    postcss: {
      plugins: [
        (await import("autoprefixer")).default(),
        (await import("tailwindcss")).default(),
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "src/shared"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: false,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
