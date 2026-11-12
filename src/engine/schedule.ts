import { parseISO } from 'date-fns';
import type { CurrentState, DailyTemplate, EventItem, Repeat, TimelineItem } from '../types/schedule';

function normalizeWeekday(day: number): number {
  return day === 0 ? 7 : day;
}

function matchesRepeat(repeat: Repeat, date: string): boolean {
  const parsed = parseISO(date);
  const weekday = normalizeWeekday(parsed.getDay());

  if (repeat.type === 'daily') {
    return true;
  }

  return repeat.days.includes(weekday);
}

function buildDailyItem(daily: DailyTemplate, date: string, done: boolean): TimelineItem {
  const endMin = daily.startMin + daily.durationMin;
  return {
    key: `daily:${daily.id}:${date}`,
    source: 'daily',
    refId: daily.id,
    date,
    title: daily.title,
    note: daily.note,
    startMin: daily.startMin,
    endMin,
    done,
    conflictWith: [],
  };
}

function buildEventItem(event: EventItem): TimelineItem {
  const duration = event.durationMin ?? 60;
  return {
    key: `event:${event.id}`,
    source: 'event',
    refId: event.id,
    date: event.date,
    title: event.title,
    note: event.note,
    startMin: event.startMin,
    endMin: event.startMin + duration,
    done: false,
    conflictWith: [],
  };
}

export function detectConflicts(a: Pick<TimelineItem, 'startMin' | 'endMin'>, b: Pick<TimelineItem, 'startMin' | 'endMin'>): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

export function buildTimeline(
  dailies: DailyTemplate[],
  events: EventItem[],
  completions: Record<string, true>,
  date: string,
): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const daily of dailies) {
    if (!daily.isActive || !matchesRepeat(daily.repeat, date)) {
      continue;
    }

    const dailyDone = Boolean(completions[`${daily.id}:${date}`]);
    items.push(buildDailyItem(daily, date, dailyDone));
  }

  for (const event of events.filter((entry) => entry.date === date)) {
    items.push(buildEventItem(event));
  }

  items.sort((a, b) => a.startMin - b.startMin);

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      if (detectConflicts(a, b)) {
        a.conflictWith.push(b.key);
        b.conflictWith.push(a.key);
      }
    }
  }

  return items;
}

export function getCurrentState(items: TimelineItem[], nowMin: number): CurrentState {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);

  const active = sorted.filter((item) => item.startMin <= nowMin && nowMin < item.endMin);
  if (active.length > 0) {
    const current = [...active].sort((a, b) => b.startMin - a.startMin)[0];
    const duration = current.endMin - current.startMin;
    const progressPct = duration > 0 ? Math.round(((nowMin - current.startMin) / duration) * 100) : 0;

    return {
      kind: 'current',
      item: current,
      progressPct,
      minutesLeft: current.endMin - nowMin,
    };
  }

  const upcoming = sorted.find((item) => item.startMin > nowMin);
  if (upcoming) {
    return {
      kind: 'upcoming',
      item: upcoming,
      minutesUntil: upcoming.startMin - nowMin,
    };
  }

  if (sorted.length === 0) {
    return { kind: 'empty' };
  }

  return { kind: 'finished' };
}
