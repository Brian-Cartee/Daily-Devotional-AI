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

      const outIndex = path.resolve(import.meta.dirname, "dist/public/index.html");
      if (fs.existsSync(outIndex)) {
        let html = fs
          .readFileSync(outIndex, "utf-8")
          .replace(/\s+crossorigin(?=[\s>])/g, "");
        const moduleTag = html.match(/<script type="module"[^>]*><\/script>\s*/i);
        if (moduleTag) {
          const moduleSrc = moduleTag[0].match(/src="([^"]+)"/i)?.[1];
          if (moduleSrc && !html.includes(`modulepreload" href="${moduleSrc}"`)) {
            html = html.replace(
              "</head>",
              `  <link rel="modulepreload" href="${moduleSrc}">\n</head>`,
            );
          }
          html = html.replace(moduleTag[0], "");
          const bridgeEnd = html.indexOf("<!-- SP_NATIVE_BRIDGE_END -->");
          if (bridgeEnd >= 0) {
            html = html.replace(
              /<!-- SP_NATIVE_BRIDGE_END -->/,
              `${moduleTag[0]}\n    <!-- SP_NATIVE_BRIDGE_END -->`,
            );
          } else {
            html = html.replace("</body>", `${moduleTag[0]}</body>`);
          }
        }
        const cssTag = html.match(/<link rel="stylesheet"[^>]*>\s*/i);
        if (cssTag && !html.includes(cssTag[0] + "</head>")) {
          html = html.replace(cssTag[0], "");
          html = html.replace("</head>", `  ${cssTag[0]}</head>`);
        }
        fs.writeFileSync(outIndex, html, "utf-8");

        if (moduleTag) {
          const moduleSrc = moduleTag[0].match(/src="([^"]+)"/i)?.[1];
          if (moduleSrc) {
            const manifestPath = path.resolve(import.meta.dirname, "dist/public/native-manifest.json");
            fs.writeFileSync(
              manifestPath,
              JSON.stringify({ mainJs: moduleSrc, builtAt: new Date().toISOString() }, null, 2),
              "utf-8",
            );
          }
        }
      }
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
      target: "es2020",
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("react-dom") || /\/react\//.test(id)) return "vendor-react";
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            if (id.includes("wouter")) return "vendor-router";
          },
        },
      },
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
