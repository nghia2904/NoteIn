import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useScheduleStore } from '../../store/scheduleStore';
import { useWebWorkspaceStore } from '../../store/webWorkspaceStore';
import type { TimelineItem } from '../../types/schedule';
import { DailyTab } from '../DailyTab';
import { OtherTab } from '../OtherTab';
import { WebDashboardTab, type WebTabId } from './WebDashboardTab';
import { WebFinanceTab } from './WebFinanceTab';
import { WebProjectTab } from './WebProjectTab';
import { WebQuickNoteTab } from './WebQuickNoteTab';
import { WebReminderTab } from './WebReminderTab';
import { WebTasksTab } from './WebTasksTab';

interface WebWorkspaceProps {
  now: Date;
  timeline: TimelineItem[];
  onToggleDailyDone: (item: TimelineItem) => void;
  onDataChange: () => void;
}

export function WebWorkspace({
  now,
  timeline,
  onToggleDailyDone,
  onDataChange,
}: WebWorkspaceProps) {
  const { language, theme, setTheme } = useScheduleStore();
  const { addQuickNote } = useWebWorkspaceStore();

  const isDark = theme === 'dark';
  const isVi = language === 'vi';

  const [activeTab, setActiveTab] = useState<WebTabId>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sidebarQuickNote, setSidebarQuickNote] = useState('');
  const [savedToast, setSavedToast] = useState(false);

  const handleNavigateTab = (tab: WebTabId, projectId?: string) => {
    if (projectId !== undefined) {
      setSelectedProjectId(projectId);
    } else if (tab !== 'project') {
      setSelectedProjectId(null);
    }
    setActiveTab(tab);
  };

  const handleSaveSidebarQuickNote = () => {
    const text = sidebarQuickNote.trim();
    if (!text) return;
    const firstLine = text.split('\n')[0]?.slice(0, 45) || 'Ghi chú nhanh';
    addQuickNote({
      title: firstLine,
      content: text,
      folder: 'all',
    });
    setSidebarQuickNote('');
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const navItems: { id: WebTabId; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'tasks', icon: '👤', label: isVi ? 'Công việc' : 'Tasks' },
    { id: 'reminder', icon: '🔔', label: 'Reminder' },
    { id: 'finance', icon: '💲', label: 'Finance' },
    { id: 'quicknote', icon: '📄', label: 'Quick Note' },
    { id: 'project', icon: '🧩', label: 'Project' },
  ];

  return (
    <View style={[styles.desktopRoot, isDark ? styles.desktopRootDark : styles.desktopRootLight]}>
      {/* LEFT SIDEBAR (Forest / Notion Style) */}
      <View style={[styles.sidebar, isDark && styles.sidebarDark]}>
        {/* Brand Logo Header */}
        <Pressable
          onPress={() => handleNavigateTab('dashboard')}
          style={styles.brandRow}
        >
          <View style={[styles.brandIconGrid, isDark && styles.brandIconGridDark]}>
            <Text style={[styles.brandIconSymbols, isDark && styles.textDark]}>
              ■▲{'\n'}●◆
            </Text>
          </View>
          <Text style={[styles.brandTitle, isDark && styles.textDark]}>NoteIn</Text>
        </Pressable>

        {/* WORKSPACE Section */}
        <Text style={styles.sectionHeader}>WORKSPACE</Text>

        <View style={styles.navList}>
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (item.id === 'project') setSelectedProjectId(null);
                  setActiveTab(item.id);
                }}
                style={[
                  styles.navItem,
                  active && (isDark ? styles.navItemActiveDark : styles.navItemActive),
                ]}
              >
                <View style={[styles.navIconCircle, active && styles.navIconCircleActive]}>
                  <Text style={styles.navIconText}>{item.icon}</Text>
                </View>
                <Text
                  style={[
                    styles.navLabel,
                    isDark && styles.subTextDark,
                    active && (isDark ? styles.navLabelActiveDark : styles.navLabelActive),
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}

          {/* Theme Switcher Button right in Sidebar ("Màu & kính") */}
          <Pressable
            onPress={() => setTheme(isDark ? 'light' : 'dark')}
            style={styles.navItem}
          >
            <View style={styles.navIconCircle}>
              <Text style={styles.navIconText}>🌗</Text>
            </View>
            <Text style={[styles.navLabel, isDark && styles.subTextDark]}>
              {isVi
                ? isDark
                  ? 'Màu & kính (Tối)'
                  : 'Màu & kính (Sáng)'
                : isDark
                  ? 'Theme (Dark)'
                  : 'Theme (Light)'}
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />

        {/* Bottom Utility Links: Cài đặt */}
        <View style={styles.bottomLinks}>
          <Pressable
            onPress={() => setActiveTab('settings')}
            style={[
              styles.navItem,
              activeTab === 'settings' &&
                (isDark ? styles.navItemActiveDark : styles.navItemActive),
            ]}
          >
            <View style={styles.navIconCircle}>
              <Text style={styles.navIconText}>⚙️</Text>
            </View>
            <Text
              style={[
                styles.navLabel,
                isDark && styles.subTextDark,
                activeTab === 'settings' &&
                  (isDark ? styles.navLabelActiveDark : styles.navLabelActive),
              ]}
            >
              {isVi ? 'Cài đặt' : 'Settings'}
            </Text>
          </Pressable>
        </View>

        {/* Bottom-Left Embedded QUICK NOTE Box matching all 3 screenshots */}
        <View style={[styles.quickNoteBox, isDark && styles.quickNoteBoxDark]}>
          <View style={styles.quickNoteHeader}>
            <Text style={styles.quickNoteLabel}>QUICK NOTE</Text>
            <Pressable onPress={handleSaveSidebarQuickNote}>
              <Text style={styles.quickNoteSaveBtn}>
                {savedToast
                  ? isVi
                    ? '✓ Đã lưu'
                    : '✓ Saved'
                  : isVi
                    ? '↵ Lưu'
                    : '↵ Save'}
              </Text>
            </Pressable>
          </View>
          <TextInput
            value={sidebarQuickNote}
            onChangeText={setSidebarQuickNote}
            placeholder={
              isVi ? 'Đang nghĩ gì? Gõ ở đây...' : 'What’s on your mind? Type here...'
            }
            placeholderTextColor="#9ca3af"
            multiline
            style={[styles.quickNoteInput, isDark && styles.quickNoteInputDark]}
          />
        </View>
      </View>

      {/* MAIN CONTENT WORKSPACE AREA */}
      <View style={styles.mainContent}>
        {activeTab === 'dashboard' && (
          <WebDashboardTab
            now={now}
            timeline={timeline}
            onToggleDailyDone={onToggleDailyDone}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {activeTab === 'tasks' && (
          <WebTasksTab now={now} onDataChange={onDataChange} />
        )}

        {activeTab === 'reminder' && (
          <WebReminderTab
            now={now}
            timeline={timeline}
            onToggleDone={onToggleDailyDone}
            onDataChange={onDataChange}
          />
        )}

        {activeTab === 'finance' && <WebFinanceTab now={now} />}

        {activeTab === 'quicknote' && <WebQuickNoteTab />}

        {activeTab === 'project' && (
          <WebProjectTab initialProjectId={selectedProjectId} />
        )}

        {activeTab === 'settings' && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.centeredDesktopTabWrap}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.desktopReminderContainer}>
              <OtherTab
                timeline={timeline}
                onSyncOS={() => {}}
                onOpenAddDaily={() => setActiveTab('reminder')}
                androidNotificationEnabled={false}
                onToggleAndroidNotification={() => {}}
              />
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopRootLight: {
    backgroundColor: '#f2f1ec',
  },
  desktopRootDark: {
    backgroundColor: '#0b1120',
  },
  sidebar: {
    width: 220,
    backgroundColor: '#fbfaf7',
    borderRightWidth: 1,
    borderRightColor: '#e5e4de',
    paddingHorizontal: 14,
    paddingTop: 22,
    paddingBottom: 16,
  },
  sidebarDark: {
    backgroundColor: '#0f172a',
    borderRightColor: '#1e293b',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    marginBottom: 24,
  },
  brandIconGrid: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconGridDark: {
    backgroundColor: '#1e293b',
  },
  brandIconSymbols: {
    fontSize: 10,
    lineHeight: 11,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 1,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.6,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9ca3af',
    letterSpacing: 1.2,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  navList: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 11,
  },
  navItemActive: {
    backgroundColor: '#18181b',
  },
  navItemActiveDark: {
    backgroundColor: '#f8fafc',
  },
  navIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconCircleActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  navIconText: {
    fontSize: 13,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3f3f46',
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  navLabelActiveDark: {
    color: '#0f172a',
    fontWeight: '800',
  },
  bottomLinks: {
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#ecebe6',
    paddingTop: 8,
  },
  quickNoteBox: {
    backgroundColor: '#f3f2ed',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e4de',
    gap: 6,
  },
  quickNoteBoxDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  quickNoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickNoteLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#71717a',
    letterSpacing: 0.8,
  },
  quickNoteSaveBtn: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },
  quickNoteInput: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 62,
    fontSize: 11,
    color: '#18181b',
    textAlignVertical: 'top',
  },
  quickNoteInputDark: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
  },
  mainContent: {
    flex: 1,
  },
  centeredDesktopTabWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  desktopReminderContainer: {
    width: '100%',
    maxWidth: 880,
  },
  textDark: {
    color: '#f8fafc',
  },
  subTextDark: {
    color: '#94a3b8',
  },
});
