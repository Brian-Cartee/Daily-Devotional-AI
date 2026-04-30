import { Share, Platform } from "react-native";
import type { RefObject } from "react";

const APP_STORE_LINK = "https://apps.apple.com/app/shepherds-path/id6760953522";

export type ShareContent = {
  text: string;
  reference?: string;
  type?: "verse" | "prayer" | "devotional";
};

/**
 * Captures a View as a PNG and opens the native share sheet.
 * Falls back to text-only sharing on web or if capture fails.
 */
export async function shareCard(
  viewRef: RefObject<any>,
  content: ShareContent
): Promise<void> {
  const fallbackText = buildFallbackText(content);

  // Web: text-only share
  if (Platform.OS === "web") {
    await textShare(fallbackText);
    return;
  }

  try {
    // Dynamic import so the module isn't required on web
    const ViewShot = await import("react-native-view-shot");
    const { shareAsync } = await import("expo-sharing");

    const uri = await ViewShot.captureRef(viewRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });

    const isAvailable = await (await import("expo-sharing")).isAvailableAsync();
    if (!isAvailable) {
      await textShare(fallbackText);
      return;
    }

    await shareAsync(uri, {
      mimeType: "image/png",
      dialogTitle: "Share from Shepherd's Path",
    });
  } catch {
    // Graceful fallback — works in Expo Go dev mode
    await textShare(fallbackText);
  }
}

function buildFallbackText(content: ShareContent): string {
  const lines: string[] = [];
  if (content.text) lines.push(`"${content.text}"`);
  if (content.reference) lines.push(`— ${content.reference}`);
  lines.push("");
  lines.push("Find peace in the moment.");
  lines.push(`Download Shepherd's Path: ${APP_STORE_LINK}`);
  return lines.join("\n");
}

async function textShare(text: string): Promise<void> {
  try {
    await Share.share({ message: text, url: APP_STORE_LINK });
  } catch {
    // User cancelled or share not available
  }
}
