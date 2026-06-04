import type { RefObject } from "react";
import type WebView from "react-native-webview";

/** Sync Apple IAP Pro status into the embedded website's localStorage. */
export const INJECT_APPLE_PRO_JS = `(function(){
  try{
    localStorage.setItem('sp_pro_verified','true');
    localStorage.setItem('sp_pro_email','apple-iap');
    localStorage.setItem('sp_pro_source','apple');
    window.dispatchEvent(new Event('sp-pro-updated'));
  }catch(e){}
  true;
})();`;

export const RELOAD_WEB_JS = "window.location.reload();true;";

export function injectApplePro(webviewRef: RefObject<WebView | null>): void {
  webviewRef.current?.injectJavaScript(INJECT_APPLE_PRO_JS);
}

export function reloadEmbeddedWeb(webviewRef: RefObject<WebView | null>): void {
  webviewRef.current?.injectJavaScript(RELOAD_WEB_JS);
}
