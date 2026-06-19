// Config plugin: adds "Hey Siri, start Talk It Through" App Intent to the iOS build.
// Requires iOS 16+ (already set in expo-build-properties).
//
// What this adds:
//   TalkItThroughIntent.swift  — AppIntent + AppShortcutsProvider
//   RCTSpLaunch.m              — tiny ObjC bridge to read the UserDefaults launch flag
//   Siri entitlement           — required for App Shortcuts (Siri phrase matching)

const {
  withEntitlementsPlist,
  withXcodeProject,
  withDangerousMod,
} = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

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

// ── Helper: add a file to the main app target in pbxproj ──────────────────────
function addFileToXcodeProject(project, projectName, fileName, fileContent, iosDir) {
  const filePath = path.join(iosDir, projectName, fileName);
  fs.writeFileSync(filePath, fileContent, "utf8");

  const targetName = projectName;
  const group = project.pbxGroupByName(projectName);
  if (!group) {
    console.warn(`[withTalkItThroughIntent] Could not find Xcode group: ${projectName}`);
    return;
  }

  // Check if already added
  const alreadyAdded = project.pbxFileReferences().some(
    ([, ref]) => ref.path && ref.path.replace(/"/g, "") === fileName
  );
  if (alreadyAdded) return;

  const file = project.addSourceFile(
    path.join(projectName, fileName),
    { target: project.getFirstTarget().uuid },
    project.findPBXGroupKey({ name: projectName })
  );

  if (!file) {
    console.warn(`[withTalkItThroughIntent] addSourceFile returned null for ${fileName}`);
  }
}

// ── Plugin entry point ────────────────────────────────────────────────────────
const withTalkItThroughIntent = (config) => {
  // 1. Add Siri entitlement (required for App Shortcuts / phrase matching)
  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults["com.apple.developer.siri"] = true;
    return cfg;
  });

  // 2. Write Swift + ObjC source files alongside the Xcode project
  config = withDangerousMod(config, [
    "ios",
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const projectName = cfg.modRequest.projectName;
      const iosDir = path.join(projectRoot, "ios");
      const targetDir = path.join(iosDir, projectName);

      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, "TalkItThroughIntent.swift"), INTENT_SWIFT, "utf8");
      fs.writeFileSync(path.join(targetDir, "RCTSpLaunch.m"), LAUNCH_MODULE_M, "utf8");

      return cfg;
    },
  ]);

  // 3. Add both files to the Xcode project (pbxproj)
  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectName = cfg.modRequest.projectName;
    const iosDir = path.join(cfg.modRequest.projectRoot, "ios");

    const targetUuid = project.getFirstTarget().uuid;
    const groupKey = project.findPBXGroupKey({ name: projectName });

    if (!groupKey) {
      console.warn("[withTalkItThroughIntent] Could not find Xcode group — files written but not linked");
      return cfg;
    }

    for (const fileName of ["TalkItThroughIntent.swift", "RCTSpLaunch.m"]) {
      // Skip if already in project
      const refs = project.pbxFileReferences();
      const exists = Object.values(refs).some(
        (ref) => ref && ref.path && ref.path.replace(/"/g, "") === fileName
      );
      if (exists) continue;

      project.addSourceFile(
        `${projectName}/${fileName}`,
        { target: targetUuid },
        groupKey
      );
    }

    return cfg;
  });

  return config;
};

module.exports = withTalkItThroughIntent;
