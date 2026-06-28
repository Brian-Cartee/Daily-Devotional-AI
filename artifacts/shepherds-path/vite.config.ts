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
          // Remove Vite's default module tag — load the bundle AFTER window load so
          // WKWebView onLoadEnd native inject cannot re-enter JS mid-module-eval (build 200).
          html = html.replace(moduleTag[0], "");
          const loaderScript = `<script type="module">
(function(){
  var src=${JSON.stringify(moduleSrc)};
          // Build 200 fires injectProfileSeed + probeWebReady (200/800/2000ms) on onLoadEnd.
          // Wait past all of that before touching the JS bundle in WKWebView.
          var NATIVE_IMPORT_DELAY_MS=4500;
          function nativeImportDelayMs(){
            return window.ReactNativeWebView?NATIVE_IMPORT_DELAY_MS:50;
          }
          function msUntilNativeImportReady(){
            if(!window.ReactNativeWebView)return 0;
            var loadAt=window.__spPageLoadAt||0;
            if(!loadAt)return NATIVE_IMPORT_DELAY_MS;
            return Math.max(0,NATIVE_IMPORT_DELAY_MS-(Date.now()-loadAt));
          }
          function onModuleReady(){
            window.__spModuleEvaluating=false;
            try{window.__spInstallShellErrorHandlers&&window.__spInstallShellErrorHandlers();}catch(e){}
            try{window.__spDiag&&window.__spDiag("module_script_loaded",src);}catch(e){}
          }
          function onModuleFail(err){
            window.__spModuleEvaluating=false;
            var msg=String((err&&err.message)||err||"import failed");
            try{window.__spDiag&&window.__spDiag("module_script_error",src+" "+msg);}catch(e){}
            try{
              if(window.__spPostToNative){
                window.__spPostToNative({type:"js_error",msg:msg,detail:src});
              }
            }catch(e2){}
          }
          function loadViaScriptTag(){
            var existing=document.querySelector('script[type="module"][data-sp-main="1"]');
            if(existing)return;
            var s=document.createElement("script");
            s.type="module";
            s.src=src;
            s.setAttribute("data-sp-main","1");
            s.addEventListener("load",onModuleReady);
            s.addEventListener("error",function(){onModuleFail(new Error("script error"));});
            (document.head||document.documentElement).appendChild(s);
          }
          function start(){
            if(window.__spMainModuleLoading)return;
            var wait=msUntilNativeImportReady();
            if(wait>0){setTimeout(start,wait);return;}
            window.__spMainModuleLoading=true;
            window.__spModuleEvaluating=true;
            try{window.__spDiag&&window.__spDiag("module_load_start",src);}catch(e){}
            if(window.ReactNativeWebView){
              loadViaScriptTag();
              return;
            }
            import(src).then(onModuleReady).catch(onModuleFail);
          }
          function schedule(){setTimeout(start,nativeImportDelayMs());}
          window.__spScheduleMainModuleBoot=schedule;
          if(document.readyState==="complete"){
            if(!window.__spPageLoadAt)window.__spPageLoadAt=Date.now();
            schedule();
          }else{
            window.addEventListener("load",function(){
              window.__spPageLoadAt=Date.now();
              schedule();
            },{once:true});
            document.addEventListener("DOMContentLoaded",function(){
              if(!window.__spPageLoadAt)window.__spPageLoadAt=Date.now();
            },{once:true});
          }
          setTimeout(function(){if(!window.__spMainModuleLoading)schedule();},600);
          setTimeout(function(){if(!window.__spMainModuleLoading)schedule();},4800);
          setTimeout(function(){if(!window.__spMainModuleLoading)schedule();},7000);
})();
</script>`;
          const moduleInsert = `${loaderScript}\n`;
          if (html.includes("<!-- SP_NATIVE_BRIDGE_END -->")) {
            html = html.replace(
              "<!-- SP_NATIVE_BRIDGE_END -->",
              `<!-- SP_NATIVE_BRIDGE_END -->\n  ${moduleInsert}`,
            );
          } else {
            html = html.replace("</body>", `  ${moduleInsert}</body>`);
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
