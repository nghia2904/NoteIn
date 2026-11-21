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

// ============================================================================
// ANDROID LOCK SCREEN CUSTOM INTERACTIVE WIDGET (RemoteViews + BroadcastReceiver)
// ============================================================================

const ANDROID_DRAWABLES = {
  'notein_widget_bg.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#EA111827" />
  <corners android:radius="14dp" />
  <stroke android:width="1dp" android:color="#38FFFFFF" />
</shape>
`,
  'notein_tab_daily_active.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#F59E0B" />
  <corners android:radius="99dp" />
</shape>
`,
  'notein_tab_calendar_active.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#10B981" />
  <corners android:radius="99dp" />
</shape>
`,
  'notein_tab_inactive.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#2EFFFFFF" />
  <corners android:radius="99dp" />
</shape>
`,
  'notein_inner_card_daily.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#24FFFFFF" />
  <corners android:radius="11dp" />
  <stroke android:width="1dp" android:color="#B3F59E0B" />
</shape>
`,
  'notein_inner_card_calendar.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#24FFFFFF" />
  <corners android:radius="10dp" />
  <stroke android:width="1dp" android:color="#8010B981" />
</shape>
`,
  'notein_badge_amber.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#F59E0B" />
  <corners android:radius="99dp" />
</shape>
`,
  'notein_badge_emerald.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#3810B981" />
  <corners android:radius="6dp" />
</shape>
`,
  'notein_progress_bar.xml': `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:id="@android:id/background">
    <shape android:shape="rectangle">
      <corners android:radius="99dp" />
      <solid android:color="#33FFFFFF" />
    </shape>
  </item>
  <item android:id="@android:id/progress">
    <scale android:scaleWidth="100%">
      <shape android:shape="rectangle">
        <corners android:radius="99dp" />
        <solid android:color="#F59E0B" />
      </shape>
    </scale>
  </item>
</layer-list>
`,
};

const ANDROID_LAYOUT_COLLAPSED = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
  android:id="@+id/widget_root"
  android:layout_width="match_parent"
  android:layout_height="48dp"
  android:orientation="vertical"
  android:gravity="center_vertical"
  android:paddingHorizontal="8dp"
  android:paddingVertical="2dp"
  android:background="@drawable/notein_widget_bg">

  <!-- Row 1 (18dp): 2 Interactive Tabs (Lịch Daily | Lịch Bàn) -->
  <LinearLayout
    android:layout_width="match_parent"
    android:layout_height="18dp"
    android:orientation="horizontal"
    android:layout_marginBottom="2dp">

    <TextView
      android:id="@+id/btn_tab_daily"
      android:layout_width="0dp"
      android:layout_height="match_parent"
      android:layout_weight="1"
      android:gravity="center"
      android:text="🕒 Lịch Daily"
      android:textSize="9sp"
      android:textStyle="bold"
      android:textColor="#000000"
      android:background="@drawable/notein_tab_daily_active"
      android:layout_marginEnd="3dp" />

    <TextView
      android:id="@+id/btn_tab_calendar"
      android:layout_width="0dp"
      android:layout_height="match_parent"
      android:layout_weight="1"
      android:gravity="center"
      android:text="📅 Lịch Bàn"
      android:textSize="9sp"
      android:textStyle="bold"
      android:textColor="#FFFFFF"
      android:background="@drawable/notein_tab_inactive"
      android:layout_marginStart="3dp" />
  </LinearLayout>

  <!-- Row 2 (24dp): Daily Mode Compact Bar -->
  <LinearLayout
    android:id="@+id/daily_container"
    android:layout_width="match_parent"
    android:layout_height="24dp"
    android:orientation="vertical"
    android:gravity="center_vertical"
    android:paddingHorizontal="6dp"
    android:background="@drawable/notein_inner_card_daily">

    <LinearLayout
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:orientation="horizontal"
      android:gravity="center_vertical">

      <TextView
        android:id="@+id/txt_current_time"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="18:00 - 21:00"
        android:textSize="9sp"
        android:textStyle="bold"
        android:textColor="#FDE047"
        android:layout_marginEnd="5dp" />

      <TextView
        android:id="@+id/txt_current_title"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:text="Ăn tối &amp; Thư giãn"
        android:textSize="10sp"
        android:textStyle="bold"
        android:textColor="#FFFFFF"
        android:singleLine="true"
        android:ellipsize="end" />

      <TextView
        android:id="@+id/txt_progress_pct"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="80%"
        android:textSize="9sp"
        android:textStyle="bold"
        android:textColor="#F59E0B"
        android:layout_marginStart="5dp" />

      <TextView
        android:id="@+id/txt_current_badge"
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:visibility="gone" />

      <TextView
        android:id="@+id/txt_current_note"
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:visibility="gone" />

      <TextView
        android:id="@+id/txt_progress_label"
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:visibility="gone" />
    </LinearLayout>

    <ProgressBar
      android:id="@+id/progress_bar"
      style="?android:attr/progressBarStyleHorizontal"
      android:layout_width="match_parent"
      android:layout_height="3dp"
      android:layout_marginTop="2dp"
      android:max="100"
      android:progress="80"
      android:progressDrawable="@drawable/notein_progress_bar" />
  </LinearLayout>

  <!-- Row 2 (24dp): Calendar Mode Compact Bar (Today's events only) -->
  <LinearLayout
    android:id="@+id/calendar_container"
    android:layout_width="match_parent"
    android:layout_height="24dp"
    android:orientation="horizontal"
    android:gravity="center_vertical"
    android:paddingHorizontal="6dp"
    android:background="@drawable/notein_inner_card_calendar"
    android:visibility="gone">

    <TextView
      android:id="@+id/txt_empty_events"
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:gravity="center"
      android:text="Chưa có sự kiện nào hôm nay"
      android:textSize="9sp"
      android:textColor="#CCFFFFFF"
      android:singleLine="true"
      android:visibility="gone" />

    <LinearLayout
      android:id="@+id/event_row_1"
      android:layout_width="0dp"
      android:layout_height="wrap_content"
      android:layout_weight="1"
      android:orientation="horizontal"
      android:gravity="center_vertical">

      <TextView
        android:id="@+id/txt_event_1_time"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="15:00"
        android:textSize="9sp"
        android:textStyle="bold"
        android:textColor="#6EE7B7"
        android:layout_marginEnd="3dp" />

      <TextView
        android:id="@+id/txt_event_1_title"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:text="Sự kiện 1"
        android:textSize="9sp"
        android:textStyle="bold"
        android:textColor="#FFFFFF"
        android:singleLine="true"
        android:ellipsize="end" />

      <TextView
        android:id="@+id/txt_event_1_note"
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:visibility="gone" />
    </LinearLayout>

    <LinearLayout
      android:id="@+id/event_row_2"
      android:layout_width="0dp"
      android:layout_height="wrap_content"
      android:layout_weight="1"
      android:orientation="horizontal"
      android:gravity="center_vertical"
      android:layout_marginStart="6dp">

      <TextView
        android:id="@+id/txt_event_2_time"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="20:00"
        android:textSize="9sp"
        android:textStyle="bold"
        android:textColor="#6EE7B7"
        android:layout_marginEnd="3dp" />

      <TextView
        android:id="@+id/txt_event_2_title"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:text="Sự kiện 2"
        android:textSize="9sp"
        android:textStyle="bold"
        android:textColor="#FFFFFF"
        android:singleLine="true"
        android:ellipsize="end" />

      <TextView
        android:id="@+id/txt_event_2_note"
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:visibility="gone" />
    </LinearLayout>
  </LinearLayout>
</LinearLayout>
`;

const ANDROID_LAYOUT_EXPANDED = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
  android:id="@+id/widget_root"
  android:layout_width="match_parent"
  android:layout_height="wrap_content"
  android:orientation="vertical"
  android:paddingHorizontal="12dp"
  android:paddingVertical="8dp"
  android:background="@drawable/notein_widget_bg">

  <!-- Top Row: 2 Interactive Tabs (Lịch Daily | Lịch Bàn) -->
  <LinearLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="horizontal"
    android:layout_marginBottom="7dp">

    <TextView
      android:id="@+id/btn_tab_daily"
      android:layout_width="0dp"
      android:layout_height="28dp"
      android:layout_weight="1"
      android:gravity="center"
      android:text="🕒 Lịch Daily"
      android:textSize="11sp"
      android:textStyle="bold"
      android:textColor="#000000"
      android:background="@drawable/notein_tab_daily_active"
      android:layout_marginEnd="4dp" />

    <TextView
      android:id="@+id/btn_tab_calendar"
      android:layout_width="0dp"
      android:layout_height="28dp"
      android:layout_weight="1"
      android:gravity="center"
      android:text="📅 Lịch Bàn"
      android:textSize="11sp"
      android:textStyle="bold"
      android:textColor="#FFFFFF"
      android:background="@drawable/notein_tab_inactive"
      android:layout_marginStart="4dp" />
  </LinearLayout>

  <!-- Daily Mode Full Highlight Card -->
  <LinearLayout
    android:id="@+id/daily_container"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:padding="10dp"
    android:background="@drawable/notein_inner_card_daily">

    <LinearLayout
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:orientation="horizontal"
      android:gravity="center_vertical">

      <TextView
        android:id="@+id/txt_current_badge"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:paddingHorizontal="6dp"
        android:paddingVertical="2dp"
        android:text="⚡ ĐANG DIỄN RA"
        android:textSize="9sp"
        android:textStyle="bold"
        android:textColor="#000000"
        android:background="@drawable/notein_badge_amber" />

      <TextView
        android:id="@+id/txt_current_time"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:gravity="end"
        android:text="06:00 - 07:30"
        android:textSize="11sp"
        android:textStyle="bold"
        android:textColor="#FDE047" />
    </LinearLayout>

    <TextView
      android:id="@+id/txt_current_title"
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:layout_marginTop="4dp"
      android:text="Học bài &amp; Ôn ngoại ngữ"
      android:textSize="14sp"
      android:textStyle="bold"
      android:textColor="#FFFFFF"
      android:singleLine="true"
      android:ellipsize="end" />

    <TextView
      android:id="@+id/txt_current_note"
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:layout_marginTop="2dp"
      android:text="Học 30 từ vựng mới, làm đề luyện nghe"
      android:textSize="10sp"
      android:textColor="#CCFFFFFF"
      android:singleLine="true"
      android:ellipsize="end" />

    <LinearLayout
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:orientation="horizontal"
      android:gravity="center_vertical"
      android:layout_marginTop="6dp">

      <TextView
        android:id="@+id/txt_progress_label"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Tiến độ khung giờ"
        android:textSize="9sp"
        android:textColor="#B3FFFFFF"
        android:layout_marginEnd="6dp" />

      <ProgressBar
        android:id="@+id/progress_bar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="0dp"
        android:layout_height="5dp"
        android:layout_weight="1"
        android:max="100"
        android:progress="50"
        android:progressDrawable="@drawable/notein_progress_bar" />

      <TextView
        android:id="@+id/txt_progress_pct"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="50%"
        android:textSize="9sp"
        android:textStyle="bold"
        android:textColor="#F59E0B"
        android:layout_marginStart="6dp" />
    </LinearLayout>
  </LinearLayout>

  <!-- Calendar Mode Full Container (Today's events only) -->
  <LinearLayout
    android:id="@+id/calendar_container"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:visibility="gone">

    <TextView
      android:id="@+id/txt_empty_events"
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:gravity="center"
      android:paddingVertical="14dp"
      android:text="Chưa có sự kiện nào trong ngày này."
      android:textSize="12sp"
      android:textColor="#CCFFFFFF"
      android:background="@drawable/notein_inner_card_calendar"
      android:visibility="gone" />

    <LinearLayout
      android:id="@+id/event_row_1"
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:orientation="horizontal"
      android:gravity="center_vertical"
      android:paddingHorizontal="9dp"
      android:paddingVertical="6dp"
      android:background="@drawable/notein_inner_card_calendar">

      <TextView
        android:id="@+id/txt_event_1_time"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:paddingHorizontal="7dp"
        android:paddingVertical="4dp"
        android:text="15:00"
        android:textSize="11sp"
        android:textStyle="bold"
        android:textColor="#6EE7B7"
        android:background="@drawable/notein_badge_emerald"
        android:layout_marginEnd="8dp" />

      <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:orientation="vertical">

        <TextView
          android:id="@+id/txt_event_1_title"
          android:layout_width="match_parent"
          android:layout_height="wrap_content"
          android:text="Sự kiện 1"
          android:textSize="12sp"
          android:textStyle="bold"
          android:textColor="#FFFFFF"
          android:singleLine="true"
          android:ellipsize="end" />

        <TextView
          android:id="@+id/txt_event_1_note"
          android:layout_width="match_parent"
          android:layout_height="wrap_content"
          android:text="Ghi chú sự kiện 1"
          android:textSize="10sp"
          android:textColor="#CCFFFFFF"
          android:singleLine="true"
          android:ellipsize="end" />
      </LinearLayout>
    </LinearLayout>

    <LinearLayout
      android:id="@+id/event_row_2"
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:orientation="horizontal"
      android:gravity="center_vertical"
      android:paddingHorizontal="9dp"
      android:paddingVertical="6dp"
      android:layout_marginTop="5dp"
      android:background="@drawable/notein_inner_card_calendar">

      <TextView
        android:id="@+id/txt_event_2_time"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:paddingHorizontal="7dp"
        android:paddingVertical="4dp"
        android:text="20:00"
        android:textSize="11sp"
        android:textStyle="bold"
        android:textColor="#6EE7B7"
        android:background="@drawable/notein_badge_emerald"
        android:layout_marginEnd="8dp" />

      <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:orientation="vertical">

        <TextView
          android:id="@+id/txt_event_2_title"
          android:layout_width="match_parent"
          android:layout_height="wrap_content"
          android:text="Sự kiện 2"
          android:textSize="12sp"
          android:textStyle="bold"
          android:textColor="#FFFFFF"
          android:singleLine="true"
          android:ellipsize="end" />

        <TextView
          android:id="@+id/txt_event_2_note"
          android:layout_width="match_parent"
          android:layout_height="wrap_content"
          android:text="Ghi chú sự kiện 2"
          android:textSize="10sp"
          android:textColor="#CCFFFFFF"
          android:singleLine="true"
          android:ellipsize="end" />
      </LinearLayout>
    </LinearLayout>
  </LinearLayout>
</LinearLayout>
`;

const ANDROID_HELPER_KT = `package com.bonhiki1233.notein.lockscreen

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import com.bonhiki1233.notein.R
import org.json.JSONArray
import org.json.JSONObject

object NoteInLockScreenHelper {
  const val PREFS_NAME = "notein_lockscreen_prefs"
  const val KEY_PAYLOAD = "payload_json"
  const val KEY_ACTIVE_TAB = "active_tab"
  const val KEY_ENABLED = "widget_enabled"

  const val CHANNEL_ID = "notein-lockscreen-widget-v2"
  const val NOTIFICATION_ID = 29041

  const val ACTION_TAB_DAILY = "com.bonhiki1233.notein.ACTION_TAB_DAILY"
  const val ACTION_TAB_CALENDAR = "com.bonhiki1233.notein.ACTION_TAB_CALENDAR"
  const val ACTION_NOOP = "com.bonhiki1233.notein.ACTION_NOOP"

  fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val channel = NotificationChannel(
        CHANNEL_ID,
        "NoteIn Lock Screen Widget",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Interactive Lock Screen Schedule Widget (Daily & Desk Calendar)"
        setSound(null, null)
        enableVibration(false)
        setShowBadge(false)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }
      nm.createNotificationChannel(channel)
    }
  }

  private fun populateRemoteViews(
    context: Context,
    rv: RemoteViews,
    payload: JSONObject,
    activeTab: String,
    dailyPi: PendingIntent,
    calendarPi: PendingIntent,
    noopPi: PendingIntent,
    isExpanded: Boolean
  ) {
    val tabDailyLabel = payload.optString("tabDailyLabel", "Lịch Daily")
    val tabCalendarLabel = payload.optString("tabCalendarLabel", "Lịch Bàn")

    rv.setTextViewText(R.id.btn_tab_daily, "🕒 \$tabDailyLabel")
    rv.setTextViewText(R.id.btn_tab_calendar, "📅 \$tabCalendarLabel")

    val isCalendar = activeTab == "calendar"
    if (!isCalendar) {
      rv.setInt(R.id.btn_tab_daily, "setBackgroundResource", R.drawable.notein_tab_daily_active)
      rv.setTextColor(R.id.btn_tab_daily, Color.BLACK)
      rv.setInt(R.id.btn_tab_calendar, "setBackgroundResource", R.drawable.notein_tab_inactive)
      rv.setTextColor(R.id.btn_tab_calendar, Color.WHITE)
    } else {
      rv.setInt(R.id.btn_tab_daily, "setBackgroundResource", R.drawable.notein_tab_inactive)
      rv.setTextColor(R.id.btn_tab_daily, Color.WHITE)
      rv.setInt(R.id.btn_tab_calendar, "setBackgroundResource", R.drawable.notein_tab_calendar_active)
      rv.setTextColor(R.id.btn_tab_calendar, Color.BLACK)
    }

    rv.setOnClickPendingIntent(R.id.btn_tab_daily, dailyPi)
    rv.setOnClickPendingIntent(R.id.btn_tab_calendar, calendarPi)
    rv.setOnClickPendingIntent(R.id.widget_root, noopPi)

    if (!isCalendar) {
      rv.setViewVisibility(R.id.daily_container, View.VISIBLE)
      rv.setViewVisibility(R.id.calendar_container, View.GONE)

      val currentBadge = payload.optString("currentBadge", "ĐANG DIỄN RA")
      val currentTimeRange = payload.optString("currentTimeRange", "--:--")
      val currentTitle = payload.optString("currentTitle", "")
      val currentNote = payload.optString("currentNote", "")
      val progressLabel = payload.optString("progressLabel", "Tiến độ")
      val progressPct = payload.optInt("progressPct", 0).coerceIn(0, 100)

      rv.setTextViewText(R.id.txt_current_badge, "⚡ \$currentBadge")
      rv.setTextViewText(R.id.txt_current_time, currentTimeRange)
      rv.setTextViewText(R.id.txt_current_title, currentTitle)

      if (isExpanded && currentNote.isNotEmpty()) {
        rv.setTextViewText(R.id.txt_current_note, currentNote)
        rv.setViewVisibility(R.id.txt_current_note, View.VISIBLE)
      } else {
        rv.setViewVisibility(R.id.txt_current_note, View.GONE)
      }

      rv.setTextViewText(R.id.txt_progress_label, progressLabel)
      rv.setProgressBar(R.id.progress_bar, 100, progressPct, false)
      rv.setTextViewText(R.id.txt_progress_pct, "\$progressPct%")
    } else {
      rv.setViewVisibility(R.id.daily_container, View.GONE)
      rv.setViewVisibility(R.id.calendar_container, View.VISIBLE)

      val emptyHint = payload.optString("emptyEventsHint", "Chưa có sự kiện nào trong ngày này.")
      val events: JSONArray = payload.optJSONArray("calendarEvents") ?: JSONArray()

      if (events.length() == 0) {
        rv.setTextViewText(R.id.txt_empty_events, emptyHint)
        rv.setViewVisibility(R.id.txt_empty_events, View.VISIBLE)
        rv.setViewVisibility(R.id.event_row_1, View.GONE)
        rv.setViewVisibility(R.id.event_row_2, View.GONE)
      } else {
        rv.setViewVisibility(R.id.txt_empty_events, View.GONE)

        val ev1 = events.optJSONObject(0)
        if (ev1 != null) {
          rv.setViewVisibility(R.id.event_row_1, View.VISIBLE)
          rv.setTextViewText(R.id.txt_event_1_time, ev1.optString("time", ""))
          rv.setTextViewText(R.id.txt_event_1_title, ev1.optString("title", ""))
          val note1 = ev1.optString("note", "")
          if (isExpanded && note1.isNotEmpty()) {
            rv.setTextViewText(R.id.txt_event_1_note, note1)
            rv.setViewVisibility(R.id.txt_event_1_note, View.VISIBLE)
          } else {
            rv.setViewVisibility(R.id.txt_event_1_note, View.GONE)
          }
        } else {
          rv.setViewVisibility(R.id.event_row_1, View.GONE)
        }

        val ev2 = events.optJSONObject(1)
        if (ev2 != null) {
          rv.setViewVisibility(R.id.event_row_2, View.VISIBLE)
          rv.setTextViewText(R.id.txt_event_2_time, ev2.optString("time", ""))
          rv.setTextViewText(R.id.txt_event_2_title, ev2.optString("title", ""))
          val note2 = ev2.optString("note", "")
          if (isExpanded && note2.isNotEmpty()) {
            rv.setTextViewText(R.id.txt_event_2_note, note2)
            rv.setViewVisibility(R.id.txt_event_2_note, View.VISIBLE)
          } else {
            rv.setViewVisibility(R.id.txt_event_2_note, View.GONE)
          }
        } else {
          rv.setViewVisibility(R.id.event_row_2, View.GONE)
        }
      }
    }
  }

  fun showOrUpdateWidget(context: Context, payloadJson: String, tabOverride: String? = null): Boolean {
    try {
      ensureChannel(context)
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val activeTab = tabOverride ?: prefs.getString(KEY_ACTIVE_TAB, "daily") ?: "daily"

      prefs.edit()
        .putString(KEY_PAYLOAD, payloadJson)
        .putString(KEY_ACTIVE_TAB, activeTab)
        .putBoolean(KEY_ENABLED, true)
        .apply()

      val payload = JSONObject(payloadJson)
      val pkg = context.packageName

      val dailyIntent = Intent(context, NoteInLockScreenReceiver::class.java).apply {
        action = ACTION_TAB_DAILY
      }
      val calendarIntent = Intent(context, NoteInLockScreenReceiver::class.java).apply {
        action = ACTION_TAB_CALENDAR
      }
      val noopIntent = Intent(context, NoteInLockScreenReceiver::class.java).apply {
        action = ACTION_NOOP
      }

      val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      val dailyPi = PendingIntent.getBroadcast(context, 101, dailyIntent, flags)
      val calendarPi = PendingIntent.getBroadcast(context, 102, calendarIntent, flags)
      val noopPi = PendingIntent.getBroadcast(context, 103, noopIntent, flags)

      val collapsedViews = RemoteViews(pkg, R.layout.notein_lock_widget_collapsed)
      val expandedViews = RemoteViews(pkg, R.layout.notein_lock_widget_expanded)

      populateRemoteViews(context, collapsedViews, payload, activeTab, dailyPi, calendarPi, noopPi, false)
      populateRemoteViews(context, expandedViews, payload, activeTab, dailyPi, calendarPi, noopPi, true)

      val currentTitle = payload.optString("currentTitle", "NoteIn")
      val currentTimeRange = payload.optString("currentTimeRange", "")

      val notification = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle(currentTitle)
        .setContentText(currentTimeRange)
        .setCustomContentView(collapsedViews)
        .setCustomBigContentView(expandedViews)
        .setCustomHeadsUpContentView(expandedViews)
        .setContentIntent(noopPi)
        .setOngoing(true)
        .setAutoCancel(false)
        .setOnlyAlertOnce(true)
        .setSilent(true)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setPriority(NotificationCompat.PRIORITY_MAX)
        .setCategory(NotificationCompat.CATEGORY_SERVICE)
        .build()

      val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      nm.notify(NOTIFICATION_ID, notification)
      return true
    } catch (e: Exception) {
      e.printStackTrace()
      return false
    }
  }

  fun dismissWidget(context: Context) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit().putBoolean(KEY_ENABLED, false).apply()
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.cancel(NOTIFICATION_ID)
  }

  fun isWidgetActive(context: Context): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      return nm.activeNotifications.any { it.id == NOTIFICATION_ID }
    }
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    return prefs.getBoolean(KEY_ENABLED, false)
  }
}
`;

const ANDROID_RECEIVER_KT = `package com.bonhiki1233.notein.lockscreen

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class NoteInLockScreenReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    val prefs = context.getSharedPreferences(NoteInLockScreenHelper.PREFS_NAME, Context.MODE_PRIVATE)
    val payloadJson = prefs.getString(NoteInLockScreenHelper.KEY_PAYLOAD, null) ?: return

    when (action) {
      NoteInLockScreenHelper.ACTION_TAB_DAILY -> {
        NoteInLockScreenHelper.showOrUpdateWidget(context, payloadJson, "daily")
      }
      NoteInLockScreenHelper.ACTION_TAB_CALENDAR -> {
        NoteInLockScreenHelper.showOrUpdateWidget(context, payloadJson, "calendar")
      }
      NoteInLockScreenHelper.ACTION_NOOP -> {
        // Absorb stray tap on Lock Screen widget so app does not open
      }
    }
  }
}
`;

const ANDROID_MODULE_KT = `package com.bonhiki1233.notein.lockscreen

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NoteInLockScreenModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "NoteInLockScreen"

  @ReactMethod
  fun startOrUpdateLiveActivity(payloadJson: String, promise: Promise) {
    val ok = NoteInLockScreenHelper.showOrUpdateWidget(reactApplicationContext, payloadJson, null)
    promise.resolve(ok)
  }

  @ReactMethod
  fun stopLiveActivity(promise: Promise) {
    NoteInLockScreenHelper.dismissWidget(reactApplicationContext)
    promise.resolve(true)
  }

  @ReactMethod
  fun isLiveActivityActive(promise: Promise) {
    val active = NoteInLockScreenHelper.isWidgetActive(reactApplicationContext)
    promise.resolve(active)
  }
}
`;

const ANDROID_PACKAGE_KT = `package com.bonhiki1233.notein.lockscreen

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class NoteInLockScreenPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(NoteInLockScreenModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
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

  // Android Custom Interactive Lock Screen Widget (RemoteViews + BroadcastReceiver)
  config = withDangerousMod(config, [
    'android',
    async (mod) => {
      const androidRoot = mod.modRequest.platformProjectRoot;
      const mainDir = path.join(androidRoot, 'app', 'src', 'main');
      const resDrawableDir = path.join(mainDir, 'res', 'drawable');
      const resLayoutDir = path.join(mainDir, 'res', 'layout');
      const ktPkgDir = path.join(
        mainDir,
        'java',
        'com',
        'bonhiki1233',
        'notein',
        'lockscreen',
      );

      fs.mkdirSync(resDrawableDir, { recursive: true });
      fs.mkdirSync(resLayoutDir, { recursive: true });
      fs.mkdirSync(ktPkgDir, { recursive: true });

      Object.entries(ANDROID_DRAWABLES).forEach(([fileName, xmlContent]) => {
        fs.writeFileSync(path.join(resDrawableDir, fileName), xmlContent);
      });

      fs.writeFileSync(
        path.join(resLayoutDir, 'notein_lock_widget_collapsed.xml'),
        ANDROID_LAYOUT_COLLAPSED,
      );
      fs.writeFileSync(
        path.join(resLayoutDir, 'notein_lock_widget_expanded.xml'),
        ANDROID_LAYOUT_EXPANDED,
      );

      fs.writeFileSync(path.join(ktPkgDir, 'NoteInLockScreenHelper.kt'), ANDROID_HELPER_KT);
      fs.writeFileSync(path.join(ktPkgDir, 'NoteInLockScreenReceiver.kt'), ANDROID_RECEIVER_KT);
      fs.writeFileSync(path.join(ktPkgDir, 'NoteInLockScreenModule.kt'), ANDROID_MODULE_KT);
      fs.writeFileSync(path.join(ktPkgDir, 'NoteInLockScreenPackage.kt'), ANDROID_PACKAGE_KT);

      // Register POST_NOTIFICATIONS and NoteInLockScreenReceiver in AndroidManifest.xml
      const manifestPath = path.join(mainDir, 'AndroidManifest.xml');
      if (fs.existsSync(manifestPath)) {
        let manifest = fs.readFileSync(manifestPath, 'utf8');
        if (!manifest.includes('android.permission.POST_NOTIFICATIONS')) {
          manifest = manifest.replace(
            '<uses-permission android:name="android.permission.INTERNET"/>',
            '<uses-permission android:name="android.permission.INTERNET"/>\n  <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>',
          );
        }
        if (!manifest.includes('NoteInLockScreenReceiver')) {
          manifest = manifest.replace(
            '</application>',
            `    <receiver android:name=".lockscreen.NoteInLockScreenReceiver" android:exported="false">
      <intent-filter>
        <action android:name="com.bonhiki1233.notein.ACTION_TAB_DAILY"/>
        <action android:name="com.bonhiki1233.notein.ACTION_TAB_CALENDAR"/>
        <action android:name="com.bonhiki1233.notein.ACTION_NOOP"/>
      </intent-filter>
    </receiver>\n  </application>`,
          );
        }
        fs.writeFileSync(manifestPath, manifest);
      }

      // Register NoteInLockScreenPackage in MainApplication.kt
      const mainAppPath = path.join(
        mainDir,
        'java',
        'com',
        'bonhiki1233',
        'notein',
        'MainApplication.kt',
      );
      if (fs.existsSync(mainAppPath)) {
        let mainApp = fs.readFileSync(mainAppPath, 'utf8');
        if (!mainApp.includes('NoteInLockScreenPackage')) {
          mainApp = mainApp.replace(
            'package com.bonhiki1233.notein',
            'package com.bonhiki1233.notein\n\nimport com.bonhiki1233.notein.lockscreen.NoteInLockScreenPackage',
          );
          mainApp = mainApp.replace(
            'PackageList(this).packages.apply {',
            'PackageList(this).packages.apply {\n          add(NoteInLockScreenPackage())',
          );
          fs.writeFileSync(mainAppPath, mainApp);
        }
      }

      return mod;
    },
  ]);

  return config;
};
