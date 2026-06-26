import type { RefObject } from "react";
import type { WebView } from "react-native-webview";
import type { PhilipVoiceNativeEvent } from "./philipNativeVoice";

export function injectPhilipVoiceEvent(
  webviewRef: RefObject<WebView | null>,
  event: PhilipVoiceNativeEvent,
): void {
  const payload = JSON.stringify(event);
  webviewRef.current?.injectJavaScript(
    `(function(){try{var e=${payload};if(typeof window.__spPhilipVoiceOnEvent==='function'){window.__spPhilipVoiceOnEvent(e);}else{window.__spPhilipVoiceQueue=window.__spPhilipVoiceQueue||[];window.__spPhilipVoiceQueue.push(e);}}catch(err){}}true;)`,
  );
}

export function injectPhilipVoiceBridgeEnabled(
  webviewRef: RefObject<WebView | null>,
): void {
  webviewRef.current?.injectJavaScript(
    `(function(){try{
      window.__SP_PHILIP_NATIVE_VOICE__=true;
      document.documentElement.setAttribute('data-sp-philip-native-voice','1');
    }catch(e){}}true;)`,
  );
}
