import { format } from 'date-fns';
import { create } from 'zustand';
import { initialDailies, initialEvents } from '../data/mock';
import { type Language, localizeDailies, localizeEvents } from '../i18n/translations';
import type { DailyTemplate, EventItem } from '../types/schedule';

export type ThemeMode = 'light' | 'dark';
export type LockScreenLayout = 'single' | 'compact';
export type LockScreenTransparency = 'ultra' | 'glass' | 'frosted';

interface ScheduleState {
  dailies: DailyTemplate[];
  events: EventItem[];
  completions: Record<string, true>;
  selectedDate: string;
  language: Language;
  theme: ThemeMode;
  lockScreenLayout: LockScreenLayout;
  lockScreenTransparency: LockScreenTransparency;
  wallpaperIndex: number;
  setDailies: (dailies: DailyTemplate[]) => void;
  setEvents: (events: EventItem[]) => void;
  setSelectedDate: (date: string) => void;
  setCompletions: (completions: Record<string, true>) => void;
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setLockScreenLayout: (layout: LockScreenLayout) => void;
  setLockScreenTransparency: (transparency: LockScreenTransparency) => void;
  setWallpaperIndex: (index: number) => void;
  resetDemoData: () => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  dailies: initialDailies,
  events: initialEvents,
  completions: {},
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  language: 'vi',
  theme: 'light',
  lockScreenLayout: 'single',
  lockScreenTransparency: 'ultra',
  wallpaperIndex: 0,
  setDailies: (dailies) => set({ dailies }),
  setEvents: (events) => set({ events }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setCompletions: (completions) => set({ completions }),
  setLanguage: (language) => {
    const current = get();
    set({
      language,
      dailies: localizeDailies(current.dailies, language),
      events: localizeEvents(current.events, language),
    });
  },
  setTheme: (theme) => set({ theme }),
  setLockScreenLayout: (lockScreenLayout) => set({ lockScreenLayout }),
  setLockScreenTransparency: (lockScreenTransparency) => set({ lockScreenTransparency }),
  setWallpaperIndex: (wallpaperIndex) => set({ wallpaperIndex }),
  resetDemoData: () => {
    const { language } = get();
    set({
      dailies: localizeDailies(initialDailies, language),
      events: localizeEvents(initialEvents, language),
      completions: {},
    });
  },
}));
