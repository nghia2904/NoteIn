import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { translations } from '../i18n/translations';
import { useScheduleStore } from '../store/scheduleStore';
import type { TimelineItem } from '../types/schedule';

interface OtherTabProps {
  timeline: TimelineItem[];
  onSyncOS: () => void;
  onOpenAddDaily: () => void;
}

export function OtherTab({
  timeline,
  onSyncOS,
  onOpenAddDaily,
}: OtherTabProps) {
  const {
    language,
    theme,
    dailies,
    events,
    setLanguage,
    setTheme,
    resetDemoData,
  } = useScheduleStore();

  const [helpVisible, setHelpVisible] = useState(false);

  const t = translations[language];
  const isDark = theme === 'dark';

  const dailyItemsToday = timeline.filter((item) => item.source === 'daily');
  const completedCount = dailyItemsToday.filter((item) => item.done).length;
  const completionPct =
    dailyItemsToday.length > 0
      ? Math.round((completedCount / dailyItemsToday.length) * 100)
      : 0;

  const totalDailyMinutes = dailies
    .filter((d) => d.isActive)
    .reduce((acc, item) => acc + item.durationMin, 0);
  const totalDailyHours = (totalDailyMinutes / 60).toFixed(1);

  const handleReset = () => {
    resetDemoData();
    Alert.alert('NoteIn', t.resetConfirmMsg);
  };

  return (
    <View style={styles.container}>
      {/* Top Header matching reference image */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeftSpacer} />
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>{t.otherTitle}</Text>
        <Pressable
          onPress={() => setHelpVisible(true)}
          style={[styles.helpButton, isDark && styles.helpButtonDark]}
        >
          <Text style={[styles.helpButtonText, isDark && styles.textDark]}>{t.helpBtn}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Group 1: Language & General */}
        <Text style={[styles.groupLabel, isDark && styles.subTextDark]}>
          {t.sectionGeneral}
        </Text>
        <View style={[styles.groupCard, isDark && styles.groupCardDark]}>
          <Pressable onPress={() => setLanguage('vi')} style={styles.row}>
            <View style={styles.iconBox}>
              <Text style={styles.orangeIcon}>⚙</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                {t.settingLanguage}: {t.langVietnamese}
              </Text>
            </View>
            {language === 'vi' ? (
              <Text style={styles.checkIcon}>✓</Text>
            ) : (
              <Text style={styles.chevron}>›</Text>
            )}
          </Pressable>

          <View style={[styles.divider, isDark && styles.dividerDark]} />

          <Pressable onPress={() => setLanguage('en')} style={styles.row}>
            <View style={styles.iconBox}>
              <Text style={styles.orangeIcon}>🌐</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                {t.settingLanguage}: {t.langEnglish}
              </Text>
            </View>
            {language === 'en' ? (
              <Text style={styles.checkIcon}>✓</Text>
            ) : (
              <Text style={styles.chevron}>›</Text>
            )}
          </Pressable>
        </View>

        {/* Group 2: Real iOS Lock Screen Live Activity Sync */}
        <Text style={[styles.groupLabel, isDark && styles.subTextDark]}>
          {t.sectionLockScreen}
        </Text>
        <View style={[styles.groupCard, isDark && styles.groupCardDark]}>
          <Pressable onPress={onSyncOS} style={styles.row}>
            <View style={styles.iconBox}>
              <Text style={styles.orangeIcon}>📱</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                {language === 'vi'
                  ? 'Cập nhật Widget Màn hình khóa iOS'
                  : 'Sync iOS Lock Screen Live Activity'}
              </Text>
              <Text style={[styles.rowSub, isDark && styles.subTextDark]}>
                {language === 'vi'
                  ? 'Hiển thị Lịch Daily / Lịch Bàn trong suốt ngay dưới đồng hồ khóa'
                  : 'Display transparent Daily / Desk Calendar below Lock Screen clock'}
              </Text>
            </View>
            <Text style={styles.checkIcon}>✓</Text>
          </Pressable>
        </View>

        {/* Group 3: Appearance & Data */}
        <Text style={[styles.groupLabel, isDark && styles.subTextDark]}>
          {t.sectionAppearance}
        </Text>
        <View style={[styles.groupCard, isDark && styles.groupCardDark]}>
          <Pressable
            onPress={() => setTheme(isDark ? 'light' : 'dark')}
            style={styles.row}
          >
            <View style={styles.iconBox}>
              <Text style={styles.orangeIcon}>🎨</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                {t.settingTheme}
              </Text>
              <Text style={[styles.rowSub, isDark && styles.subTextDark]}>
                {isDark ? t.themeDark : t.themeLight}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <View style={[styles.divider, isDark && styles.dividerDark]} />

          <Pressable onPress={onOpenAddDaily} style={styles.row}>
            <View style={styles.iconBox}>
              <Text style={styles.orangeIcon}>📋</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                {t.settingManageDailies}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <View style={[styles.divider, isDark && styles.dividerDark]} />

          <Pressable onPress={handleReset} style={styles.row}>
            <View style={styles.iconBox}>
              <Text style={styles.orangeIcon}>↺</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                {t.settingResetData}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        {/* Group 4: Reports & Statistics */}
        <Text style={[styles.groupLabel, isDark && styles.subTextDark]}>
          {t.sectionReports}
        </Text>
        <View style={[styles.groupCard, isDark && styles.groupCardDark]}>
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Text style={styles.orangeIcon}>📊</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                {t.reportDailyCompletion}
              </Text>
              <Text style={[styles.rowSub, isDark && styles.subTextDark]}>
                {completedCount}/{dailyItemsToday.length} {t.tasksCompletedUnit} ({completionPct}%)
              </Text>
            </View>
            <Text style={styles.badgeValue}>{completionPct}%</Text>
          </View>

          <View style={[styles.divider, isDark && styles.dividerDark]} />

          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Text style={styles.orangeIcon}>◔</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                {t.reportDailyHours}
              </Text>
            </View>
            <Text style={styles.badgeValue}>
              {totalDailyHours} {t.hoursUnit}
            </Text>
          </View>

          <View style={[styles.divider, isDark && styles.dividerDark]} />

          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Text style={styles.orangeIcon}>🗓</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, isDark && styles.textDark]}>
                {language === 'vi' ? 'Tổng sự kiện Lịch Bàn' : 'Total Desk Calendar Events'}
              </Text>
            </View>
            <Text style={styles.badgeValue}>
              {events.length} {t.eventsUnit}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Help Modal */}
      <Modal visible={helpVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isDark && styles.groupCardDark]}>
            <Text style={[styles.modalTitle, isDark && styles.textDark]}>
              {t.helpModalTitle}
            </Text>
            <Text style={[styles.modalBody, isDark && styles.subTextDark]}>
              {t.helpModalBody}
            </Text>
            <Pressable
              onPress={() => setHelpVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseText}>{t.closeBtn}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerLeftSpacer: {
    width: 68,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  helpButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  helpButtonDark: {
    backgroundColor: '#1e293b',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  helpButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 115,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  groupCardDark: {
    backgroundColor: '#1e293b',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  iconBox: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orangeIcon: {
    fontSize: 19,
    color: '#f27821',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  rowSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  chevron: {
    fontSize: 22,
    color: '#94a3b8',
    marginLeft: 8,
    fontWeight: '400',
  },
  checkIcon: {
    fontSize: 18,
    color: '#f27821',
    fontWeight: '800',
    marginLeft: 8,
  },
  badgeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f27821',
    marginLeft: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
    marginLeft: 44,
  },
  dividerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  textDark: {
    color: '#f8fafc',
  },
  subTextDark: {
    color: '#94a3b8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    marginBottom: 18,
  },
  modalCloseBtn: {
    backgroundColor: '#f27821',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
