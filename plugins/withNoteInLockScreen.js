const { withInfoPlist, withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_TARGET_NAME = 'NoteInWidgetExtension';
const WIDGET_BUNDLE_ID_SUFFIX = '.Widget';

const ATTRIBUTES_SWIFT = `import ActivityKit
import AppIntents
import Foundation

public struct NoteInDailyItem: Codable, Hashable, Identifiable {
  public var id: String
  public var timeRange: String
  public var title: String
  public var done: Bool
}

public struct NoteInCalendarDay: Hashable, Identifiable {
  public var id: String { date }
  public var date: String
  public var dayNumber: String
  public var hasEvent: Bool
  public var isSunday: Bool

  public init(raw: String) {
    let parts = raw.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
    self.date = parts.count > 0 ? parts[0] : ""
    self.dayNumber = parts.count > 1 ? parts[1] : ""
    self.hasEvent = parts.count > 2 ? parts[2] == "1" : false
    self.isSunday = parts.count > 3 ? parts[3] == "1" : false
  }
}

public struct NoteInCalendarEvent: Codable, Hashable, Identifiable {
  public var id: String
  public var date: String
  public var dateFormatted: String
  public var time: String
  public var title: String
  public var note: String
}

public struct NoteInPayload: Codable {
  public var language: String
  public var selectedDate: String
  public var tabDailyLabel: String
  public var tabCalendarLabel: String
  public var tabHiddenLabel: String
  public var currentBadge: String
  public var progressLabel: String
  public var hiddenHint: String
  public var emptyEventsHint: String
  public var selectedDateHeader: String
  public var weekdays: [String]
  public var currentTitle: String
  public var currentNote: String
  public var currentTimeRange: String
  public var progressPct: Int
  public var dailyItems: [NoteInDailyItem]
  public var calendarDaysRaw: [String]
  public var calendarEvents: [NoteInCalendarEvent]
}

@available(iOS 16.2, *)
public struct NoteInAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var activeTab: String // "daily" | "calendar" | "hidden"
    public var selectedDate: String
    public var language: String
    public var tabDailyLabel: String
    public var tabCalendarLabel: String
    public var tabHiddenLabel: String
    public var currentBadge: String
    public var progressLabel: String
    public var hiddenHint: String
    public var emptyEventsHint: String
    public var selectedDateHeader: String
    public var weekdays: [String]
    public var currentTitle: String
    public var currentNote: String
    public var currentTimeRange: String
    public var progressPct: Int
    public var dailyItems: [NoteInDailyItem]
    public var calendarDaysRaw: [String]
    public var calendarEvents: [NoteInCalendarEvent]

    public var calendarDays: [NoteInCalendarDay] {
      calendarDaysRaw.map { NoteInCalendarDay(raw: $0) }
    }
  }

  public var cardRole: String // "primary" | "secondary"

  public init(cardRole: String = "primary") {
    self.cardRole = cardRole
  }
}

// MARK: - Interactive Lock Screen AppIntents (Compiled into BOTH App and Widget Extension)

@available(iOS 17.0, *)
public struct SwitchNoteInTabIntent: LiveActivityIntent {
  public static var title: LocalizedStringResource = "Switch Lock Screen Tab"
  public static var openAppWhenRun: Bool = false

  @Parameter(title: "Tab")
  public var tab: String

  public init() {
    self.tab = "daily"
  }

  public init(tab: String) {
    self.tab = tab
  }

  public func perform() async throws -> some IntentResult {
    for activity in Activity<NoteInAttributes>.activities {
      var updated = activity.content.state
      updated.activeTab = tab
      await activity.update(ActivityContent(state: updated, staleDate: nil))
    }
    return .result()
  }
}

@available(iOS 17.0, *)
public struct ToggleNoteInDailyIntent: LiveActivityIntent {
  public static var title: LocalizedStringResource = "Toggle Daily Item Completion"
  public static var openAppWhenRun: Bool = false

  @Parameter(title: "Daily ID")
  public var dailyId: String

  public init() {
    self.dailyId = ""
  }

  public init(dailyId: String) {
    self.dailyId = dailyId
  }

  public func perform() async throws -> some IntentResult {
    for activity in Activity<NoteInAttributes>.activities {
      var updated = activity.content.state
      if let idx = updated.dailyItems.firstIndex(where: { $0.id == dailyId }) {
        updated.dailyItems[idx].done.toggle()
      }
      await activity.update(ActivityContent(state: updated, staleDate: nil))
    }
    return .result()
  }
}

@available(iOS 17.0, *)
public struct SelectNoteInDateIntent: LiveActivityIntent {
  public static var title: LocalizedStringResource = "Select Desk Calendar Date"
  public static var openAppWhenRun: Bool = false

  @Parameter(title: "Date")
  public var date: String

  public init() {
    self.date = ""
  }

  public init(date: String) {
    self.date = date
  }

  public func perform() async throws -> some IntentResult {
    for activity in Activity<NoteInAttributes>.activities {
      var updated = activity.content.state
      updated.selectedDate = date
      await activity.update(ActivityContent(state: updated, staleDate: nil))
    }
    return .result()
  }
}

@available(iOS 17.0, *)
public struct NoOpNoteInIntent: LiveActivityIntent {
  public static var title: LocalizedStringResource = "Lock Screen Background Tap Shield"
  public static var openAppWhenRun: Bool = false

  public init() {}

  public func perform() async throws -> some IntentResult {
    return .result()
  }
}
`;

const MODULE_SWIFT = `import ActivityKit
import Foundation
import React

@objc(NoteInLockScreen)
class NoteInLockScreen: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func startOrUpdateLiveActivity(
    _ payloadJson: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }

    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      resolve(false)
      return
    }

    guard let data = payloadJson.data(using: .utf8),
          let payload = try? JSONDecoder().decode(NoteInPayload.self, from: data) else {
      resolve(false)
      return
    }

    Task {
      let existingActivities = Activity<NoteInAttributes>.activities
      let currentTab = existingActivities.first?.content.state.activeTab ?? "daily"
      let currentSelectedDate = existingActivities.first?.content.state.selectedDate ?? payload.selectedDate

      let newState = NoteInAttributes.ContentState(
        activeTab: currentTab,
        selectedDate: currentSelectedDate,
        language: payload.language,
        tabDailyLabel: payload.tabDailyLabel,
        tabCalendarLabel: payload.tabCalendarLabel,
        tabHiddenLabel: payload.tabHiddenLabel,
        currentBadge: payload.currentBadge,
        progressLabel: payload.progressLabel,
        hiddenHint: payload.hiddenHint,
        emptyEventsHint: payload.emptyEventsHint,
        selectedDateHeader: payload.selectedDateHeader,
        weekdays: payload.weekdays,
        currentTitle: payload.currentTitle,
        currentNote: payload.currentNote,
        currentTimeRange: payload.currentTimeRange,
        progressPct: payload.progressPct,
        dailyItems: payload.dailyItems,
        calendarDaysRaw: payload.calendarDaysRaw,
        calendarEvents: payload.calendarEvents
      )

      let content = ActivityContent(state: newState, staleDate: nil)

      if let primary = existingActivities.first {
        for extra in existingActivities.dropFirst() {
          await extra.end(nil, dismissalPolicy: .immediate)
        }
        await primary.update(content)
      } else {
        _ = try? Activity.request(
          attributes: NoteInAttributes(cardRole: "single"),
          content: content,
          pushType: nil
        )
      }

      resolve(true)
    }
  }
}
`;

const BRIDGE_OBJC = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(NoteInLockScreen, NSObject)

RCT_EXTERN_METHOD(startOrUpdateLiveActivity:(NSString *)payloadJson
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
`;

const WIDGET_SWIFT = `import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

@available(iOS 17.0, *)
struct NoteInSingleCardView: View {
  let state: NoteInAttributes.ContentState

  var body: some View {
    ZStack {
      // Intercept any stray background tap so it NEVER opens the app
      Button(intent: NoOpNoteInIntent()) {
        Color.white.opacity(0.001)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .contentShape(Rectangle())
      }
      .buttonStyle(.plain)

      VStack(spacing: 7) {
        // 2 Interactive Lock Screen Mode Tabs (Lịch Daily | Lịch Bàn)
        HStack(spacing: 8) {
          Button(intent: SwitchNoteInTabIntent(tab: "daily")) {
            Text("🕒 \\(state.tabDailyLabel)")
              .font(.system(size: 11, weight: .bold))
              .frame(maxWidth: .infinity)
              .padding(.vertical, 6)
              .background(
                state.activeTab != "calendar"
                  ? Color(red: 0.96, green: 0.62, blue: 0.04)
                  : Color.white.opacity(0.14)
              )
              .foregroundColor(state.activeTab != "calendar" ? Color.black : Color.white)
              .clipShape(Capsule())
          }
          .buttonStyle(.plain)

          Button(intent: SwitchNoteInTabIntent(tab: "calendar")) {
            Text("📅 \\(state.tabCalendarLabel)")
              .font(.system(size: 11, weight: .bold))
              .frame(maxWidth: .infinity)
              .padding(.vertical, 6)
              .background(
                state.activeTab == "calendar"
                  ? Color(red: 0.06, green: 0.73, blue: 0.51)
                  : Color.white.opacity(0.14)
              )
              .foregroundColor(state.activeTab == "calendar" ? Color.black : Color.white)
              .clipShape(Capsule())
          }
          .buttonStyle(.plain)
        }

        if state.activeTab != "calendar" {
          // Lịch Daily: Active Slot Highlight Card
          Button(intent: NoOpNoteInIntent()) {
            VStack(alignment: .leading, spacing: 4) {
              HStack {
                Text("⚡ \\(state.currentBadge)")
                  .font(.system(size: 9, weight: .heavy))
                  .padding(.horizontal, 6)
                  .padding(.vertical, 2)
                  .background(Color(red: 0.96, green: 0.62, blue: 0.04))
                  .foregroundColor(.black)
                  .clipShape(Capsule())

                Spacer()

                Text(state.currentTimeRange)
                  .font(.system(size: 11, weight: .bold))
                  .foregroundColor(Color(red: 0.99, green: 0.85, blue: 0.45))
              }

              Text(state.currentTitle)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)

              if !state.currentNote.isEmpty {
                Text(state.currentNote)
                  .font(.system(size: 10))
                  .foregroundColor(.white.opacity(0.75))
                  .lineLimit(1)
              }

              // Progress bar
              HStack(spacing: 6) {
                Text(state.progressLabel)
                  .font(.system(size: 9))
                  .foregroundColor(.white.opacity(0.7))

                GeometryReader { geo in
                  ZStack(alignment: .leading) {
                    Capsule()
                      .fill(Color.white.opacity(0.18))
                      .frame(height: 4)
                    Capsule()
                      .fill(Color(red: 0.96, green: 0.62, blue: 0.04))
                      .frame(
                        width: geo.size.width * CGFloat(min(max(state.progressPct, 0), 100)) / 100.0,
                        height: 4
                      )
                  }
                }
                .frame(height: 4)

                Text("\\(state.progressPct)%")
                  .font(.system(size: 9, weight: .bold))
                  .foregroundColor(Color(red: 0.96, green: 0.62, blue: 0.04))
              }
            }
            .padding(9)
            .background(Color.white.opacity(0.08))
            .overlay(
              RoundedRectangle(cornerRadius: 12)
                .stroke(Color(red: 0.96, green: 0.62, blue: 0.04).opacity(0.7), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
          }
          .buttonStyle(.plain)
        } else {
          // Lịch Bàn: ONLY events of the current day (today), nothing else!
          Button(intent: NoOpNoteInIntent()) {
            VStack(alignment: .leading, spacing: 5) {
              if state.calendarEvents.isEmpty {
                Text(state.emptyEventsHint)
                  .font(.system(size: 12, weight: .medium))
                  .foregroundColor(.white.opacity(0.8))
                  .frame(maxWidth: .infinity)
                  .padding(.vertical, 14)
                  .background(Color.white.opacity(0.08))
                  .clipShape(RoundedRectangle(cornerRadius: 12))
              } else {
                ForEach(state.calendarEvents.prefix(2)) { ev in
                  HStack(spacing: 8) {
                    Text(ev.time)
                      .font(.system(size: 11, weight: .heavy))
                      .padding(.horizontal, 7)
                      .padding(.vertical, 4)
                      .background(Color(red: 0.06, green: 0.73, blue: 0.51).opacity(0.25))
                      .foregroundColor(Color(red: 0.2, green: 0.95, blue: 0.7))
                      .clipShape(RoundedRectangle(cornerRadius: 7))

                    VStack(alignment: .leading, spacing: 1) {
                      Text(ev.title)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                      if !ev.note.isEmpty {
                        Text(ev.note)
                          .font(.system(size: 10))
                          .foregroundColor(.white.opacity(0.75))
                          .lineLimit(1)
                      }
                    }
                    Spacer()
                  }
                  .padding(.horizontal, 9)
                  .padding(.vertical, 6)
                  .background(Color.white.opacity(0.08))
                  .overlay(
                    RoundedRectangle(cornerRadius: 10)
                      .stroke(Color(red: 0.06, green: 0.73, blue: 0.51).opacity(0.45), lineWidth: 1)
                  )
                  .clipShape(RoundedRectangle(cornerRadius: 10))
                }
              }
            }
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 8)
    }
  }
}

@available(iOS 17.0, *)
@main
struct NoteInWidgetBundle: WidgetBundle {
  var body: some Widget {
    NoteInLiveActivityWidget()
  }
}

@available(iOS 17.0, *)
struct NoteInLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: NoteInAttributes.self) { context in
      NoteInSingleCardView(state: context.state)
        .activityBackgroundTint(.clear)
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text(context.state.currentTimeRange)
            .font(.caption2)
            .foregroundColor(.orange)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text("\\(context.state.progressPct)%")
            .font(.caption2.bold())
            .foregroundColor(.orange)
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text(context.state.currentTitle)
            .font(.caption.bold())
            .lineLimit(1)
        }
      } compactLeading: {
        Text("📅")
      } compactTrailing: {
        Text("\\(context.state.progressPct)%")
          .font(.caption2)
          .foregroundColor(.orange)
      } minimal: {
        Text("📅")
      }
    }
  }
}
`;

const WIDGET_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>NoteIn Lock Widget</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
`;

module.exports = function withNoteInLockScreen(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.NSSupportsLiveActivities = true;
    mod.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
    return mod;
  });

  config = withDangerousMod(config, [
    'ios',
    async (mod) => {
      const iosRoot = mod.modRequest.platformProjectRoot;
      const projectName = mod.modRequest.projectName || 'NoteIn';
      const appDir = path.join(iosRoot, projectName);
      const widgetDir = path.join(iosRoot, WIDGET_TARGET_NAME);

      fs.mkdirSync(widgetDir, { recursive: true });

      fs.writeFileSync(path.join(appDir, 'NoteInAttributes.swift'), ATTRIBUTES_SWIFT);
      fs.writeFileSync(path.join(appDir, 'NoteInLockScreenModule.swift'), MODULE_SWIFT);
      fs.writeFileSync(path.join(appDir, 'NoteInLockScreenBridge.m'), BRIDGE_OBJC);

      fs.writeFileSync(path.join(widgetDir, 'NoteInAttributes.swift'), ATTRIBUTES_SWIFT);
      fs.writeFileSync(path.join(widgetDir, 'NoteInWidget.swift'), WIDGET_SWIFT);
      fs.writeFileSync(
        path.join(widgetDir, `${WIDGET_TARGET_NAME}-Info.plist`),
        WIDGET_INFO_PLIST,
      );

      return mod;
    },
  ]);

  config = withXcodeProject(config, (mod) => {
    const xcodeProject = mod.modResults;
    const projectName = mod.modRequest.projectName || 'NoteIn';
    const bundleId = (config.ios && config.ios.bundleIdentifier) || 'com.bonhiki1233.NoteIn';
    const widgetBundleId = `${bundleId}${WIDGET_BUNDLE_ID_SUFFIX}`;

    const mainTarget = xcodeProject.getFirstTarget();
    const mainGroupKey = xcodeProject.findPBXGroupKey({ name: projectName });

    ['NoteInAttributes.swift', 'NoteInLockScreenModule.swift', 'NoteInLockScreenBridge.m'].forEach(
      (fileName) => {
        const filePath = `${projectName}/${fileName}`;
        if (!xcodeProject.hasFile(filePath)) {
          xcodeProject.addSourceFile(
            filePath,
            { target: mainTarget.uuid },
            mainGroupKey,
          );
        }
      },
    );

    if (!xcodeProject.pbxTargetByName(WIDGET_TARGET_NAME)) {
      const widgetTarget = xcodeProject.addTarget(
        WIDGET_TARGET_NAME,
        'app_extension',
        WIDGET_TARGET_NAME,
        widgetBundleId,
      );

      xcodeProject.addBuildPhase(
        [`${WIDGET_TARGET_NAME}/NoteInAttributes.swift`, `${WIDGET_TARGET_NAME}/NoteInWidget.swift`],
        'PBXSourcesBuildPhase',
        'Sources',
        widgetTarget.uuid,
      );
      xcodeProject.addBuildPhase(
        [],
        'PBXFrameworksBuildPhase',
        'Frameworks',
        widgetTarget.uuid,
      );

      const configurations = xcodeProject.pbxXCBuildConfigurationSection();
      Object.keys(configurations).forEach((key) => {
        const cfg = configurations[key];
        if (
          cfg &&
          cfg.buildSettings &&
          cfg.buildSettings.PRODUCT_NAME === `"${WIDGET_TARGET_NAME}"`
        ) {
          cfg.buildSettings.SWIFT_VERSION = '5.0';
          cfg.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '17.0';
          cfg.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
          cfg.buildSettings.CLANG_ENABLE_MODULES = 'YES';
          cfg.buildSettings.CODE_SIGN_STYLE = 'Automatic';
          cfg.buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
        }
      });
    }

    return mod;
  });

  return config;
};
