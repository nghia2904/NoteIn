import { format } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTimeline, setCompleted } from '../api/schedule.api';
import { BottomTabBar, type MainTab } from '../components/BottomTabBar';
import { CalendarTab } from '../components/CalendarTab';
import { DailyTab } from '../components/DailyTab';
import { OtherTab } from '../components/OtherTab';
import { useNow } from '../hooks/useNow';
import {
  clearAllNotifications,
  syncLiveActivityToOSLockScreen,
} from '../services/lockScreenSync';
import { useScheduleStore } from '../store/scheduleStore';
import type { TimelineItem } from '../types/schedule';

export default function HomeScreen() {
  const now = useNow();
  const { language, theme, dailies, events, completions } = useScheduleStore();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<MainTab>('daily');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [openAddDailyRequest, setOpenAddDailyRequest] = useState(false);

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
    clearAllNotifications();
  }, []);

  useEffect(() => {
    syncLiveActivityToOSLockScreen(dailies, events, completions, now, language);
  }, [dailies, events, completions, now, language]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', () => {
      syncLiveActivityToOSLockScreen(dailies, events, completions, new Date(), language);
    });
    return () => sub.remove();
  }, [dailies, events, completions, language]);

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

  const handleManageDailiesFromOther = () => {
    setActiveTab('daily');
    setOpenAddDailyRequest(true);
  };

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

          {activeTab === 'other' && (
            <OtherTab
              timeline={timeline}
              onSyncOS={handleManualSyncOS}
              onOpenAddDaily={handleManageDailiesFromOther}
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
