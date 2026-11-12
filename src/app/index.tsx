import { Link } from 'expo-router';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getTimeline, listEvents, setCompleted } from '../api/schedule.api';
import { getCurrentState } from '../engine/schedule';
import { useNow } from '../hooks/useNow';
import type { TimelineItem } from '../types/schedule';

const tabOptions = ['daily', 'board', 'hidden'] as const;
type TabKey = (typeof tabOptions)[number];

const sessionNames = [
  { key: 'sáng', start: 5 * 60, end: 10 * 60 + 59 },
  { key: 'trưa', start: 11 * 60, end: 12 * 60 + 59 },
  { key: 'chiều', start: 13 * 60, end: 17 * 60 + 59 },
  { key: 'tối', start: 18 * 60, end: 21 * 60 + 59 },
];

function getSessionLabel(date: Date): string {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const matched = sessionNames.find((session) => minutes >= session.start && minutes <= session.end);
  return matched?.key ?? 'ban đêm';
}

function formatTimeMinutes(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getNowMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export default function HomeScreen() {
  const now = useNow();
  const [tab, setTab] = useState<TabKey>('daily');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [eventsToday, setEventsToday] = useState<any[]>([]);

  const dateKey = format(now, 'yyyy-MM-dd');

  const reload = useCallback(async () => {
    const [items, events] = await Promise.all([getTimeline(dateKey), listEvents(dateKey)]);
    setTimeline(items);
    setEventsToday(events);
  }, [dateKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const currentState = useMemo(() => getCurrentState(timeline, getNowMinutes(now)), [now, timeline]);

  const nextSummary = useMemo(() => {
    if (currentState.kind === 'current') {
      return `Kế tiếp: ${currentState.item.title} · còn ${currentState.minutesLeft} phút`;
    }
    if (currentState.kind === 'upcoming') {
      return `Kế tiếp: ${currentState.item.title} · sau ${currentState.minutesUntil} phút`;
    }
    if (currentState.kind === 'finished') {
      return 'Hôm nay đã xong';
    }
    return 'Lịch đã ẩn · chạm để hiện';
  }, [currentState]);

  const handleToggleDone = async (item: TimelineItem) => {
    if (item.source !== 'daily') {
      return;
    }

    const nextValue = !item.done;
    await setCompleted(item.refId, item.date, nextValue);
    await reload();
  };

  const renderItem = (item: TimelineItem) => {
    const isCurrent = currentState.kind === 'current' && currentState.item.key === item.key;
    const isDone = item.done;
    const hasConflict = item.conflictWith.length > 0;

    return (
      <View key={item.key} style={[styles.timelineCard, isCurrent && styles.cardCurrent]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.startTime}>{formatTimeMinutes(item.startMin)}</Text>
            <Text style={styles.endTime}>{formatTimeMinutes(item.endMin)}</Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.titleRow}>
              {isCurrent && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>ĐANG DIỄN RA</Text>
                </View>
              )}
              <Text style={[styles.cardTitle, isDone && styles.doneTitle, isCurrent && styles.currentTitle]}>{item.title}</Text>
              {hasConflict && (
                <View style={styles.warningPill}>
                  <Text style={styles.warningText}>Trùng giờ</Text>
                </View>
              )}
            </View>

            <Text style={styles.cardNote} numberOfLines={1}>
              {item.note ?? 'Không có ghi chú'}
            </Text>

            {isCurrent && (
              <View style={styles.progressWrap}>
                <Text style={styles.progressLabel}>Tiến độ khung giờ</Text>
                <Text style={styles.progressPct}>{currentState.progressPct}%</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(currentState.progressPct, 100)}%` }]} />
                </View>
              </View>
            )}
          </View>

          <Pressable onPress={() => handleToggleDone(item)} style={styles.statusToggleArea}>
            {isDone ? (
              <View style={styles.doneMarker}><Text style={styles.doneTick}>✓</Text></View>
            ) : (
              <View style={[styles.emptyMarker, isCurrent && styles.emptyMarkerCurrent]} />
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#040b1d', '#091b35', '#061b22']} style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.topArea}>
            <Text style={styles.dayLabel}>{format(now, 'EEEE', { locale: vi }).toUpperCase()}, {format(now, 'd')} THÁNG {format(now, 'M')} · BUỔI {getSessionLabel(now).toUpperCase()}</Text>
            <Text style={styles.clock}>{format(now, 'HH:mm')}</Text>
          </View>

          <View style={styles.tabRow}>
            {['Lịch Daily', 'Lịch Bàn', 'Ẩn Lịch'].map((label, index) => {
              const actual = tabOptions[index] as TabKey;
              const isSelected = tab === actual;
              return (
                <Pressable
                  key={label}
                  onPress={() => setTab(actual)}
                  style={[styles.tabButton, isSelected && styles.tabSelected]}
                >
                  <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'hidden' ? (
            <View style={styles.hiddenPlaceholder}>
              <Text style={styles.hiddenText}>Lịch đã ẩn</Text>
              <Text style={styles.hiddenSub}>chạm để hiện</Text>
            </View>
          ) : (
            <>
              <View style={styles.bannerRow}>
                <Text style={styles.bannerText}>{nextSummary}</Text>
                <Link href="/manage" asChild>
                  <Pressable style={styles.addButton}>
                    <Text style={styles.addButtonText}>+ Thêm</Text>
                  </Pressable>
                </Link>
              </View>

              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {tab === 'daily' && timeline.length > 0 ? (
                  timeline.map(renderItem)
                ) : (
                  eventsToday.map((event) => (
                    <View key={event.id} style={styles.timelineCard}>
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.timeBlock}>
                          <Text style={styles.startTime}>{formatTimeMinutes(event.startMin)}</Text>
                          <Text style={styles.endTime}>{formatTimeMinutes((event.startMin || 0) + (event.durationMin ?? 60))}</Text>
                        </View>
                        <View style={styles.cardContent}>
                          <View style={styles.titleRow}>
                            <Text style={styles.cardTitle}>{event.title}</Text>
                            <Text style={styles.eventBadge}>Sự kiện</Text>
                          </View>
                          <Text style={styles.cardNote} numberOfLines={1}>{event.note ?? 'Không có ghi chú'}</Text>
                        </View>
                        <View style={styles.eventStatus} />
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </>
          )}

          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.bottomIcon}>
              <Text style={styles.bottomIconText}>⚡</Text>
            </TouchableOpacity>
            <Link href="/manage" asChild>
              <Pressable style={styles.manageAction}>
                <Text style={styles.manageLabel}>Chạm để mở App Quản Lý đầy đủ</Text>
              </Pressable>
            </Link>
            <TouchableOpacity style={styles.bottomIcon}>
              <Text style={styles.bottomIconText}>◉</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030d22',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  topArea: {
    alignItems: 'center',
    marginBottom: 18,
  },
  dayLabel: {
    color: '#dfe7ff',
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  clock: {
    color: '#f7f7f7',
    fontSize: 66,
    letterSpacing: -3,
    fontWeight: '700',
    marginTop: 6,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(17, 25, 39, 0.88)',
    borderRadius: 18,
    padding: 6,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabSelected: {
    backgroundColor: '#f7b750',
  },
  tabText: {
    color: '#dfe8ff',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextSelected: {
    color: '#17213a',
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bannerText: {
    color: '#f4f7ff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f7b750',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#0b1725',
    fontSize: 12,
    fontWeight: '800',
  },
  list: {
    flex: 1,
  },
  timelineCard: {
    backgroundColor: 'rgba(15, 22, 36, 0.82)',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardCurrent: {
    borderColor: '#f8b74d',
    backgroundColor: 'rgba(78, 53, 15, 0.35)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBlock: {
    width: 60,
    alignItems: 'center',
    marginRight: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  startTime: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  endTime: {
    color: '#a8b0c5',
    fontSize: 10,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadge: {
    backgroundColor: '#f8b74d',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  liveBadgeText: {
    color: '#0b1725',
    fontSize: 9,
    fontWeight: '800',
  },
  cardTitle: {
    color: '#f5f7ff',
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  currentTitle: {
    color: '#fff4da',
  },
  doneTitle: {
    textDecorationLine: 'line-through',
    color: '#a9f3e6',
  },
  warningPill: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  warningText: {
    color: '#f9d976',
    fontSize: 9,
    fontWeight: '700',
  },
  cardNote: {
    color: '#a9b4c9',
    fontSize: 12,
    marginTop: 4,
  },
  progressWrap: {
    marginTop: 8,
  },
  progressLabel: {
    color: '#d5ddf5',
    fontSize: 10,
    marginBottom: 2,
  },
  progressPct: {
    position: 'absolute',
    right: 0,
    top: 0,
    color: '#f9f7ff',
    fontSize: 10,
    fontWeight: '700',
  },
  progressBar: {
    height: 7,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f7b750',
    borderRadius: 6,
  },
  statusToggleArea: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2dd4bf',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneTick: {
    color: '#041928',
    fontWeight: '800',
    fontSize: 14,
  },
  emptyMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  emptyMarkerCurrent: {
    borderColor: '#f7b750',
  },
  eventBadge: {
    fontSize: 10,
    color: '#7dd3fc',
    marginLeft: 8,
    opacity: 0.9,
  },
  eventStatus: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    marginLeft: 8,
  },
  hiddenPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  hiddenText: {
    color: '#e7ecff',
    fontSize: 18,
    fontWeight: '700',
  },
  hiddenSub: {
    color: '#aab7d3',
    fontSize: 11,
    marginTop: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  bottomIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bottomIconText: {
    fontSize: 18,
    color: '#edf4ff',
  },
  manageAction: {
    flex: 1,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    marginHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageLabel: {
    color: '#f5f8ff',
    fontSize: 12,
    fontWeight: '600',
  },
});
