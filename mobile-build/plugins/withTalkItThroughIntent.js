// Config plugin: adds "Hey Siri, start Talk It Through" App Intent to the iOS build.
// Requires iOS 16+ (already set in expo-build-properties).
//
// What this adds:
//   TalkItThroughIntent.swift  — AppIntent + AppShortcutsProvider
//   RCTSpLaunch.m              — tiny ObjC bridge to read the UserDefaults launch flag
//   Siri entitlement           — required for App Shortcuts (Siri phrase matching)

const { withEntitlementsPlist } = require("@expo/config-plugins");
const { withBuildSourceFile } = require("@expo/config-plugins/build/ios/XcodeProjectFile");

// ── Swift: App Intent ──────────────────────────────────────────────────────────
const INTENT_SWIFT = `import AppIntents

@available(iOS 16.0, *)
struct TalkItThroughIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Talk It Through"
    static var description = IntentDescription(
        "Open Talk It Through in Shepherd's Path — your space to speak what's on your heart."
    )
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        // Signal the app to open the guidance screen on next foreground
        UserDefaults.standard.set("guidance", forKey: "sp_launch_screen")
        return .result()
    }
}

@available(iOS 16.0, *)
struct ShepherdsPathShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: TalkItThroughIntent(),
            phrases: [
                "Start Talk It Through",
                "Start Talk It Through on \\(.applicationName)",
                "Open Talk It Through",
                "Open Talk It Through on \\(.applicationName)",
            ],
            shortTitle: "Talk It Through",
            systemImageName: "mic.fill"
        )
    }
}
`;

// ── ObjC: tiny native module — JS calls SpLaunch.getLaunchScreen() ───────────
const LAUNCH_MODULE_M = `#import <React/RCTBridgeModule.h>

@interface RCTSpLaunch : NSObject <RCTBridgeModule>
@end

@implementation RCTSpLaunch
RCT_EXPORT_MODULE(SpLaunch)

// Returns the pending launch screen key and immediately clears it.
// Returns null if no navigation was requested.
RCT_EXPORT_METHOD(getLaunchScreen:(RCTResponseSenderBlock)callback) {
    NSString *screen = [[NSUserDefaults standardUserDefaults] stringForKey:@"sp_launch_screen"];
    if (screen) {
        [[NSUserDefaults standardUserDefaults] removeObjectForKey:@"sp_launch_screen"];
    }
    callback(@[screen ?: [NSNull null]]);
}

@end
`;

const withTalkItThroughIntent = (config) => {
  // 1. Add Siri entitlement (required for App Shortcuts / phrase matching)
  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults["com.apple.developer.siri"] = true;
    return cfg;
  });

  // 2. Add Swift App Intent source file
  config = withBuildSourceFile(config, {
    filePath: "TalkItThroughIntent.swift",
    contents: INTENT_SWIFT,
    overwrite: true,
  });

  // 3. Add ObjC native module source file
  config = withBuildSourceFile(config, {
    filePath: "RCTSpLaunch.m",
    contents: LAUNCH_MODULE_M,
    overwrite: true,
  });

  return config;
};

module.exports = withTalkItThroughIntent;
