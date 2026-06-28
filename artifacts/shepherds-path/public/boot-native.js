(function () {
  if (window.__spKickNativeBundleDone) return;

  function bootLog(evt, detail) {
    try {
      var entry = {
        type: "sp_diag",
        event: evt,
        detail: String(detail || "").slice(0, 500),
        ts: Date.now(),
      };
      if (window.__spNativePostRaw) window.__spNativePostRaw(JSON.stringify(entry));
      else if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(entry));
    } catch (e) {}
  }

  function absUrl(path) {
    if (!path) return "";
    if (path.indexOf("http") === 0) return path;
    return (location.origin || "https://www.shepherdspathai.com") + path;
  }

  function stripDecoys() {
    var scripts = document.getElementsByTagName("script");
    var i;
    for (i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i];
      if (s.type !== "module") continue;
      if (s.getAttribute("data-sp-main") === "1") continue;
      if (s.parentNode) s.parentNode.removeChild(s);
    }
  }

  function resolveSrc() {
    var meta = document.querySelector('meta[name="sp-main-js"]');
    if (meta && meta.getAttribute("content")) return meta.getAttribute("content");
    var link = document.querySelector('link[rel="modulepreload"][href*="/assets/index-"]');
    if (link) return link.getAttribute("href") || link.href || "";
    return "";
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

  function kickImport(abs) {
    if (window.__spMainModuleLoading || window.__spBootstrapDone) {
      bootLog("boot_import_skip", window.__spBootstrapDone ? "bootstrap_done" : "busy");
      return;
    }
    window.__spKickNativeBundleDone = true;
    window.__spMainModuleLoading = true;
    window.__spModuleSrc = abs;
    bootLog("boot_native_js", abs);
    bootLog("module_load_start", abs);
    window.__spModuleEvaluating = true;
    var s = document.createElement("script");
    s.type = "module";
    s.src = abs;
    s.setAttribute("data-sp-main", "1");
    s.addEventListener("load", function () {
      window.__spModuleEvaluating = false;
      bootLog("module_script_loaded", abs);
      signalReactBooted();
    });
    s.addEventListener("error", function () {
      window.__spModuleEvaluating = false;
      bootLog("module_script_error", abs);
    });
    (document.head || document.documentElement).appendChild(s);
  }

  function run() {
    stripDecoys();
    var src = resolveSrc();
    if (src) {
      kickImport(absUrl(src));
      return;
    }
    fetch((location.origin || "https://www.shepherdspathai.com") + "/native-manifest.json", {
      cache: "no-store",
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (j && j.mainJs) kickImport(absUrl(j.mainJs));
        else bootLog("boot_src_missing", "");
      })
      .catch(function () {
        bootLog("boot_src_missing", "manifest");
      });
  }

  function startBoot() {
    if (window.__spKickNativeBundleDone) return true;
    if (!window.ReactNativeWebView) return false;
    bootLog("boot_cb", location.search || "");
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run, { once: true });
    return true;
  }

  if (startBoot()) return;
  var polls = 0;
  var pollTimer = setInterval(function () {
    polls += 1;
    startBoot();
    if (window.__spKickNativeBundleDone || polls >= 400) clearInterval(pollTimer);
  }, 25);
})();
