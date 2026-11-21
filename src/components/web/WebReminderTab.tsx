import { format } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { deleteDaily, saveDaily } from '../../api/schedule.api';
import { findFreeTimeSuggestions, getCurrentState } from '../../engine/schedule';
import { useScheduleStore } from '../../store/scheduleStore';
import type { TimelineItem } from '../../types/schedule';

interface WebReminderTabProps {
  now: Date;
  timeline: TimelineItem[];
  onToggleDone: (item: TimelineItem) => void;
  onDataChange: () => void;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseHHMM(str: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(str.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 24 || m < 0 || m >= 60) return null;
  if (h === 24 && m > 0) return null;
  return h * 60 + m;
}

export function WebReminderTab({
  now,
  timeline,
  onToggleDone,
  onDataChange,
}: WebReminderTabProps) {
  const { language, theme, dailies, events } = useScheduleStore();
  const isDark = theme === 'dark';
  const isVi = language === 'vi';
  const locale = isVi ? vi : enUS;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dailyItems = useMemo(
    () => timeline.filter((i) => i.source === 'daily'),
    [timeline],
  );
  const currentState = useMemo(
    () => getCurrentState(dailyItems, nowMin),
    [dailyItems, nowMin],
  );

  const [periodFilter, setPeriodFilter] = useState<
    'all' | 'morning' | 'afternoon' | 'evening'
  >('all');

  // Form state for adding or editing a Daily Reminder slot
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [startInput, setStartInput] = useState('06:00');
  const [endInput, setEndInput] = useState('07:30');
  const [formError, setFormError] = useState<string | null>(null);

  // Free-time suggestions popover state for a conflicting item
  const [suggestForItemId, setSuggestForItemId] = useState<string | null>(null);

  const filteredDailyItems = useMemo(() => {
    return dailyItems.filter((item) => {
      if (periodFilter === 'morning') {
        return item.startMin >= 5 * 60 && item.startMin < 12 * 60;
      }
      if (periodFilter === 'afternoon') {
        return item.startMin >= 12 * 60 && item.startMin < 18 * 60;
      }
      if (periodFilter === 'evening') {
        return item.startMin >= 18 * 60 || item.startMin < 5 * 60;
      }
      return true;
    });
  }, [dailyItems, periodFilter]);

  const completedCount = dailyItems.filter((i) => i.done).length;
  const conflictCount = dailyItems.filter(
    (i) => (i.conflictWith?.length ?? 0) > 0,
  ).length;

  const handleLoadSlotToEdit = (refId: string, overrideStartMin?: number) => {
    const found = dailies.find((d) => d.id === refId);
    if (!found) return;
    const startM = overrideStartMin ?? found.startMin;
    setEditingId(found.id);
    setTitleInput(found.title);
    setNoteInput(found.note ?? '');
    setStartInput(formatTime(startM));
    setEndInput(formatTime(startM + found.durationMin));
    setFormError(null);
  };

  const handleResetForm = () => {
    setEditingId(null);
    setTitleInput('');
    setNoteInput('');
    setStartInput('08:00');
    setEndInput('09:30');
    setFormError(null);
  };

  const handleApplyQuickDuration = (durationMin: number) => {
    const s = parseHHMM(startInput);
    if (s === null) return;
    setEndInput(formatTime((s + durationMin) % 1440));
  };

  const handleSaveSlot = async () => {
    const cleanTitle = titleInput.trim();
    if (!cleanTitle) {
      setFormError(
        isVi ? 'Vui lòng nhập tiêu đề khung giờ.' : 'Please enter a slot title.',
      );
      return;
    }
    const startMin = parseHHMM(startInput);
    const endMin = parseHHMM(endInput);
    if (startMin === null || endMin === null) {
      setFormError(
        isVi
          ? 'Định dạng giờ chưa đúng (VD: 06:00, 14:30).'
          : 'Invalid time format (use HH:mm, e.g. 06:00).',
      );
      return;
    }

    let durationMin = endMin - startMin;
    if (durationMin <= 0) {
      durationMin += 24 * 60;
    }

    await saveDaily({
      id: editingId ?? undefined,
      title: cleanTitle,
      note: noteInput.trim(),
      startMin,
      durationMin,
      repeat: { type: 'daily' },
      isActive: true,
    });
    onDataChange();
    handleResetForm();
  };

  const handleDeleteSlot = async (refId: string) => {
    await deleteDaily(refId);
    if (editingId === refId) {
      handleResetForm();
    }
    onDataChange();
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.dateChip}>
            {format(
              now,
              isVi ? "EEEE, dd 'Tháng' MM · LỊCH DAILY 24H" : 'EEEE, MMM dd · 24H DAILY ROUTINE',
              { locale },
            ).toUpperCase()}
          </Text>
          <Text style={[styles.pageTitle, isDark && styles.textDark]}>
            {isVi ? 'Reminder · Lịch trình hằng ngày' : 'Reminder · Daily Routine'}
          </Text>
        </View>

        <View style={styles.kpiPillsRow}>
          <View style={[styles.statPill, isDark && styles.cardDark]}>
            <Text style={[styles.statPillText, isDark && styles.textDark]}>
              ✓ {completedCount}/{dailyItems.length}{' '}
              {isVi ? 'khung giờ hoàn thành' : 'completed'}
            </Text>
          </View>
          {conflictCount > 0 && (
            <View style={styles.conflictStatPill}>
              <Text style={styles.conflictStatText}>
                ⚠️ {conflictCount} {isVi ? 'khung giờ bị trùng' : 'conflicts'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Main 2-Column Layout: Left Live Active Card + Editor Form | Right 24h Routine Timeline */}
      <View style={styles.splitRow}>
        {/* LEFT COLUMN */}
        <View style={styles.leftCol}>
          {/* Live Active Slot Highlight Card */}
          <View style={[styles.liveCard, isDark && styles.liveCardDark]}>
            {currentState.kind === 'current' ? (
              <>
                <View style={styles.liveTopRow}>
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>
                      ⚡ {isVi ? 'ĐANG DIỄN RA' : 'IN PROGRESS'}
                    </Text>
                  </View>
                  <Text style={styles.liveRemainText}>
                    {currentState.minutesLeft}{' '}
                    {isVi ? 'phút còn lại' : 'min left'}
                  </Text>
                </View>

                <Text style={[styles.liveTitle, isDark && styles.textDark]}>
                  {currentState.item.title}
                </Text>
                <Text style={[styles.liveSub, isDark && styles.subTextDark]}>
                  {formatTime(currentState.item.startMin)} –{' '}
                  {formatTime(currentState.item.endMin)}
                  {currentState.item.note ? ` · ${currentState.item.note}` : ''}
                </Text>

                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, isDark && styles.subTextDark]}>
                    {isVi ? 'Tiến độ khung giờ hiện tại' : 'Current slot progress'}
                  </Text>
                  <Text style={styles.progressPct}>
                    {currentState.progressPct}%
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${currentState.progressPct}%` },
                    ]}
                  />
                </View>
              </>
            ) : currentState.kind === 'upcoming' ? (
              <>
                <View style={styles.liveTopRow}>
                  <View style={[styles.liveBadge, { backgroundColor: '#3b82f6' }]}>
                    <Text style={[styles.liveBadgeText, { color: '#ffffff' }]}>
                      ⏳ {isVi ? 'SẮP TỚI' : 'UPCOMING'}
                    </Text>
                  </View>
                  <Text style={[styles.liveRemainText, { color: '#2563eb' }]}>
                    {isVi
                      ? `Bắt đầu sau ${currentState.minutesUntil} phút`
                      : `Starts in ${currentState.minutesUntil}m`}
                  </Text>
                </View>
                <Text style={[styles.liveTitle, isDark && styles.textDark]}>
                  {currentState.item.title}
                </Text>
                <Text style={[styles.liveSub, isDark && styles.subTextDark]}>
                  {formatTime(currentState.item.startMin)} –{' '}
                  {formatTime(currentState.item.endMin)}
                </Text>
              </>
            ) : (
              <Text style={[styles.liveTitle, isDark && styles.textDark]}>
                {isVi
                  ? '🎉 Đã hoàn thành toàn bộ lịch ngày hôm nay'
                  : '🎉 All daily slots finished for today'}
              </Text>
            )}
          </View>

          {/* Add / Edit Daily Reminder Form Card */}
          <View style={[styles.formCard, isDark && styles.cardDark]}>
            <View style={styles.formHeaderRow}>
              <Text style={[styles.formCardTitle, isDark && styles.textDark]}>
                {editingId
                  ? isVi
                    ? '✎ Chỉnh sửa khung giờ Daily'
                    : '✎ Edit Daily Slot'
                  : isVi
                    ? '+ Thêm khung giờ Daily mới'
                    : '+ Add New Daily Slot'}
              </Text>
              {editingId && (
                <Pressable onPress={handleResetForm}>
                  <Text style={styles.cancelEditLink}>
                    {isVi ? 'Hủy sửa' : 'Cancel'}
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.subTextDark]}>
                {isVi ? 'TÊN CÔNG VIỆC / THÓI QUEN HẰNG NGÀY' : 'ROUTINE TITLE'}
              </Text>
              <TextInput
                value={titleInput}
                onChangeText={setTitleInput}
                placeholder={
                  isVi
                    ? 'VD: Học ngoại ngữ, Tập thể dục, Đọc sách...'
                    : 'e.g. Morning study, Workout...'
                }
                placeholderTextColor="#9ca3af"
                style={[styles.input, isDark && styles.inputDark]}
              />
            </View>

            <View style={styles.timeInputsRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, isDark && styles.subTextDark]}>
                  {isVi ? 'GIỜ BẮT ĐẦU' : 'START (HH:MM)'}
                </Text>
                <TextInput
                  value={startInput}
                  onChangeText={setStartInput}
                  placeholder="06:00"
                  placeholderTextColor="#9ca3af"
                  style={[styles.input, isDark && styles.inputDark]}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, isDark && styles.subTextDark]}>
                  {isVi ? 'GIỜ KẾT THÚC' : 'END (HH:MM)'}
                </Text>
                <TextInput
                  value={endInput}
                  onChangeText={setEndInput}
                  placeholder="07:30"
                  placeholderTextColor="#9ca3af"
                  style={[styles.input, isDark && styles.inputDark]}
                />
              </View>
            </View>

            {/* Quick Duration Preset Chips */}
            <View style={styles.presetRow}>
              {[30, 45, 60, 90, 120, 180].map((m) => (
                <Pressable
                  key={m}
                  onPress={() => handleApplyQuickDuration(m)}
                  style={[styles.presetChip, isDark && styles.rowDark]}
                >
                  <Text style={[styles.presetChipText, isDark && styles.textDark]}>
                    +{m}p
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.subTextDark]}>
                {isVi ? 'GHI CHÚ / MỤC TIÊU CHI TIẾT' : 'NOTES / DETAILS'}
              </Text>
              <TextInput
                value={noteInput}
                onChangeText={setNoteInput}
                placeholder={
                  isVi
                    ? 'VD: Học 30 từ vựng mới, tắt thông báo điện thoại...'
                    : 'e.g. Learn 30 new words...'
                }
                placeholderTextColor="#9ca3af"
                multiline
                style={[
                  styles.input,
                  { minHeight: 68, textAlignVertical: 'top' },
                  isDark && styles.inputDark,
                ]}
              />
            </View>

            {formError ? (
              <Text style={styles.errorText}>{formError}</Text>
            ) : null}

            <Pressable onPress={handleSaveSlot} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>
                {editingId
                  ? isVi
                    ? '✓ Cập nhật khung giờ'
                    : '✓ Update Slot'
                  : isVi
                    ? '+ Lưu vào Lịch Daily'
                    : '+ Save Daily Slot'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* RIGHT COLUMN: 24-Hour Daily Timeline Board */}
        <View style={[styles.rightCol, isDark && styles.cardDark]}>
          {/* Period Filter Bar */}
          <View style={styles.rightHeaderBar}>
            <Text style={[styles.rightSectionTitle, isDark && styles.textDark]}>
              {isVi ? 'Danh sách khung giờ trong ngày' : 'Daily Time Slots'}
            </Text>

            <View style={[styles.periodFilterGroup, isDark && styles.rowDark]}>
              {(
                [
                  { id: 'all', label: isVi ? 'Tất cả (24h)' : 'All (24h)' },
                  { id: 'morning', label: isVi ? '🌅 Sáng' : '🌅 Morning' },
                  { id: 'afternoon', label: isVi ? '☀️ Chiều' : '☀️ Afternoon' },
                  { id: 'evening', label: isVi ? '🌙 Tối & Đêm' : '🌙 Night' },
                ] as const
              ).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setPeriodFilter(p.id)}
                  style={[
                    styles.periodBtn,
                    periodFilter === p.id && styles.periodBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodBtnText,
                      periodFilter === p.id && styles.periodBtnTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.timelineListContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredDailyItems.map((item) => {
              const isCurrent =
                currentState.kind === 'current' &&
                currentState.item.key === item.key;
              const hasConflict = (item.conflictWith?.length ?? 0) > 0;
              const showingSuggestions = suggestForItemId === item.refId;

              const suggestions = showingSuggestions
                ? findFreeTimeSuggestions(
                    dailies,
                    events,
                    item.date,
                    item.endMin - item.startMin,
                    item.startMin,
                    item.refId,
                  )
                : [];

              return (
                <View
                  key={item.key}
                  style={[
                    styles.slotCard,
                    isDark && styles.rowDark,
                    isCurrent && styles.slotCardActive,
                    hasConflict && styles.slotCardConflict,
                  ]}
                >
                  <View style={styles.slotMainRow}>
                    {/* Time Badge */}
                    <View
                      style={[
                        styles.timeBox,
                        isCurrent && styles.timeBoxActive,
                        isDark && !isCurrent && styles.timeBoxDark,
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeStartText,
                          isCurrent && styles.timeStartTextActive,
                          isDark && !isCurrent && styles.textDark,
                        ]}
                      >
                        {formatTime(item.startMin)}
                      </Text>
                      <Text
                        style={[
                          styles.timeEndText,
                          isCurrent && styles.timeEndTextActive,
                        ]}
                      >
                        {formatTime(item.endMin)}
                      </Text>
                    </View>

                    {/* Title, Note & Action Links */}
                    <View style={styles.slotBody}>
                      <View style={styles.slotTitleLine}>
                        <Text
                          style={[
                            styles.slotTitle,
                            isDark && styles.textDark,
                            item.done && styles.strikeText,
                          ]}
                        >
                          {item.title}
                        </Text>

                        {isCurrent && (
                          <View style={styles.inlineLivePill}>
                            <Text style={styles.inlineLivePillText}>
                              ⚡ {isVi ? 'ĐANG DIỄN RA' : 'LIVE'}
                            </Text>
                          </View>
                        )}

                        {hasConflict && (
                          <View style={styles.inlineConflictPill}>
                            <Text style={styles.inlineConflictPillText}>
                              ⚠️ {isVi ? 'Trùng giờ' : 'Conflict'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {item.note ? (
                        <Text
                          style={[styles.slotNote, isDark && styles.subTextDark]}
                        >
                          {item.note}
                        </Text>
                      ) : null}

                      {/* Inline Edit / Delete / Free-time Suggest Actions */}
                      <View style={styles.slotActionsRow}>
                        <Pressable
                          onPress={() => handleLoadSlotToEdit(item.refId)}
                          style={styles.inlineActionBtn}
                        >
                          <Text style={styles.inlineEditText}>
                            {isVi ? 'Sửa' : 'Edit'}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => handleDeleteSlot(item.refId)}
                          style={styles.inlineActionBtn}
                        >
                          <Text style={styles.inlineDeleteText}>
                            {isVi ? 'Xóa' : 'Delete'}
                          </Text>
                        </Pressable>

                        {hasConflict && (
                          <Pressable
                            onPress={() =>
                              setSuggestForItemId(
                                showingSuggestions ? null : item.refId,
                              )
                            }
                            style={styles.suggestBtn}
                          >
                            <Text style={styles.suggestBtnText}>
                              💡{' '}
                              {isVi ? 'Gợi ý giờ trống' : 'Suggest free time'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>

                    {/* Completion Circle Button */}
                    <Pressable
                      onPress={() => onToggleDone(item)}
                      style={[
                        styles.doneCircle,
                        item.done && styles.doneCircleChecked,
                        isCurrent && !item.done && styles.doneCircleCurrent,
                      ]}
                    >
                      {item.done && <Text style={styles.doneCheckMark}>✓</Text>}
                    </Pressable>
                  </View>

                  {/* Inline Free-Time Suggestions Drawer when Conflict button clicked */}
                  {showingSuggestions && (
                    <View style={styles.suggestionsDrawer}>
                      <Text style={styles.suggestionsTitle}>
                        {suggestions.length > 0
                          ? isVi
                            ? 'Chọn 1 khung giờ trống bên dưới để đổi nhanh:'
                            : 'Click a free time slot below to apply:'
                          : isVi
                            ? 'Không tìm thấy khung giờ trống phù hợp trong khoảng 05:00–22:00.'
                            : 'No free interval available between 05:00 and 22:00.'}
                      </Text>
                      <View style={styles.suggestionChipsRow}>
                        {suggestions.map((s) => (
                          <Pressable
                            key={s.startMin}
                            onPress={async () => {
                              const found = dailies.find(
                                (d) => d.id === item.refId,
                              );
                              if (found) {
                                await saveDaily({
                                  ...found,
                                  startMin: s.startMin,
                                });
                                setSuggestForItemId(null);
                                onDataChange();
                              }
                            }}
                            style={styles.suggestionChip}
                          >
                            <Text style={styles.suggestionChipText}>
                              ✓ {formatTime(s.startMin)} – {formatTime(s.endMin)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 16,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  dateChip: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#ea580c',
    marginBottom: 3,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  kpiPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  conflictStatPill: {
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  conflictStatText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#e11d48',
  },
  splitRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  leftCol: {
    width: 360,
    gap: 16,
  },
  liveCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    gap: 8,
  },
  liveCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#f59e0b',
  },
  liveTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  liveRemainText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  liveTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
  },
  liveSub: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ea580c',
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#fde68a',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ea580c',
    borderRadius: 99,
  },
  formCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  cancelEditLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#111827',
  },
  inputDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#f8fafc',
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  saveBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  // Right Column Timeline
  rightCol: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 14,
  },
  rightHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  rightSectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  periodFilterGroup: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 99,
    padding: 3,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  periodBtnActive: {
    backgroundColor: '#18181b',
  },
  periodBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4b5563',
  },
  periodBtnTextActive: {
    color: '#ffffff',
  },
  timelineListContent: {
    gap: 10,
    paddingBottom: 24,
  },
  slotCard: {
    backgroundColor: '#fbfaf7',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ecebe6',
    gap: 10,
  },
  rowDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  slotCardActive: {
    borderColor: '#ea580c',
    borderWidth: 2,
    backgroundColor: '#fffdf7',
  },
  slotCardConflict: {
    borderColor: '#f43f5e',
  },
  slotMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  timeBox: {
    width: 72,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBoxActive: {
    backgroundColor: '#ffedd5',
  },
  timeBoxDark: {
    backgroundColor: '#1e293b',
  },
  timeStartText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },
  timeStartTextActive: {
    color: '#ea580c',
  },
  timeEndText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 1,
  },
  timeEndTextActive: {
    color: '#c2410c',
  },
  slotBody: {
    flex: 1,
    gap: 3,
  },
  slotTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  strikeText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  inlineLivePill: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  inlineLivePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ea580c',
  },
  inlineConflictPill: {
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  inlineConflictPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#e11d48',
  },
  slotNote: {
    fontSize: 12,
    color: '#6b7280',
  },
  slotActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  inlineActionBtn: {
    paddingVertical: 2,
  },
  inlineEditText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  inlineDeleteText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
  },
  suggestBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  suggestBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  doneCircle: {
    width: 28,
    height: 28,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCircleCurrent: {
    borderColor: '#ea580c',
  },
  doneCircleChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  doneCheckMark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  suggestionsDrawer: {
    backgroundColor: '#f8fafc',
    borderRadius: 11,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  suggestionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  suggestionChipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  textDark: {
    color: '#f8fafc',
  },
  subTextDark: {
    color: '#94a3b8',
  },
});
