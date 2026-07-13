import React, { useLayoutEffect, useMemo, type RefObject } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewProps } from "react-native-webview";

/** Minimal shell paint only — profile seed runs after onLoadEnd (heavy inject here stalls WKWebView). */
const BEFORE_CONTENT_JS = `(function(){
  document.documentElement.style.backgroundColor='#0d0612';
  if(document.body){document.body.style.backgroundColor='#0d0612';document.body.style.color='#ede8e0';}
  document.documentElement.setAttribute('data-sp-shell','native');
  document.documentElement.setAttribute('data-sp-philip-native-voice','0');
  window.__SP_PHILIP_NATIVE_VOICE__=false;
  document.documentElement.setAttribute('data-sp-native-share','1');
  document.documentElement.classList.add('sp-native-shell','dark');
  true;
})();`;

export type GateAWebViewHandlers = Partial<
  Pick<
    WebViewProps,
    | "onMessage"
    | "onLoadStart"
    | "onLoadProgress"
    | "onLoadEnd"
    | "onError"
    | "onHttpError"
    | "onContentProcessDidTerminate"
    | "onNavigationStateChange"
    | "onShouldStartLoadWithRequest"
    | "renderLoading"
  >
>;

type GateAWebViewHostProps = {
  uri: string;
  webviewRef: RefObject<WebView | null>;
  handlersRef: RefObject<GateAWebViewHandlers>;
  onBootDiag?: (event: string, detail?: string) => void;
};

/** Direct WKWebView shell — parent overlay/RevenueCat re-renders must not touch this tree. */
export const GateAWebViewHost = React.memo(function GateAWebViewHost({
  uri,
  webviewRef,
  handlersRef,
  onBootDiag,
}: GateAWebViewHostProps) {
  const source = useMemo(
    () => ({
      uri,
      headers: { "Cache-Control": "no-cache" },
    }),
    [uri],
  );

  useLayoutEffect(() => {
    onBootDiag?.("webview_mount", webviewRef.current ? "ref_ok" : "ref_null");
  }, [uri, onBootDiag, webviewRef]);

  return (
    <View style={styles.host}>
      <WebView
        key={uri}
        ref={webviewRef}
        source={source}
        style={styles.webview}
        originWhitelist={["https://*", "http://*", "shepherdspath://*"]}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures={false}
        pullToRefreshEnabled={false}
        scrollEnabled
        bounces
        startInLoadingState
        {...(Platform.OS === "ios" ? { decelerationRate: "normal" as const } : { overScrollMode: "always" as const })}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        injectedJavaScriptBeforeContentLoaded={BEFORE_CONTENT_JS}
        onShouldStartLoadWithRequest={(event) =>
          handlersRef.current?.onShouldStartLoadWithRequest?.(event) ?? true
        }
        renderLoading={() => handlersRef.current?.renderLoading?.() ?? null}
        onLoadStart={() => handlersRef.current?.onLoadStart?.()}
        onLoadProgress={(event) => handlersRef.current?.onLoadProgress?.(event)}
        onLoadEnd={(event) => handlersRef.current?.onLoadEnd?.(event)}
        onError={(event) => handlersRef.current?.onError?.(event)}
        onHttpError={(event) => handlersRef.current?.onHttpError?.(event)}
        onContentProcessDidTerminate={() =>
          handlersRef.current?.onContentProcessDidTerminate?.()
        }
        onNavigationStateChange={(nav) =>
          handlersRef.current?.onNavigationStateChange?.(nav)
        }
        onMessage={(event) => handlersRef.current?.onMessage?.(event)}
        {...(Platform.OS === "android"
          ? { thirdPartyCookiesEnabled: true, mixedContentMode: "compatibility" as const }
          : {})}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  host: {
    flex: 1,
    minHeight: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "#0d0612",
  },
});
