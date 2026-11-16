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

export interface FreeTimeSuggestion {
  startMin: number;
  endMin: number;
}

export function findFreeTimeSuggestions(
  dailies: DailyTemplate[],
  events: EventItem[],
  date: string,
  durationMin: number,
  preferredStartMin: number,
  excludedDailyId: string,
): FreeTimeSuggestion[] {
  const windowStartMin = 5 * 60;
  const windowEndMin = 22 * 60;
  const stepMin = 15;

  if (
    !Number.isInteger(durationMin) ||
    durationMin <= 0 ||
    durationMin > windowEndMin - windowStartMin
  ) {
    return [];
  }

  const busy = [
    ...dailies
      .filter((daily) => daily.isActive && daily.id !== excludedDailyId)
      .map((daily) => ({
        startMin: daily.startMin,
        endMin: daily.startMin + daily.durationMin,
      })),
    ...events
      .filter((event) => event.date === date)
      .map((event) => ({
        startMin: event.startMin,
        endMin: event.startMin + (event.durationMin ?? 60),
      })),
  ]
    .filter(
      (interval) =>
        interval.startMin < windowEndMin &&
        interval.endMin > windowStartMin,
    )
    .map((interval) => ({
      startMin: Math.max(interval.startMin, windowStartMin),
      endMin: Math.min(interval.endMin, windowEndMin),
    }))
    .sort((a, b) => a.startMin - b.startMin);

  const merged: { startMin: number; endMin: number }[] = [];
  for (const interval of busy) {
    const previous = merged[merged.length - 1];
    if (!previous || interval.startMin > previous.endMin) {
      merged.push({ ...interval });
    } else {
      previous.endMin = Math.max(previous.endMin, interval.endMin);
    }
  }

  const gaps: { startMin: number; endMin: number }[] = [];
  let cursor = windowStartMin;
  for (const interval of merged) {
    if (interval.startMin > cursor) {
      gaps.push({ startMin: cursor, endMin: interval.startMin });
    }
    cursor = Math.max(cursor, interval.endMin);
  }
  if (cursor < windowEndMin) {
    gaps.push({ startMin: cursor, endMin: windowEndMin });
  }

  const alignedPreferredStart = Math.round(preferredStartMin / stepMin) * stepMin;

  return gaps
    .map((gap) => {
      const earliestStart = Math.ceil(gap.startMin / stepMin) * stepMin;
      const latestStart =
        Math.floor((gap.endMin - durationMin) / stepMin) * stepMin;
      if (earliestStart > latestStart) return undefined;

      const startMin = Math.max(
        earliestStart,
        Math.min(alignedPreferredStart, latestStart),
      );
      return { startMin, endMin: startMin + durationMin };
    })
    .filter((suggestion): suggestion is FreeTimeSuggestion => suggestion !== undefined)
    .sort(
      (a, b) =>
        Math.abs(a.startMin - preferredStartMin) -
          Math.abs(b.startMin - preferredStartMin) ||
        a.startMin - b.startMin,
    )
    .slice(0, 3);
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
