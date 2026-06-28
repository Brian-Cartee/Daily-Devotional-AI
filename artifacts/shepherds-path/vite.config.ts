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
              `  <link rel="modulepreload" href="${moduleSrc}">\n  <meta name="sp-main-js" content="${moduleSrc}">\n</head>`,
            );
          } else if (moduleSrc && !html.includes('meta name="sp-main-js"')) {
            html = html.replace("</head>", `  <meta name="sp-main-js" content="${moduleSrc}">\n</head>`);
          }
          // Remove every module script tag — stale boot-native.mjs tags block native inject on old binaries.
          html = html.replace(/<script[^>]*\stype=["']module["'][^>]*>\s*<\/script>\s*/gi, "");
          const bootScript = `<script data-sp-boot-marker="1">
(function () {
  var SRC = ${JSON.stringify(moduleSrc)};
  function bootLog(evt, detail) {
    try {
      var entry = { type: "sp_diag", event: evt, detail: String(detail || "").slice(0, 500), ts: Date.now() };
      window.__spDiagLogs = window.__spDiagLogs || [];
      window.__spDiagLogs.push(entry);
      if (window.__spNativePostRaw) window.__spNativePostRaw(JSON.stringify(entry));
      else if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(entry));
    } catch (e) {}
  }
  function absUrl(path) {
    if (!path) return "";
    if (path.indexOf("http") === 0) return path;
    return (location.origin || "https://www.shepherdspathai.com") + path;
  }
  function resolveSrc() {
    var meta = document.querySelector('meta[name="sp-main-js"]');
    if (meta && meta.getAttribute("content")) return meta.getAttribute("content");
    return SRC;
  }
  function stripStaleModuleTags() {
    var scripts = document.getElementsByTagName("script");
    var i;
    for (i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i];
      if (s.type !== "module") continue;
      var src = s.getAttribute("src") || "";
      if (s.getAttribute("data-sp-main") === "1") continue;
      if (src.indexOf("/assets/index-") >= 0) continue;
      if (s.parentNode) s.parentNode.removeChild(s);
    }
  }
  function signalReactBooted() {
    var attempts = 0;
    var t = setInterval(function () {
      attempts += 1;
      var mount = document.getElementById("sp-app-mount");
      if (mount && mount.firstElementChild && !window.__spNativeBridgeNotified) {
        clearInterval(t);
        try {
          var msg = JSON.stringify({ type: "react_booted", ts: Date.now() });
          if (window.__spNativePostRaw) window.__spNativePostRaw(msg);
          else if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
          if (window.__spFlushNativePostQueue) window.__spFlushNativePostQueue();
        } catch (e) {}
        try {
          if (window.__spSignalReady) window.__spSignalReady();
        } catch (e2) {}
      }
      if (attempts >= 160) clearInterval(t);
    }, 50);
  }
  function fallbackImport(abs) {
    if (window.__spMainModuleLoading || window.__spBootstrapDone) return;
    window.__spMainModuleLoading = true;
    bootLog("boot_fallback_import", abs);
    window.__spModuleEvaluating = true;
    import(abs)
      .then(function () {
        window.__spModuleEvaluating = false;
        bootLog("module_script_loaded", abs);
        signalReactBooted();
      })
      .catch(function (err) {
        window.__spModuleEvaluating = false;
        bootLog("module_script_error", String((err && err.message) || err));
      });
  }
  function runBoot() {
    bootLog("boot_cb", location.search || "");
    stripStaleModuleTags();
    var src = resolveSrc();
    if (!src) {
      bootLog("boot_src_missing", "");
      return;
    }
    var abs = absUrl(src);
    bootLog("boot_native_loader", src);
    bootLog("boot_defer_native", "bootstrap");
    var stripN = 0;
    var stripTimer = setInterval(function () {
      stripStaleModuleTags();
      if (++stripN >= 120) clearInterval(stripTimer);
    }, 25);
    setTimeout(function () {
      if (window.__spMainModuleLoading || window.__spBootstrapDone) return;
      fallbackImport(abs);
    }, 8000);
  }
  function tryBoot() {
    if (!window.ReactNativeWebView) return false;
    runBoot();
    return true;
  }
  if (!tryBoot()) {
    var n = 0;
    var t = setInterval(function () {
      n += 1;
      if (tryBoot() || n >= 400) clearInterval(t);
    }, 25);
  }
})();
</script>
`;
          if (moduleSrc && !html.includes("SP_NATIVE_BOOT_HEAD")) {
            html = html.replace("</head>", `${bootScript}\n<!-- SP_NATIVE_BOOT_HEAD -->\n</head>`);
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
              JSON.stringify({ mainJs: moduleSrc, builtAt: SW_CACHE_VERSION }, null, 2),
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
    define: {
      __BUILD_HASH__: JSON.stringify(SW_CACHE_VERSION),
    },
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
      // Single bundle — split vendor-react chunk + import() caused WKWebView stack overflow on build 200.
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
