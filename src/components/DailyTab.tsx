import { format } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { deleteDaily, saveDaily } from '../api/schedule.api';
import { findFreeTimeSuggestions, getCurrentState } from '../engine/schedule';
import { type Language, translations } from '../i18n/translations';
import { useScheduleStore } from '../store/scheduleStore';
import type { DailyTemplate, TimelineItem } from '../types/schedule';

function formatTimeMinutes(value: number): string {
  const hours = Math.floor(value / 60) % 24;
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseTimeInput(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function getSessionLabel(date: Date, lang: Language): string {
  const t = translations[lang];
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= 5 * 60 && minutes < 11 * 60) return t.sessionMorning;
  if (minutes >= 11 * 60 && minutes < 13 * 60) return t.sessionNoon;
  if (minutes >= 13 * 60 && minutes < 18 * 60) return t.sessionAfternoon;
  if (minutes >= 18 * 60 && minutes < 22 * 60) return t.sessionEvening;
  return t.sessionNight;
}

interface DailyTabProps {
  now: Date;
  timeline: TimelineItem[];
  onToggleDone: (item: TimelineItem) => void;
  onDataChange: () => void;
  externalEditorOpen?: boolean;
  onExternalEditorHandled?: () => void;
}

export function DailyTab({
  now,
  timeline,
  onToggleDone,
  onDataChange,
  externalEditorOpen,
  onExternalEditorHandled,
}: DailyTabProps) {
  const { language, theme, dailies } = useScheduleStore();
  const t = translations[language];
  const isDark = theme === 'dark';
  const dateLocale = language === 'vi' ? vi : enUS;

  const [editorVisible, setEditorVisible] = useState(false);
  const [dailyForm, setDailyForm] = useState({
    id: '',
    title: '',
    note: '',
    start: '08:00',
    end: '09:30',
  });

  useEffect(() => {
    if (externalEditorOpen) {
      setDailyForm({ id: '', title: '', note: '', start: '08:00', end: '09:30' });
      setEditorVisible(true);
      onExternalEditorHandled?.();
    }
  }, [externalEditorOpen]);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const currentState = getCurrentState(timeline, nowMin);

  const openNewSlotModal = () => {
    setDailyForm({ id: '', title: '', note: '', start: '08:00', end: '09:30' });
    setEditorVisible(true);
  };

  const openEditSlotModal = (refId: string, suggestedStartMin?: number) => {
    const found = dailies.find((d) => d.id === refId);
    if (!found) return;
    const startMin = suggestedStartMin ?? found.startMin;
    setDailyForm({
      id: found.id,
      title: found.title,
      note: found.note ?? '',
      start: formatTimeMinutes(startMin),
      end: formatTimeMinutes(startMin + found.durationMin),
    });
    setEditorVisible(true);
  };

  const handleApplyTimeSuggestion = (item: TimelineItem, startMin: number) => {
    Alert.alert(t.applySuggestionTitle, t.applySuggestionMessage, [
      { text: t.cancelBtn, style: 'cancel' },
      {
        text: t.applySuggestionBtn,
        onPress: () => openEditSlotModal(item.refId, startMin),
      },
    ]);
  };

  const handleFindFreeTime = (item: TimelineItem) => {
    const suggestions = findFreeTimeSuggestions(
      timeline,
      item.endMin - item.startMin,
      item.startMin,
      item.key,
    );

    if (suggestions.length === 0) {
      Alert.alert(t.freeTimeSuggestionsTitle, t.noFreeTimeSuggestions);
      return;
    }

    const suggestionButtons = suggestions.slice(0, 2).map((suggestion) => ({
      text: `${formatTimeMinutes(suggestion.startMin)}–${formatTimeMinutes(suggestion.endMin)}`,
      onPress: () => handleApplyTimeSuggestion(item, suggestion.startMin),
    }));

    Alert.alert(
      t.freeTimeSuggestionsTitle,
      `${item.title} · ${formatTimeMinutes(item.startMin)}–${formatTimeMinutes(item.endMin)}`,
      [...suggestionButtons, { text: t.closeBtn, style: 'cancel' }],
    );
  };

  const handleSaveSlot = async () => {
    const title = dailyForm.title.trim();
    if (!title || !dailyForm.start || !dailyForm.end) return;

    const startMin = parseTimeInput(dailyForm.start);
    const endMin = parseTimeInput(dailyForm.end);
    const durationMin =
      endMin > startMin ? endMin - startMin : endMin + 24 * 60 - startMin;

    const payload: Omit<DailyTemplate, 'id'> & { id?: string } = {
      id: dailyForm.id || undefined,
      title,
      note: dailyForm.note.trim() || undefined,
      startMin,
      durationMin,
      repeat: { type: 'daily' },
      isActive: true,
    };

    await saveDaily(payload);
    setEditorVisible(false);
    onDataChange();
  };

  const handleDeleteSlot = (refId: string) => {
    Alert.alert(t.confirmDeleteTitle, t.confirmDeleteMsg, [
      { text: t.cancelBtn, style: 'cancel' },
      {
        text: t.deleteBtn,
        style: 'destructive',
        onPress: async () => {
          await deleteDaily(refId);
          onDataChange();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sessionDateText}>
            {format(now, language === 'vi' ? 'EEEE, d MMMM' : 'EEEE, MMM d', {
              locale: dateLocale,
            }).toUpperCase()}{' '}
            · {getSessionLabel(now, language).toUpperCase()}
          </Text>
          <Text style={[styles.headerTitle, isDark && styles.textDark]}>
            {t.dailyHeaderTitle}
          </Text>
        </View>

        <Pressable onPress={openNewSlotModal} style={styles.addSlotBtn}>
          <Text style={styles.addSlotText}>{t.addSlotBtn}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active / Next Status Hero Card */}
        <View style={[styles.heroCard, isDark && styles.heroCardDark]}>
          {currentState.kind === 'current' ? (
            <>
              <View style={styles.heroTopRow}>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>{t.currentTaskLabel}</Text>
                </View>
                <Text style={styles.heroMinutesText}>
                  {currentState.minutesLeft} {t.minutesLeft}
                </Text>
              </View>
              <Text style={[styles.heroTitle, isDark && styles.textDark]}>
                {currentState.item.title}
              </Text>
              <Text style={[styles.heroSub, isDark && styles.subTextDark]}>
                {formatTimeMinutes(currentState.item.startMin)} –{' '}
                {formatTimeMinutes(currentState.item.endMin)} ·{' '}
                {currentState.item.note ?? t.noNote}
              </Text>

              <View style={styles.heroProgressWrap}>
                <View style={styles.heroProgressHeader}>
                  <Text style={[styles.heroProgressLabel, isDark && styles.subTextDark]}>
                    {t.progressLabel}
                  </Text>
                  <Text style={styles.heroProgressPct}>{currentState.progressPct}%</Text>
                </View>
                <View style={styles.heroProgressTrack}>
                  <View
                    style={[
                      styles.heroProgressFill,
                      { width: `${Math.min(currentState.progressPct, 100)}%` },
                    ]}
                  />
                </View>
              </View>
            </>
          ) : currentState.kind === 'upcoming' ? (
            <>
              <View style={styles.heroTopRow}>
                <View style={styles.upcomingBadge}>
                  <Text style={styles.upcomingBadgeText}>{t.upcomingTaskLabel}</Text>
                </View>
                <Text style={styles.heroMinutesText}>
                  {currentState.minutesUntil} {t.minutesUntil}
                </Text>
              </View>
              <Text style={[styles.heroTitle, isDark && styles.textDark]}>
                {currentState.item.title}
              </Text>
              <Text style={[styles.heroSub, isDark && styles.subTextDark]}>
                {formatTimeMinutes(currentState.item.startMin)} –{' '}
                {formatTimeMinutes(currentState.item.endMin)} ·{' '}
                {currentState.item.note ?? t.noNote}
              </Text>
            </>
          ) : (
            <Text style={[styles.heroTitle, isDark && styles.textDark]}>
              {timeline.length > 0 ? t.finishedToday : t.noScheduleToday}
            </Text>
          )}
        </View>

        {/* Timeline Items List */}
        {timeline.map((item) => {
          const isCurrent =
            currentState.kind === 'current' && currentState.item.key === item.key;
          const isDone = item.done;
          const hasConflict = item.conflictWith.length > 0;

          return (
            <View
              key={item.key}
              style={[
                styles.timelineCard,
                isDark && styles.timelineCardDark,
                isCurrent && styles.timelineCardCurrent,
              ]}
            >
              <View style={styles.cardMainRow}>
                <View
                  style={[
                    styles.timeBox,
                    isDark && styles.timeBoxDark,
                    isCurrent && styles.timeBoxCurrent,
                  ]}
                >
                  <Text
                    style={[
                      styles.startTimeText,
                      isDark && styles.textDark,
                      isCurrent && styles.activeTimeText,
                    ]}
                  >
                    {formatTimeMinutes(item.startMin)}
                  </Text>
                  <Text style={[styles.endTimeText, isDark && styles.subTextDark]}>
                    {formatTimeMinutes(item.endMin)}
                  </Text>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        styles.cardTitle,
                        isDark && styles.textDark,
                        isDone && styles.cardTitleDone,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>

                    {item.source === 'event' && (
                      <View style={styles.eventPill}>
                        <Text style={styles.eventPillText}>{t.eventBadge}</Text>
                      </View>
                    )}

                    {hasConflict && (
                      <View style={styles.conflictPill}>
                        <Text style={styles.conflictPillText}>{t.conflictWarning}</Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[styles.cardNote, isDark && styles.subTextDark]}
                    numberOfLines={1}
                  >
                    {item.note ?? t.noNote}
                  </Text>

                  {item.source === 'daily' && (
                    <View style={styles.inlineActionRow}>
                      <Pressable
                        onPress={() => openEditSlotModal(item.refId)}
                        style={styles.inlineBtn}
                      >
                        <Text style={styles.inlineBtnText}>{t.editBtn}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteSlot(item.refId)}
                        style={styles.inlineBtn}
                      >
                        <Text style={styles.inlineDeleteText}>{t.deleteBtn}</Text>
                      </Pressable>
                      {Platform.OS === 'android' && hasConflict && (
                        <Pressable
                          onPress={() => handleFindFreeTime(item)}
                          style={styles.inlineBtn}
                        >
                          <Text style={styles.inlineBtnText}>{t.findFreeTimeBtn}</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>

                {item.source === 'daily' ? (
                  <Pressable
                    onPress={() => onToggleDone(item)}
                    style={[
                      styles.checkCircle,
                      isCurrent && styles.checkCircleCurrent,
                      isDone && styles.checkCircleDone,
                    ]}
                  >
                    {isDone && <Text style={styles.checkMark}>✓</Text>}
                  </Pressable>
                ) : (
                  <View style={styles.eventDotIndicator} />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Add / Edit Daily Slot Modal */}
      <Modal visible={editorVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isDark && styles.timelineCardDark]}>
            <Text style={[styles.modalTitle, isDark && styles.textDark]}>
              {dailyForm.id ? t.editSlotTitle : t.newSlotTitle}
            </Text>

            <View style={styles.timeInputRow}>
              <TextInput
                style={[styles.input, styles.halfInput, isDark && styles.inputDark]}
                value={dailyForm.start}
                onChangeText={(v) => setDailyForm((prev) => ({ ...prev, start: v }))}
                placeholder={t.slotStartPlaceholder}
                placeholderTextColor="#94a3b8"
              />
              <TextInput
                style={[styles.input, styles.halfInput, isDark && styles.inputDark]}
                value={dailyForm.end}
                onChangeText={(v) => setDailyForm((prev) => ({ ...prev, end: v }))}
                placeholder={t.slotEndPlaceholder}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={dailyForm.title}
              onChangeText={(v) => setDailyForm((prev) => ({ ...prev, title: v }))}
              placeholder={t.slotTitlePlaceholder}
              placeholderTextColor="#94a3b8"
            />

            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={dailyForm.note}
              onChangeText={(v) => setDailyForm((prev) => ({ ...prev, note: v }))}
              placeholder={t.slotNotePlaceholder}
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setEditorVisible(false)}
                style={[styles.cancelBtn, isDark && styles.timeBoxDark]}
              >
                <Text style={[styles.cancelBtnText, isDark && styles.textDark]}>
                  {t.cancelBtn}
                </Text>
              </Pressable>

              <Pressable onPress={handleSaveSlot} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>{t.saveSlotBtn}</Text>
              </Pressable>
            </View>
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
    paddingBottom: 12,
  },
  sessionDateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f27821',
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 2,
  },
  addSlotBtn: {
    backgroundColor: '#f27821',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  addSlotText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 115,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(242, 120, 33, 0.25)',
    shadowColor: '#f27821',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  heroCardDark: {
    backgroundColor: '#1e293b',
    borderColor: 'rgba(242, 120, 33, 0.4)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveBadge: {
    backgroundColor: '#f27821',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  upcomingBadge: {
    backgroundColor: 'rgba(242, 120, 33, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  upcomingBadgeText: {
    color: '#f27821',
    fontSize: 10,
    fontWeight: '800',
  },
  heroMinutesText: {
    color: '#f27821',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1e293b',
  },
  heroSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  heroProgressWrap: {
    marginTop: 12,
  },
  heroProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  heroProgressLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  heroProgressPct: {
    fontSize: 11,
    color: '#f27821',
    fontWeight: '800',
  },
  heroProgressTrack: {
    height: 7,
    backgroundColor: 'rgba(242, 120, 33, 0.14)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#f27821',
    borderRadius: 4,
  },
  timelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.04)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  timelineCardDark: {
    backgroundColor: '#1e293b',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  timelineCardCurrent: {
    borderColor: '#f27821',
    borderWidth: 1.5,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBox: {
    width: 62,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    marginRight: 12,
  },
  timeBoxDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  timeBoxCurrent: {
    backgroundColor: 'rgba(242, 120, 33, 0.12)',
  },
  startTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  activeTimeText: {
    color: '#f27821',
  },
  endTimeText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  cardBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    flexShrink: 1,
  },
  cardTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  eventPill: {
    backgroundColor: 'rgba(14, 165, 233, 0.14)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  eventPillText: {
    color: '#0284c7',
    fontSize: 10,
    fontWeight: '700',
  },
  conflictPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  conflictPillText: {
    color: '#d97706',
    fontSize: 10,
    fontWeight: '700',
  },
  cardNote: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  inlineActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  inlineBtn: {
    paddingVertical: 2,
  },
  inlineBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f27821',
  },
  inlineDeleteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  checkCircleCurrent: {
    borderColor: '#f27821',
  },
  checkCircleDone: {
    backgroundColor: '#f27821',
    borderColor: '#f27821',
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  eventDotIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0ea5e9',
    marginLeft: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 14,
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 10,
  },
  inputDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    color: '#f8fafc',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1.5,
    backgroundColor: '#f27821',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  textDark: {
    color: '#f8fafc',
  },
  subTextDark: {
    color: '#94a3b8',
  },
});
