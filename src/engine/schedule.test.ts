import {
  buildTimeline,
  detectConflicts,
  findFreeTimeSuggestions,
  getCurrentState,
} from './schedule';
import type { DailyTemplate, EventItem } from '../types/schedule';

const dailyA: DailyTemplate = {
  id: 'a',
  title: 'Study',
  startMin: 6 * 60,
  durationMin: 90,
  repeat: { type: 'daily' },
  isActive: true,
};

const dailyB: DailyTemplate = {
  id: 'b',
  title: 'Short',
  startMin: 8 * 60,
  durationMin: 60,
  repeat: { type: 'daily' },
  isActive: true,
};

const dailyC: DailyTemplate = {
  id: 'c',
  title: 'Night shift',
  startMin: 23 * 60,
  durationMin: 120,
  repeat: { type: 'daily' },
  isActive: true,
};

describe('schedule engine', () => {
  test('06:15 inside a 06:00-07:30 item is 17%', () => {
    const items = buildTimeline([dailyA], [], {}, '2026-11-10');
    const state = getCurrentState(items, 6 * 60 + 15);
    expect(state.kind).toBe('current');
    if (state.kind !== 'current') return;
    expect(state.progressPct).toBe(17);
  });

  test('09:30 is in the second interval with a gap boundary', () => {
    const second: DailyTemplate = {
      ...dailyA,
      id: 'second',
      title: 'Second session',
      startMin: 9 * 60,
      durationMin: 60,
    };

    const first: DailyTemplate = {
      ...dailyA,
      id: 'first',
      title: 'First session',
      startMin: 8 * 60,
      durationMin: 60,
    };

    const items = buildTimeline([first, second], [], {}, '2026-11-10');
    const state = getCurrentState(items, 9 * 60 + 30);
    expect(state.kind).toBe('current');
    if (state.kind !== 'current') return;
    expect(state.item.title).toBe('Second session');
  });

  test('gaps go to upcoming and final done to finished', () => {
    const first: DailyTemplate = {
      ...dailyA,
      id: 'first-gap',
      title: 'Morning focus',
      startMin: 8 * 60,
      durationMin: 60,
    };
    const second: DailyTemplate = {
      ...dailyA,
      id: 'second-gap',
      title: 'Afternoon block',
      startMin: 10 * 60,
      durationMin: 60,
    };

    const items = buildTimeline([first, second], [], {}, '2026-11-10');
    const upcoming = getCurrentState(items, 9 * 60 + 30);
    expect(upcoming.kind).toBe('upcoming');
    if (upcoming.kind !== 'upcoming') return;
    expect(upcoming.item.title).toBe('Afternoon block');

    const finished = getCurrentState(items, 12 * 60);
    expect(finished.kind).toBe('finished');
  });

  test('overnight item appears on both dates', () => {
    const first = buildTimeline([dailyC], [], {}, '2026-11-10');
    const second = buildTimeline([dailyC], [], {}, '2026-11-11');
    expect(first[0]?.startMin).toBe(23 * 60);
    expect(second[0]?.startMin).toBe(23 * 60);
  });

  test('touching boundaries do not conflict; overlaps conflict both ways', () => {
    const a = { startMin: 9 * 60, endMin: 10 * 60 };
    const b = { startMin: 10 * 60, endMin: 11 * 60 };
    const c = { startMin: 9 * 60, endMin: 9 * 60 + 30 };
    const d = { startMin: 9 * 60 + 15, endMin: 9 * 60 + 45 };

    expect(detectConflicts(a, b)).toBe(false);
    expect(detectConflicts(c, d)).toBe(true);
  });

  test('buildTimeline marks conflicts symmetrically', () => {
    const first: DailyTemplate = {
      ...dailyA,
      id: 'left',
      title: 'Left item',
      startMin: 9 * 60,
      durationMin: 60,
    };
    const second: DailyTemplate = {
      ...dailyA,
      id: 'right',
      title: 'Right item',
      startMin: 9 * 60 + 30,
      durationMin: 60,
    };

    const items = buildTimeline([first, second], [], {}, '2026-11-10');
    const left = items.find((item) => item.title === 'Left item');
    const right = items.find((item) => item.title === 'Right item');
    expect(left?.conflictWith).toEqual(expect.arrayContaining([right?.key ?? '']));
    expect(right?.conflictWith).toEqual(expect.arrayContaining([left?.key ?? '']));
  });

  test('free-time suggestions merge overlaps and prefer the nearest available start', () => {
    const items = buildTimeline(
      [
        { ...dailyA, id: 'first', startMin: 8 * 60, durationMin: 120 },
        { ...dailyA, id: 'overlap', startMin: 9 * 60, durationMin: 120 },
      ],
      [],
      {},
      '2026-11-10',
    );

    expect(findFreeTimeSuggestions(items, 60, 9 * 60 + 30, 'missing')[0]).toEqual({
      startMin: 11 * 60,
      endMin: 12 * 60,
    });
  });

  test('free-time suggestions exclude the selected item and respect exact boundaries', () => {
    const selected = {
      ...dailyA,
      id: 'selected',
      startMin: 9 * 60,
      durationMin: 60,
    };
    const blocker = {
      ...dailyA,
      id: 'blocker',
      startMin: 10 * 60,
      durationMin: 60,
    };
    const items = buildTimeline([selected, blocker], [], {}, '2026-11-10');
    const selectedItem = items.find((item) => item.refId === 'selected');

    expect(selectedItem).toBeDefined();
    expect(
      findFreeTimeSuggestions(items, 60, 9 * 60, selectedItem?.key ?? ''),
    ).toContainEqual({ startMin: 9 * 60, endMin: 10 * 60 });
  });

  test('free-time suggestions return no result when no interval is long enough', () => {
    const items = buildTimeline(
      [{ ...dailyA, startMin: 5 * 60, durationMin: 17 * 60 }],
      [],
      {},
      '2026-11-10',
    );

    expect(findFreeTimeSuggestions(items, 30, 12 * 60, 'missing')).toEqual([]);
    expect(findFreeTimeSuggestions(items, 0, 12 * 60, 'missing')).toEqual([]);
  });
});
