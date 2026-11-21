import { format } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { initialDailies, initialEvents } from '../data/mock';
import { type Language, localizeDailies, localizeEvents } from '../i18n/translations';
import type { DailyTemplate, EventItem } from '../types/schedule';

export type ThemeMode = 'light' | 'dark';
export type LockScreenLayout = 'single' | 'compact';
export type LockScreenTransparency = 'ultra' | 'glass' | 'frosted';

const memoryFallback = new Map<string, string>();

const browserLocalStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name);
      }
    } catch {
      // Ignore storage access errors
    }
    return memoryFallback.get(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
        return;
      }
    } catch {
      // Ignore storage quota/access errors
    }
    memoryFallback.set(name, value);
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
        return;
      }
    } catch {
      // Ignore
    }
    memoryFallback.delete(name);
  },
};

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

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
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
    }),
    {
      name: 'notein-personal-schedule-v1',
      storage: createJSONStorage(() => browserLocalStorage),
      partialize: (state) => ({
        dailies: state.dailies,
        events: state.events,
        completions: state.completions,
        language: state.language,
        theme: state.theme,
        lockScreenLayout: state.lockScreenLayout,
        lockScreenTransparency: state.lockScreenTransparency,
        wallpaperIndex: state.wallpaperIndex,
      }),
    },
  ),
);
