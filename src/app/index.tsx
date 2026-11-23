import { format } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTimeline, setCompleted } from '../api/schedule.api';
import { BottomTabBar, type MainTab } from '../components/BottomTabBar';
import { CalendarTab } from '../components/CalendarTab';
import { DailyTab } from '../components/DailyTab';
import { OtherTab } from '../components/OtherTab';
import { PeriodicTab } from '../components/PeriodicTab';
import { WebWorkspace } from '../components/web/WebWorkspace';
import { useNow } from '../hooks/useNow';
import { translations } from '../i18n/translations';
import {
  clearAllNotifications,
  syncLiveActivityToOSLockScreen,
} from '../services/lockScreenSync';
import {
  disableAndroidScheduleNotification,
  enableAndroidScheduleNotification,
  isAndroidScheduleNotificationActive,
  syncAndroidScheduleNotification,
} from '../services/androidScheduleNotification';
import { useScheduleStore } from '../store/scheduleStore';
import type { TimelineItem } from '../types/schedule';

export default function HomeScreen() {
  const now = useNow();
  const { language, theme, dailies, events, completions } = useScheduleStore();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<MainTab>('daily');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [openAddDailyRequest, setOpenAddDailyRequest] = useState(false);
  const [androidNotificationEnabled, setAndroidNotificationEnabled] =
    useState(false);

  const dateKey = format(now, 'yyyy-MM-dd');

  const reload = useCallback(async () => {
    const items = await getTimeline(dateKey);
    setTimeline(items);
  }, [dateKey, dailies, events, completions]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Clear all legacy push notifications on mount & sync live state to real iOS Lock Screen Live Activity
  useEffect(() => {
    clearAllNotifications().catch((error) => {
      console.warn('Failed to clear legacy iOS notifications:', error);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let active = true;
    enableAndroidScheduleNotification(
      dailies,
      events,
      completions,
      new Date(),
      language,
    )
      .then((enabled) => {
        if (active) setAndroidNotificationEnabled(enabled);
      })
      .catch((error) => {
        console.warn('Failed to enable Android Lock Screen widget:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || !androidNotificationEnabled) return;

    syncAndroidScheduleNotification(
      dailies,
      events,
      completions,
      now,
      language,
    )
      .then((status) => {
        if (status === 'dismissed') setAndroidNotificationEnabled(false);
      })
      .catch((error) => {
        console.warn('Failed to update Android schedule notification:', error);
      });
  }, [
    androidNotificationEnabled,
    dailies,
    events,
    completions,
    now,
    language,
  ]);

  useEffect(() => {
    syncLiveActivityToOSLockScreen(dailies, events, completions, now, language);
  }, [dailies, events, completions, now, language]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      syncLiveActivityToOSLockScreen(dailies, events, completions, new Date(), language);
      if (Platform.OS === 'android' && nextState === 'active' && androidNotificationEnabled) {
        syncAndroidScheduleNotification(
          dailies,
          events,
          completions,
          new Date(),
          language,
        )
          .then((status) => {
            if (status === 'dismissed') setAndroidNotificationEnabled(false);
          })
          .catch((error) => {
            console.warn('Failed to refresh Android schedule notification:', error);
          });
      }
    });
    return () => sub.remove();
  }, [dailies, events, completions, language, androidNotificationEnabled]);

  const handleToggleDone = async (item: TimelineItem) => {
    if (item.source !== 'daily') return;
    await setCompleted(item.refId, item.date, !item.done);
    const updated = await getTimeline(dateKey);
    setTimeline(updated);
  };

  const handleManualSyncOS = async () => {
    await syncLiveActivityToOSLockScreen(dailies, events, completions, now, language);
    Alert.alert(
      'NoteIn',
      language === 'vi'
        ? 'Đã đồng bộ dữ liệu ra Widget Màn hình khóa iOS! Hãy nhấn Cmd + L để khóa máy và xem trên Màn hình khóa.'
        : 'Synced to iOS Lock Screen Live Activity! Press Cmd + L to lock the device and view on the Lock Screen.',
    );
  };

  const handleToggleAndroidNotification = async () => {
    try {
      if (androidNotificationEnabled) {
        await disableAndroidScheduleNotification();
        setAndroidNotificationEnabled(false);
        return;
      }

      const enabled = await enableAndroidScheduleNotification(
        dailies,
        events,
        completions,
        now,
        language,
      );
      setAndroidNotificationEnabled(enabled);
      if (!enabled) {
        Alert.alert('NoteIn', translations[language].androidSchedulePermissionDenied);
      }
    } catch (error) {
      console.warn('Failed to change Android notification state:', error);
      Alert.alert('NoteIn', translations[language].androidNotificationError);
    }
  };

  const handleManageDailiesFromOther = () => {
    setActiveTab('daily');
    setOpenAddDailyRequest(true);
  };

  if (Platform.OS === 'web') {
    return (
      <WebWorkspace
        now={now}
        timeline={timeline}
        onToggleDailyDone={handleToggleDone}
        onDataChange={reload}
      />
    );
  }

  return (
    <View style={[styles.root, isDark ? styles.rootDark : styles.rootLight]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.contentArea}>
          {activeTab === 'daily' && (
            <DailyTab
              now={now}
              timeline={timeline}
              onToggleDone={handleToggleDone}
              onDataChange={reload}
              externalEditorOpen={openAddDailyRequest}
              onExternalEditorHandled={() => setOpenAddDailyRequest(false)}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarTab now={now} onDataChange={reload} />
          )}

          {activeTab === 'periodic' && <PeriodicTab />}

          {activeTab === 'other' && (
            <OtherTab
              timeline={timeline}
              onSyncOS={handleManualSyncOS}
              onOpenAddDaily={handleManageDailiesFromOther}
              androidNotificationEnabled={androidNotificationEnabled}
              onToggleAndroidNotification={handleToggleAndroidNotification}
            />
          )}
        </View>

        {/* 3-Tab Floating Bottom Navigation Bar: Lịch ngày, Lịch bàn, Other */}
        <BottomTabBar activeTab={activeTab} onChangeTab={setActiveTab} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootLight: {
    backgroundColor: '#f5f5f7',
  },
  rootDark: {
    backgroundColor: '#0b1120',
  },
  safeArea: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
});
