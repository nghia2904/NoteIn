import { create } from 'zustand';
import { initialDailies, initialEvents } from '../data/mock';
import type { DailyTemplate, EventItem } from '../types/schedule';

interface ScheduleState {
  dailies: DailyTemplate[];
  events: EventItem[];
  completions: Record<string, true>;
  selectedDate: string;
  setDailies: (dailies: DailyTemplate[]) => void;
  setEvents: (events: EventItem[]) => void;
  setSelectedDate: (date: string) => void;
  setCompletions: (completions: Record<string, true>) => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  dailies: initialDailies,
  events: initialEvents,
  completions: {},
  selectedDate: '2026-11-10',
  setDailies: (dailies) => set({ dailies }),
  setEvents: (events) => set({ events }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setCompletions: (completions) => set({ completions }),
}));
