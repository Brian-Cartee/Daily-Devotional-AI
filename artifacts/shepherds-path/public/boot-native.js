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
      if (attempts >= 240) clearInterval(t);
    }, 50);
  }

  function clearMainScriptTag() {
    var existing = document.querySelector('script[type="module"][data-sp-main="1"]');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  }

  function tryDynamicImport(abs) {
    if (window.__spDynamicImportAttempted || window.__spBootstrapDone) return;
    window.__spDynamicImportAttempted = true;
    window.__spModuleEvaluating = false;
    clearMainScriptTag();
    bootLog("module_fallback_import", abs);
    import(abs)
      .then(function () {
        window.__spBootstrapDone = true;
        window.__spModuleEvaluating = false;
        bootLog("module_import_dynamic_ok", abs);
        signalReactBooted();
      })
      .catch(function (e) {
        window.__spModuleEvaluating = false;
        bootLog("module_import_dynamic_error", String(e && e.message ? e.message : e));
      });
  }

  function scheduleEvalWatchdog(abs) {
    setTimeout(function () {
      if (window.__spBootstrapDone || !window.__spModuleEvaluating) return;
      bootLog("module_eval_3s", abs);
    }, 3000);
    setTimeout(function () {
      if (window.__spBootstrapDone) return;
      if (window.__spModuleEvaluating) {
        bootLog("module_eval_8s", abs);
        tryDynamicImport(abs);
      }
    }, 8000);
    setTimeout(function () {
      if (window.__spBootstrapDone) return;
      if (!window.__spDynamicImportAttempted && window.__spModuleEvaluating) {
        bootLog("module_eval_timeout", abs);
        tryDynamicImport(abs);
      } else if (!window.__spBootstrapDone) {
        bootLog("module_boot_stuck", abs);
      }
    }, 20000);
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

    var prevOnError = window.onerror;
    window.onerror = function (msg, url, line, col, err) {
      if (window.__spModuleEvaluating) {
        bootLog(
          "module_window_error",
          String(msg || "") + (url ? " @ " + url + ":" + line : ""),
        );
      }
      if (typeof prevOnError === "function") {
        return prevOnError.apply(this, arguments);
      }
      return false;
    };

    var s = document.createElement("script");
    s.type = "module";
    s.src = abs;
    s.setAttribute("data-sp-main", "1");
    s.addEventListener("load", function () {
      window.__spModuleEvaluating = false;
      window.__spBootstrapDone = true;
      bootLog("module_script_loaded", abs);
      if (window.__spFlushNativePostQueue) window.__spFlushNativePostQueue();
      signalReactBooted();
    });
    s.addEventListener("error", function () {
      window.__spModuleEvaluating = false;
      bootLog("module_script_error", abs);
      tryDynamicImport(abs);
    });

    // Defer eval off the boot stack — WKWebView is sensitive to sync module eval depth.
    setTimeout(function () {
      try {
        (document.head || document.documentElement).appendChild(s);
        scheduleEvalWatchdog(abs);
      } catch (e) {
        window.__spModuleEvaluating = false;
        bootLog("module_append_error", String(e));
        tryDynamicImport(abs);
      }
    }, 0);
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
    bootLog("boot_ready", document.readyState || "unknown");
    function go() {
      if (window.__spKickNativeBundleDone) return;
      try {
        run();
      } catch (e) {
        bootLog("boot_run_error", String(e));
      }
    }
    // WKWebView often never fires window "load" after location.replace — do not wait for it.
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", go, { once: true });
      setTimeout(function () {
        if (!window.__spKickNativeBundleDone) go();
      }, 2000);
    } else {
      go();
    }
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
