import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

const basePath = process.env.BASE_PATH || "/";

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

const replitPlugins =
  process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
    ? [
        (await import("@replit/vite-plugin-cartographer")).cartographer({
          root: path.resolve(import.meta.dirname, ".."),
        }),
        (await import("@replit/vite-plugin-dev-banner")).devBanner(),
      ]
    : [];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  const rawPort = env.PORT ?? process.env.PORT;
  const port =
    rawPort && !Number.isNaN(Number(rawPort)) && Number(rawPort) > 0
      ? Number(rawPort)
      : 3000;
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET?.trim() || "http://localhost:8080";
  const apiProxy = {
    "/api": {
      target: apiProxyTarget,
      changeOrigin: true,
    },
  };

  return {
    base: basePath,
    plugins: [
      react(),
      runtimeErrorOverlay(),
      swCacheVersionPlugin(),
      ...replitPlugins,
    ],
    css: {
      postcss: {
        plugins: [autoprefixer(), tailwindcss()],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@shared": path.resolve(import.meta.dirname, "src/shared"),
        "@assets": path.resolve(
          import.meta.dirname,
          "..",
          "..",
          "attached_assets",
        ),
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
      proxy: apiProxy,
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: apiProxy,
    },
  };
});
