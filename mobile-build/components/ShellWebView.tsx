import React, { useMemo, type RefObject } from "react";
import { Platform, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import type { ShouldStartLoadRequest, WebViewMessageEvent } from "react-native-webview/lib/WebViewTypes";

export type ShellWebViewHandlers = {
  onMessage: (data: Record<string, unknown>) => void;
  onShouldStartLoadWithRequest: (event: ShouldStartLoadRequest) => boolean;
  onLoadStart: () => void;
  onLoadProgress: (progress: number) => void;
  onLoadEnd: (url: string) => void;
  onError: (description: string) => void;
  onHttpError: (statusCode: number) => void;
  onNavigation: (loading: boolean, title: string, url: string) => void;
  onContentProcessDidTerminate: () => void;
};

type ShellWebViewProps = {
  uri: string;
  webviewRef: RefObject<WebView | null>;
  handlersRef: RefObject<ShellWebViewHandlers>;
};

/** Isolated WebView — props must stay stable or WKWebView never reaches onLoadStart. */
export const ShellWebView = React.memo(function ShellWebView({
  uri,
  webviewRef,
  handlersRef,
}: ShellWebViewProps) {
  const source = useMemo(() => ({ uri }), [uri]);

  return (
    <WebView
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
      {...(Platform.OS === "ios" ? { decelerationRate: "normal" as const } : { overScrollMode: "always" as const })}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
      allowsFullscreenVideo
      setSupportMultipleWindows={false}
      cacheEnabled
      onShouldStartLoadWithRequest={(event) =>
        handlersRef.current?.onShouldStartLoadWithRequest(event) ?? true
      }
      onMessage={(event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data) as Record<string, unknown>;
          handlersRef.current?.onMessage(data);
        } catch {
          /* noop */
        }
      }}
      onLoadStart={() => handlersRef.current?.onLoadStart()}
      onLoadProgress={({ nativeEvent }) => handlersRef.current?.onLoadProgress(nativeEvent.progress)}
      onLoadEnd={(event) => handlersRef.current?.onLoadEnd(event.nativeEvent.url || uri)}
      onError={(event) => handlersRef.current?.onError(String(event.nativeEvent.description || "unknown"))}
      onHttpError={(event) => handlersRef.current?.onHttpError(event.nativeEvent.statusCode)}
      onNavigationStateChange={(nav) =>
        handlersRef.current?.onNavigation(Boolean(nav.loading), nav.title || "", nav.url || "")
      }
      onContentProcessDidTerminate={() => handlersRef.current?.onContentProcessDidTerminate()}
      {...(Platform.OS === "android"
        ? { thirdPartyCookiesEnabled: true, mixedContentMode: "compatibility" as const }
        : {})}
    />
  );
});

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: "#0d0612",
  },
});
