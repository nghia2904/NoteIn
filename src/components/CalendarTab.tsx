import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDate,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { deleteEvent, getEventDates, listEvents, saveEvent } from '../api/schedule.api';
import { translations } from '../i18n/translations';
import { useScheduleStore } from '../store/scheduleStore';
import type { EventItem } from '../types/schedule';

function formatTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseTimeInput(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

interface CalendarTabProps {
  now: Date;
  onDataChange: () => void;
}

export function CalendarTab({ now, onDataChange }: CalendarTabProps) {
  const { language, theme, selectedDate, setSelectedDate, events: storeEvents } =
    useScheduleStore();
  const t = translations[language];
  const isDark = theme === 'dark';
  const dateLocale = language === 'vi' ? vi : enUS;
  const todayKey = format(now, 'yyyy-MM-dd');

  const [monthCursor, setMonthCursor] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [eventsOnDay, setEventsOnDay] = useState<EventItem[]>([]);
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [eventForm, setEventForm] = useState({
    title: '',
    note: '',
    time: '08:30',
    duration: '60',
  });

  const loadCalendarData = async () => {
    const [dayList, monthDates] = await Promise.all([
      listEvents(selectedDate),
      getEventDates(monthCursor.getFullYear(), monthCursor.getMonth() + 1),
    ]);
    setEventsOnDay(dayList);
    setEventDates(monthDates);
  };

  useEffect(() => {
    loadCalendarData();
  }, [selectedDate, monthCursor, storeEvents]);

  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(monthCursor);
    const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const monthEnd = endOfMonth(monthCursor);
    const viewEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: viewEnd });
  }, [monthCursor]);

  const monthLabel = format(monthCursor, 'LLLL yyyy', { locale: dateLocale });

  const handleGoToday = () => {
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayKey);
  };

  const handleSaveEvent = async () => {
    const title = eventForm.title.trim();
    if (!title) return;

    const startMin = parseTimeInput(eventForm.time);
    const durationMin = Math.max(15, parseInt(eventForm.duration, 10) || 60);

    await saveEvent({
      title,
      note: eventForm.note.trim() || undefined,
      date: selectedDate,
      startMin,
      durationMin,
    });

    setEventForm({ title: '', note: '', time: eventForm.time, duration: '60' });
    await loadCalendarData();
    onDataChange();
  };

  const handleRemoveEvent = async (id: string) => {
    await deleteEvent(id);
    await loadCalendarData();
    onDataChange();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, isDark && styles.textDark]}>
            {t.calendarHeaderTitle}
          </Text>
          <Text style={[styles.headerSub, isDark && styles.subTextDark]}>
            {t.calendarHeaderSub}
          </Text>
        </View>

        <Pressable
          onPress={handleGoToday}
          style={[styles.todayPill, isDark && styles.todayPillDark]}
        >
          <Text style={styles.todayPillText}>{t.todayBtn}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Grid Card */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={styles.monthHeader}>
            <Pressable
              onPress={() =>
                setMonthCursor(
                  new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1),
                )
              }
              style={styles.monthNavBtn}
            >
              <Text style={[styles.navArrow, isDark && styles.textDark]}>‹</Text>
            </Pressable>
            <Text style={[styles.monthTitle, isDark && styles.textDark]}>{monthLabel}</Text>
            <Pressable
              onPress={() =>
                setMonthCursor(
                  new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1),
                )
              }
              style={styles.monthNavBtn}
            >
              <Text style={[styles.navArrow, isDark && styles.textDark]}>›</Text>
            </Pressable>
          </View>

          <View style={styles.calendarGrid}>
            {t.weekdays.map((dayName) => (
              <Text key={dayName} style={[styles.weekdayCell, isDark && styles.subTextDark]}>
                {dayName}
              </Text>
            ))}

            {gridDays.map((day) => {
              const value = format(day, 'yyyy-MM-dd');
              const isSelected = value === selectedDate;
              const isCurrentMonth = isSameMonth(day, monthCursor);
              const hasEvent = eventDates.includes(value);
              const isWeekend = [0, 6].includes(day.getDay());
              const isToday = value === todayKey;

              return (
                <Pressable
                  key={value}
                  onPress={() => setSelectedDate(value)}
                  style={[
                    styles.dayCell,
                    isToday && !isSelected && styles.dayToday,
                    isSelected && styles.daySelected,
                    !isCurrentMonth && styles.dayMuted,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isDark && styles.textDark,
                      isWeekend && !isSelected && styles.weekendText,
                      isToday && !isSelected && styles.todayText,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {getDate(day)}
                  </Text>
                  {hasEvent && (
                    <View
                      style={[
                        styles.eventDot,
                        isSelected && styles.eventDotSelected,
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Events on Selected Date */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            {t.eventsOnDate}{' '}
            {format(parseISO(selectedDate), language === 'vi' ? 'dd/MM/yyyy' : 'MMM d, yyyy', {
              locale: dateLocale,
            })}
          </Text>

          {eventsOnDay.length === 0 ? (
            <Text style={[styles.emptyText, isDark && styles.subTextDark]}>
              {t.noEventsOnDate}
            </Text>
          ) : (
            eventsOnDay.map((event) => {
              const hhmm = formatTimeInput(event.startMin);
              const endMin = event.startMin + (event.durationMin ?? 60);
              return (
                <View
                  key={event.id}
                  style={[styles.eventRow, isDark && styles.eventRowDark]}
                >
                  <View style={styles.eventTimeBadge}>
                    <Text style={styles.eventTimeText}>{hhmm}</Text>
                    <Text style={styles.eventEndTimeText}>{formatTimeInput(endMin)}</Text>
                  </View>
                  <View style={styles.eventBody}>
                    <Text style={[styles.eventTitle, isDark && styles.textDark]}>
                      {event.title}
                    </Text>
                    {event.note ? (
                      <Text style={[styles.eventNote, isDark && styles.subTextDark]}>
                        {event.note}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => handleRemoveEvent(event.id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>{t.deleteBtn}</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        {/* Add Event Card */}
        <View style={[styles.card, isDark && styles.cardDark]}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            + {t.addEventTitle}
          </Text>

          <View style={styles.inlineInputs}>
            <TextInput
              style={[styles.input, styles.halfInput, isDark && styles.inputDark]}
              value={eventForm.time}
              onChangeText={(v) => setEventForm((prev) => ({ ...prev, time: v }))}
              placeholder={t.eventTimePlaceholder}
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={[styles.input, styles.halfInput, isDark && styles.inputDark]}
              value={eventForm.duration}
              onChangeText={(v) => setEventForm((prev) => ({ ...prev, duration: v }))}
              placeholder={t.eventDurationPlaceholder}
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />
          </View>

          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={eventForm.title}
            onChangeText={(v) => setEventForm((prev) => ({ ...prev, title: v }))}
            placeholder={t.eventTitlePlaceholder}
            placeholderTextColor="#94a3b8"
          />

          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={eventForm.note}
            onChangeText={(v) => setEventForm((prev) => ({ ...prev, note: v }))}
            placeholder={t.eventNotePlaceholder}
            placeholderTextColor="#94a3b8"
          />

          <Pressable onPress={handleSaveEvent} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t.saveEventBtn}</Text>
          </Pressable>
        </View>
      </ScrollView>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  todayPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  todayPillDark: {
    backgroundColor: '#1e293b',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  todayPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f27821',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 115,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1e293b',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    fontSize: 26,
    color: '#334155',
    fontWeight: '600',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekdayCell: {
    width: '14.285%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    paddingVertical: 8,
  },
  dayCell: {
    width: '14.285%',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  dayToday: {
    backgroundColor: 'rgba(242, 120, 33, 0.12)',
  },
  daySelected: {
    backgroundColor: '#f27821',
  },
  dayMuted: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  weekendText: {
    color: '#e11d48',
  },
  todayText: {
    color: '#f27821',
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#f27821',
    position: 'absolute',
    bottom: 5,
  },
  eventDotSelected: {
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  eventRowDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  eventTimeBadge: {
    backgroundColor: 'rgba(242, 120, 33, 0.12)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginRight: 12,
  },
  eventTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f27821',
  },
  eventEndTimeText: {
    fontSize: 10,
    color: '#f27821',
    opacity: 0.8,
  },
  eventBody: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  eventNote: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
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
  primaryBtn: {
    backgroundColor: '#f27821',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  textDark: {
    color: '#f8fafc',
  },
  subTextDark: {
    color: '#94a3b8',
  },
});
