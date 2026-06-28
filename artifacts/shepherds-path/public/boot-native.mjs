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
  var link = document.querySelector('link[rel="modulepreload"][href*="/assets/index-"]');
  if (link) return link.getAttribute("href") || link.href || "";
  return "";
}

async function fetchManifestSrc() {
  try {
    var origin =
      location.protocol === "http:" || location.protocol === "https:"
        ? location.origin
        : "https://www.shepherdspathai.com";
    var r = await fetch(origin + "/native-manifest.json", { cache: "no-store" });
    var j = await r.json();
    return j && j.mainJs ? j.mainJs : "";
  } catch (e) {
    return "";
  }
}

function loadMainModule(abs) {
  return new Promise(function (resolve, reject) {
    if (window.__spMainModuleLoading) {
      resolve();
      return;
    }
    window.__spMainModuleLoading = true;
    window.__spModuleSrc = abs;
    window.__spModuleEvaluating = true;
    var s = document.createElement("script");
    s.type = "module";
    s.src = abs;
    s.setAttribute("data-sp-main", "1");
    s.addEventListener("load", function () {
      window.__spModuleEvaluating = false;
      resolve();
    });
    s.addEventListener("error", function () {
      window.__spModuleEvaluating = false;
      reject(new Error("module load failed"));
    });
    (document.head || document.documentElement).appendChild(s);
  });
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

await bootLog("boot_native_mjs", "start");

var src = resolveSrc();
if (!src) src = await fetchManifestSrc();
if (!src) {
  await bootLog("boot_src_missing", "");
} else {
  var abs = absUrl(src);
  await bootLog("module_load_start", abs);
  try {
    await loadMainModule(abs);
    await bootLog("module_script_loaded", abs);
    signalReactBooted();
  } catch (err) {
    await bootLog("module_script_error", String((err && err.message) || err));
  }
}
