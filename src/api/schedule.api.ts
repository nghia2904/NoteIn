import { buildTimeline } from '../engine/schedule';
import { useScheduleStore } from '../store/scheduleStore';
import type { DailyTemplate, EventItem, TimelineItem } from '../types/schedule';

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getTimeline(date: string): Promise<TimelineItem[]> {
  const { dailies, events, completions } = useScheduleStore.getState();
  return buildTimeline(dailies, events, completions, date);
}

export async function getEventDates(year: number, month: number): Promise<string[]> {
  const { events } = useScheduleStore.getState();
  return events
    .map((event) => event.date)
    .filter((date) => {
      const [eventYear, eventMonth] = date.split('-').map(Number);
      return eventYear === year && eventMonth === month;
    })
    .filter((value, index, array) => array.indexOf(value) === index);
}

export async function listDailies(): Promise<DailyTemplate[]> {
  return [...useScheduleStore.getState().dailies];
}

export async function saveDaily(d: Omit<DailyTemplate, 'id'> & { id?: string }): Promise<DailyTemplate> {
  const store = useScheduleStore.getState();
  const next: DailyTemplate = {
    ...d,
    id: d.id ?? makeId('daily'),
  };

  const list = [...store.dailies];
  const index = list.findIndex((item) => item.id === next.id);
  if (index >= 0) {
    list[index] = next;
  } else {
    list.push(next);
  }

  useScheduleStore.setState({ dailies: list });
  return next;
}

export async function deleteDaily(id: string): Promise<void> {
  const store = useScheduleStore.getState();
  useScheduleStore.setState({ dailies: store.dailies.filter((item) => item.id !== id) });
}

export async function listEvents(date: string): Promise<EventItem[]> {
  const { events } = useScheduleStore.getState();
  return events.filter((event) => event.date === date);
}

export async function saveEvent(e: Omit<EventItem, 'id'> & { id?: string }): Promise<EventItem> {
  const store = useScheduleStore.getState();
  const next: EventItem = {
    ...e,
    id: e.id ?? makeId('event'),
  };

  const list = [...store.events];
  const index = list.findIndex((item) => item.id === next.id);
  if (index >= 0) {
    list[index] = next;
  } else {
    list.push(next);
  }

  useScheduleStore.setState({ events: list });
  return next;
}

export async function deleteEvent(id: string): Promise<void> {
  const store = useScheduleStore.getState();
  useScheduleStore.setState({ events: store.events.filter((event) => event.id !== id) });
}

export async function setCompleted(dailyId: string, date: string, done: boolean): Promise<void> {
  const store = useScheduleStore.getState();
  const key = `${dailyId}:${date}`;
  const next: Record<string, true> = { ...store.completions };

  if (done) {
    next[key] = true;
  } else {
    delete next[key];
  }

  useScheduleStore.setState({ completions: next });
}
