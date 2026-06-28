async function bootLog(evt, detail) {
  try {
    var entry = {
      type: "sp_diag",
      event: evt,
      detail: String(detail || "").slice(0, 500),
      ts: Date.now(),
    };
    window.__spDiagLogs = window.__spDiagLogs || [];
    window.__spDiagLogs.push(entry);
    if (window.__spNativePostRaw) window.__spNativePostRaw(JSON.stringify(entry));
    else if (window.__spPostToNative) window.__spPostToNative(entry);
    else if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(entry));
  } catch (e) {}
}

async function waitMs(ms) {
  var end = performance.now() + ms;
  while (performance.now() < end) {
    await new Promise(function (resolve) {
      requestAnimationFrame(resolve);
    });
  }
}

function resolveMainSrc() {
  var meta = document.querySelector('meta[name="sp-main-js"]');
  if (meta && meta.getAttribute("content")) return meta.getAttribute("content");
  var link = document.querySelector('link[rel="modulepreload"][href*="/assets/index-"]');
  if (link) return link.getAttribute("href") || link.href || "";
  return "";
}

var src = resolveMainSrc();
if (!src) {
  await bootLog("boot_src_missing", "no meta or preload");
} else {
  try {
    await bootLog("boot_native_loader", src);
    if (window.ReactNativeWebView) {
      await bootLog("boot_import_wait", "4000");
      if (document.readyState !== "complete") {
        await new Promise(function (resolve) {
          window.addEventListener("load", resolve, { once: true });
        });
      }
      await waitMs(4000);
    }
    if (window.__spMainModuleLoading) {
      await bootLog("boot_import_skip", "busy");
    } else {
      window.__spMainModuleLoading = true;
      await bootLog("module_load_start", src);
      window.__spModuleEvaluating = true;
      await import(/* @vite-ignore */ src);
      window.__spModuleEvaluating = false;
      await bootLog("module_script_loaded", src);
      await waitMs(800);
      var mount = document.getElementById("sp-app-mount");
      if (mount && mount.firstElementChild && !window.__spNativeBridgeNotified) {
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
    }
  } catch (err) {
    window.__spModuleEvaluating = false;
    await bootLog("module_script_error", String((err && err.message) || err));
  }
}
