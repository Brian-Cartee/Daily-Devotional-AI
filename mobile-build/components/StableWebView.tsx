import React, { useMemo, type RefObject } from "react";
import { Platform } from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewProps } from "react-native-webview";

export type StableWebViewHandlers = Partial<
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
    | "onRefresh"
    | "renderLoading"
  >
>;

type StableWebViewProps = {
  uri: string;
  webviewRef: RefObject<WebView | null>;
  handlersRef: RefObject<StableWebViewHandlers>;
  pullRefreshing?: boolean;
  style?: WebViewProps["style"];
};

/** Isolated shell WebView — handler props stay stable or WKWebView never reaches onLoadStart. */
export const StableWebView = React.memo(function StableWebView({
  uri,
  webviewRef,
  handlersRef,
  pullRefreshing,
  style,
}: StableWebViewProps) {
  const source = useMemo(() => ({ uri }), [uri]);

  return (
    <WebView
      ref={webviewRef}
      source={source}
      style={style}
      originWhitelist={["https://*", "http://*", "shepherdspath://*"]}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled
      allowsBackForwardNavigationGestures={false}
      pullToRefreshEnabled={Platform.OS === "ios"}
      refreshing={pullRefreshing}
      scrollEnabled
      bounces
      {...(Platform.OS === "ios" ? { decelerationRate: "normal" as const } : { overScrollMode: "always" as const })}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
      allowsFullscreenVideo
      setSupportMultipleWindows={false}
      cacheEnabled={false}
      onShouldStartLoadWithRequest={(event) =>
        handlersRef.current?.onShouldStartLoadWithRequest?.(event) ?? true
      }
      onRefresh={() => handlersRef.current?.onRefresh?.()}
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
  );
});
