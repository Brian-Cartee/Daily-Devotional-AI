import * as SplashScreen from "expo-splash-screen";

let hidden = false;

/** Hide the purple cross splash only after the website has real UI on screen */
export async function hideNativeSplashWhenWebReady(): Promise<void> {
  if (hidden) return;
  hidden = true;
  try {
    await SplashScreen.hideAsync();
  } catch {
    /* noop */
  }
}
