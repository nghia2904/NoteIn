import { addDays, format, startOfWeek } from 'date-fns';
import { NativeModules, Platform } from 'react-native';
import { buildTimeline, getCurrentState } from '../engine/schedule';
import { type Language, translations } from '../i18n/translations';
import type { DailyTemplate, EventItem } from '../types/schedule';

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface LockScreenPayload {
  language: Language;
  selectedDate: string;
  tabDailyLabel: string;
  tabCalendarLabel: string;
  tabHiddenLabel: string;
  currentBadge: string;
  progressLabel: string;
  hiddenHint: string;
  emptyEventsHint: string;
  selectedDateHeader: string;
  weekdays: string[];
  currentTitle: string;
  currentNote: string;
  currentTimeRange: string;
  progressPct: number;
  dailyItems: {
    id: string;
    timeRange: string;
    title: string;
    done: boolean;
  }[];
  calendarDaysRaw: string[];
  calendarEvents: {
    id: string;
    date: string;
    dateFormatted: string;
    time: string;
    title: string;
    note: string;
  }[];
}

/**
 * Clears legacy notifications on iOS without touching Android notifications.
 */
export async function clearAllNotifications(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const Notifications = await import('expo-notifications');
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Builds the live payload and pushes it to the 2-Card Interactive iOS Lock Screen Live Activity.
 */
export async function syncLiveActivityToOSLockScreen(
  dailies: DailyTemplate[],
  events: EventItem[],
  completions: Record<string, true>,
  now: Date,
  language: Language,
): Promise<boolean> {
  const t = translations[language];
  const dateKey = format(now, 'yyyy-MM-dd');
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const timeline = buildTimeline(dailies, events, completions, dateKey);
  const dailyOnly = timeline.filter((item) => item.source === 'daily');
  const currentState = getCurrentState(dailyOnly, nowMin);

  let currentTitle: string = t.finishedToday;
  let currentNote: string = '';
  let currentTimeRange: string = '--:--';
  let progressPct = 100;

  if (currentState.kind === 'current') {
    currentTitle = currentState.item.title;
    currentNote = currentState.item.note ?? '';
    currentTimeRange = `${formatTime(currentState.item.startMin)} - ${formatTime(currentState.item.endMin)}`;
    progressPct = currentState.progressPct;
  } else if (currentState.kind === 'upcoming') {
    currentTitle = currentState.item.title;
    currentNote = currentState.item.note ?? '';
    currentTimeRange = `${formatTime(currentState.item.startMin)} - ${formatTime(currentState.item.endMin)}`;
    progressPct = 0;
  }

  const dailyItems = dailyOnly
    .filter(
      (item) =>
        !(currentState.kind === 'current' && currentState.item.key === item.key),
    )
    .slice(0, 4)
    .map((item) => ({
      id: item.refId,
      timeRange: `${formatTime(item.startMin)}-${formatTime(item.endMin)}`,
      title: item.title,
      done: item.done,
    }));

  // Build 28 days (4 full weeks: previous week, current week, and next 2 weeks) encoded compactly to stay well under ActivityKit's 4KB limit
  const startMonday = addDays(startOfWeek(now, { weekStartsOn: 1 }), -7);
  const eventDateSet = new Set(events.map((e) => e.date));
  const calendarDaysRaw = Array.from({ length: 28 }, (_, idx) => {
    const d = addDays(startMonday, idx);
    const dStr = format(d, 'yyyy-MM-dd');
    const hasEv = eventDateSet.has(dStr) ? '1' : '0';
    const isSun = d.getDay() === 0 ? '1' : '0';
    return `${dStr}|${d.getDate()}|${hasEv}|${isSun}`;
  });

  // Only include events of the current day (today) for Lịch Bàn on the Lock Screen
  const todayEvents = events
    .filter((ev) => ev.date === dateKey)
    .sort((a, b) => a.startMin - b.startMin)
    .slice(0, 3)
    .map((ev) => {
      const [, m, d] = ev.date.split('-');
      return {
        id: ev.id,
        date: ev.date,
        dateFormatted: `${d}/${m}`,
        time: formatTime(ev.startMin),
        title: ev.title,
        note: (ev.note ?? '').slice(0, 50),
      };
    });

  const payload: LockScreenPayload = {
    language,
    selectedDate: dateKey,
    tabDailyLabel: t.lsTabDaily,
    tabCalendarLabel: t.lsTabCalendar,
    tabHiddenLabel: t.lsTabHidden,
    currentBadge: t.currentTaskLabel,
    progressLabel: t.progressLabel,
    hiddenHint: t.lsHiddenBanner,
    emptyEventsHint: t.noEventsOnDate,
    selectedDateHeader: t.lsSelectedDateTitle,
    weekdays: [...t.weekdays],
    currentTitle,
    currentNote,
    currentTimeRange,
    progressPct,
    dailyItems,
    calendarDaysRaw,
    calendarEvents: todayEvents,
  };

  if (Platform.OS === 'ios' && NativeModules.NoteInLockScreen) {
    try {
      await NativeModules.NoteInLockScreen.startOrUpdateLiveActivity(
        JSON.stringify(payload),
      );
      return true;
    } catch (err) {
      console.warn('Live Activity update error:', err);
      return false;
    }
  }

  return false;
}
