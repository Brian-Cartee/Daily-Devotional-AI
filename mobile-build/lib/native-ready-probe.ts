/** Injected into WKWebView until native shell receives gate_a_ready / app_ready. */
export const NATIVE_READY_PROBE_JS = `(function(){
  try {
    if (window.__spNativeBridgeNotified) return "done";
    var sel = '[data-testid="bottom-nav-for-you"],[data-testid="card-devotional"],[data-testid="home-threshold-hero"],[data-testid="sp-splash-active"],[data-testid="threshold-arrival"],[data-testid="night-shepherd"]';
    var hit=document.querySelector(sel);
    if(!hit) return "wait";
    function post(o){
      var s=JSON.stringify(o);
      if(window.__spNativePostRaw)window.__spNativePostRaw(s);
      else if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);
    }
    post({type:"sp_diag",event:"gate_a_ready",detail:"native_probe",ts:Date.now()});
    post({type:"web_ui_visible"});
    post({type:"app_ready"});
    window.__spNativeBridgeNotified=true;
    window.__spNativeUiPainted=true;
    document.documentElement.setAttribute("data-native-ui-ready","1");
    ["sp-boot-splash","sp-fg-cover","sp-native-boot-placeholder"].forEach(function(id){
      var el=document.getElementById(id);
      if(el&&el.remove)el.remove();
    });
    return "sent";
  } catch (e) {
    return "err";
  }
})();`;

/** 8s after first_route_rendered — dismiss only if nav/hero/card is in the DOM. */
export const GATE_A_FORCE_READY_JS = `(function(){
  try {
    if (window.__spNativeBridgeNotified) return "done";
    var sel = '[data-testid="bottom-nav-for-you"],[data-testid="card-devotional"],[data-testid="home-threshold-hero"],[data-testid="sp-splash-active"],[data-testid="threshold-arrival"],[data-testid="night-shepherd"]';
    if (!document.querySelector(sel)) return "wait";
    function post(o){
      var s=JSON.stringify(o);
      if(window.__spNativePostRaw)window.__spNativePostRaw(s);
      else if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);
    }
    post({type:"sp_diag",event:"gate_a_force_ready",detail:"dom_ok",ts:Date.now()});
    post({type:"web_ui_visible"});
    post({type:"app_ready"});
    window.__spNativeBridgeNotified=true;
    return "forced";
  } catch (e) {
    return "err";
  }
})();`;
