import { Link, router } from 'expo-router';
import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, getDate, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { deleteDaily, deleteEvent, getEventDates, listDailies, listEvents, saveDaily, saveEvent } from '../api/schedule.api';
import type { DailyTemplate, EventItem } from '../types/schedule';

const tabOptions = ['daily', 'calendar'] as const;
type ManageTab = (typeof tabOptions)[number];

function formatTimeInput(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseTimeInput(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export default function ManageScreen() {
  const [tab, setTab] = useState<ManageTab>('daily');
  const [dailies, setDailies] = useState<DailyTemplate[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedDate, setSelectedDate] = useState('2026-11-10');
  const [monthCursor, setMonthCursor] = useState(new Date(2026, 10, 1));
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [dailyForm, setDailyForm] = useState({
    id: '',
    title: '',
    note: '',
    start: '',
    end: '',
  });
  const [eventForm, setEventForm] = useState({ title: '', note: '', time: '08:30' });

  const loadData = async () => {
    const [dailyList, eventList, eventDatesList] = await Promise.all([
      listDailies(),
      listEvents(selectedDate),
      getEventDates(monthCursor.getFullYear(), monthCursor.getMonth() + 1),
    ]);
    setDailies(dailyList);
    setEvents(eventList);
    setEventDates(eventDatesList);
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, monthCursor]);

  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(monthCursor);
    const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const monthEnd = endOfMonth(monthCursor);
    const viewEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: viewEnd });
  }, [monthCursor]);

  const monthLabel = format(monthCursor, 'LLLL yyyy', { locale: vi });

  const resetDailyForm = () => setDailyForm({ id: '', title: '', note: '', start: '', end: '' });

  const saveDailyItem = async () => {
    const title = dailyForm.title.trim();
    if (!title || !dailyForm.start || !dailyForm.end) {
      return;
    }

    const startMin = parseTimeInput(dailyForm.start);
    const endMin = parseTimeInput(dailyForm.end);
    const durationMin = endMin > startMin ? endMin - startMin : endMin + 24 * 60 - startMin;

    const payload: Omit<DailyTemplate, 'id'> & { id?: string } = {
      id: dailyForm.id || undefined,
      title,
      note: dailyForm.note,
      startMin,
      durationMin,
      repeat: { type: 'daily' as const },
      isActive: true,
    };

    await saveDaily(payload);
    resetDailyForm();
    await loadData();
  };

  const removeDaily = async (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có muốn xóa khung giờ này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { await deleteDaily(id); await loadData(); } },
    ]);
  };

  const saveEventItem = async () => {
    const title = eventForm.title.trim();
    if (!title) {
      return;
    }

    const startMin = parseTimeInput(eventForm.time);
    await saveEvent({
      title,
      note: eventForm.note,
      date: selectedDate,
      startMin,
      durationMin: 60,
    });
    setEventForm({ title: '', note: '', time: eventForm.time });
    await loadData();
  };

  const removeEvent = async (id: string) => {
    await deleteEvent(id);
    await loadData();
  };

  return (
    <LinearGradient colors={['#040b1d', '#091b35', '#061b22']} style={styles.root}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{tab === 'daily' ? 'Lịch Daily Cố Định' : 'Cuốn Lịch Để Bàn'}</Text>
          {tab === 'calendar' ? (
            <Pressable style={styles.todayButton} onPress={() => setMonthCursor(new Date(2026, 10, 1))}>
              <Text style={styles.todayBadgeText}>Hôm nay</Text>
            </Pressable>
          ) : <View style={{ width: 56 }} />}
        </View>

        <View style={styles.tabButtons}>
          {tabOptions.map((value) => (
            <Pressable
              key={value}
              onPress={() => setTab(value)}
              style={[styles.manageTab, tab === value && styles.manageTabActive]}
            >
              <Text style={[styles.manageTabText, tab === value && styles.manageTabTextActive]}>{value === 'daily' ? 'Daily' : 'Lịch Bàn'}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'daily' ? (
          <ScrollView contentContainerStyle={styles.scrollPadding}>
            <View style={styles.card}>
              <View style={styles.countRow}>
                <Text style={styles.countLabel}>{dailies.length} khung giờ</Text>
              </View>
              <Text style={styles.sectionTitle}>+ Thêm khung giờ mới</Text>

              <View style={styles.inputInline}>
                <TextInput style={[styles.input, styles.timeInput]} value={dailyForm.start} onChangeText={(v) => setDailyForm((prev) => ({ ...prev, start: v }))} placeholder="00:00" />
                <Text style={styles.separator}>-</Text>
                <TextInput style={[styles.input, styles.timeInput]} value={dailyForm.end} onChangeText={(v) => setDailyForm((prev) => ({ ...prev, end: v }))} placeholder="00:00" />
              </View>

              <TextInput style={styles.input} value={dailyForm.title} onChangeText={(v) => setDailyForm((prev) => ({ ...prev, title: v }))} placeholder="Tên hoạt động" />
              <TextInput style={styles.input} value={dailyForm.note} onChangeText={(v) => setDailyForm((prev) => ({ ...prev, note: v }))} placeholder="Ghi chú" />
              <Pressable style={styles.primaryButton} onPress={saveDailyItem}><Text style={styles.primaryText}>Thêm Vào Lịch Daily</Text></Pressable>
            </View>

            {dailies.map((daily) => (
              <View key={daily.id} style={styles.dailyRow}>
                <View style={styles.dailyMeta}>
                  <Text style={styles.dailyTime}>{formatTimeInput(daily.startMin)} - {formatTimeInput(daily.startMin + daily.durationMin)}</Text>
                  <Text style={styles.dailyTitle}>{daily.title}</Text>
                  {daily.note ? <Text style={styles.dailyNote}>{daily.note}</Text> : null}
                </View>
                <View style={styles.dailyActions}>
                  <Pressable style={styles.smallAction} onPress={() => setDailyForm({ id: daily.id, title: daily.title, note: daily.note ?? '', start: formatTimeInput(daily.startMin), end: formatTimeInput(daily.startMin + daily.durationMin), })}><Text style={styles.smallActionText}>Sửa</Text></Pressable>
                  <Pressable style={styles.smallActionDelete} onPress={() => removeDaily(daily.id)}><Text style={styles.smallActionText}>Xóa</Text></Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollPadding}>
            <View style={styles.monthHeader}>
              <Pressable onPress={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}><Text style={styles.navArrow}>‹</Text></Pressable>
              <Text style={styles.monthName}>{monthLabel}</Text>
              <Pressable onPress={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}><Text style={styles.navArrow}>›</Text></Pressable>
            </View>

            <View style={styles.calendarGrid}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label) => (
                <Text key={label} style={styles.weekdayCell}>{label}</Text>
              ))}
              {gridDays.map((day) => {
                const value = format(day, 'yyyy-MM-dd');
                const isSelected = value === selectedDate;
                const isCurrentMonth = isSameMonth(day, monthCursor);
                const hasEvent = eventDates.includes(value);
                const isWeekend = [0, 6].includes(day.getDay());
                const isToday = value === '2026-11-10';

                return (
                  <Pressable key={value} onPress={() => setSelectedDate(value)} style={[styles.dayCell, isSelected && styles.daySelected, !isCurrentMonth && styles.dayMuted, isWeekend && styles.weekendCell]}>
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected, isWeekend && styles.weekendText, isToday && styles.todayText]}>{getDate(day)}</Text>
                    {hasEvent && <View style={styles.dot} />}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Thêm sự kiện cho {format(parseISO(selectedDate), 'EEEE, dd/MM/yyyy', { locale: vi })}</Text>
              <TextInput style={styles.input} value={eventForm.time} onChangeText={(v) => setEventForm((prev) => ({ ...prev, time: v }))} placeholder="08:30" />
              <TextInput style={styles.input} value={eventForm.title} onChangeText={(v) => setEventForm((prev) => ({ ...prev, title: v }))} placeholder="Tên sự kiện" />
              <TextInput style={styles.input} value={eventForm.note} onChangeText={(v) => setEventForm((prev) => ({ ...prev, note: v }))} placeholder="Ghi chú" />
              <Pressable style={styles.primaryButton} onPress={saveEventItem}><Text style={styles.primaryText}>Lưu Sự Kiện Vào Ngày Này</Text></Pressable>
            </View>

            <View style={styles.eventList}>
              {events.map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <View style={styles.eventMeta}>
                    <Text style={styles.eventTime}>{formatTimeInput(event.startMin)}</Text>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {event.note ? <Text style={styles.eventNote}>{event.note}</Text> : null}
                  </View>
                  <Pressable onPress={() => removeEvent(event.id)} style={styles.removeButton}><Text style={styles.removeText}>Xóa</Text></Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 30, lineHeight: 30 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  todayButton: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6 },
  todayBadgeText: { color: '#fff', fontSize: 12 },
  tabButtons: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 6, marginBottom: 14 },
  manageTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  manageTabActive: { backgroundColor: '#f8b74d' },
  manageTabText: { color: '#dfe8ff', fontWeight: '600' },
  manageTabTextActive: { color: '#1d2338' },
  scrollPadding: { paddingBottom: 30 },
  card: { backgroundColor: 'rgba(16,24,38,0.82)', borderRadius: 18, padding: 12, marginBottom: 12 },
  countRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  countLabel: { color: '#b9d2ff', fontSize: 12 },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  inputInline: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  timeInput: { flex: 1, minWidth: 0 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', marginBottom: 10 },
  separator: { color: '#fff', fontSize: 18, marginHorizontal: 6 },
  primaryButton: { backgroundColor: '#f8b74d', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  primaryText: { color: '#1d2338', fontWeight: '800' },
  dailyRow: { backgroundColor: 'rgba(16,24,38,0.82)', borderRadius: 14, padding: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  dailyMeta: { flex: 1 },
  dailyTime: { color: '#fff', fontWeight: '700', marginBottom: 3 },
  dailyTitle: { color: '#f9fbff', fontWeight: '700', marginBottom: 2 },
  dailyNote: { color: '#aab6cf', fontSize: 12 },
  dailyActions: { flexDirection: 'row', alignItems: 'center' },
  smallAction: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  smallActionDelete: { backgroundColor: 'rgba(255,99,99,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  smallActionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  navArrow: { color: '#fff', fontSize: 28 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  weekdayCell: { width: '14.285%', textAlign: 'center', color: '#b5c8ff', fontWeight: '700', paddingVertical: 8 },
  dayCell: { width: '14.285%', height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 4, position: 'relative' },
  daySelected: { backgroundColor: '#2dd4bf' },
  dayMuted: { opacity: 0.3 },
  weekendCell: { backgroundColor: 'rgba(255,255,255,0.02)' },
  dayText: { color: '#fff', fontWeight: '600' },
  dayTextSelected: { color: '#062033' },
  weekendText: { color: '#ff876a' },
  todayText: { color: '#f9d76d' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2dd4bf', position: 'absolute', bottom: 6 },
  eventList: { marginTop: 8 },
  eventRow: { backgroundColor: 'rgba(16,24,38,0.82)', borderRadius: 14, padding: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  eventMeta: { flex: 1 },
  eventTime: { color: '#fff', fontWeight: '700', marginBottom: 3 },
  eventTitle: { color: '#f9fbff', fontWeight: '700', marginBottom: 2 },
  eventNote: { color: '#aab6cf', fontSize: 12 },
  removeButton: { backgroundColor: 'rgba(255,99,99,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center' },
  removeText: { color: '#fff', fontWeight: '600' },
});
