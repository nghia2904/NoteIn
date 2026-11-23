import { format } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { initialDailies, initialEvents } from '../data/mock';
import { type Language, localizeDailies, localizeEvents } from '../i18n/translations';
import type { DailyTemplate, EventItem } from '../types/schedule';
import type { VehicleMaintenanceState } from '../maintenance/types';
import { getVehicleModel } from '../maintenance/catalog';

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

const storage: StateStorage = Platform.OS === 'web' ? browserLocalStorage : AsyncStorage;
function validDate(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function sanitizeMaintenance(value: unknown): VehicleMaintenanceState | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<VehicleMaintenanceState>;
  const model = typeof raw.modelId === 'string' ? getVehicleModel(raw.modelId) : undefined;
  const odo = typeof raw.odo === 'number' ? raw.odo : -1;
  const defaultMonthlyKm = typeof raw.defaultMonthlyKm === 'number' ? raw.defaultMonthlyKm : 1000;
  if (!model || !Number.isInteger(odo) || odo < 0) return null;
  const levels = new Set(['light', 'occasional', 'frequent']);
  const level = (value: unknown) => levels.has(value as string) ? value as VehicleMaintenanceState['dustFlood'] : 'light';
  const validIds = new Set(model.parts.map((part) => part.id));
  const partStates = Array.isArray(raw.partStates) ? raw.partStates.filter((part): part is VehicleMaintenanceState['partStates'][number] => !!part && typeof part === 'object' && typeof (part as { partId?: unknown }).partId === 'string' && validIds.has((part as { partId: string }).partId) && ['exact', 'estimated', 'unknown'].includes((part as { source?: string }).source ?? '') && ((part as { wearKm?: unknown }).wearKm === null || (typeof (part as { wearKm?: unknown }).wearKm === 'number' && Number.isFinite((part as { wearKm: number }).wearKm)))).map((part) => ({ ...part, lastServiceAt: validDate(part.lastServiceAt) ? part.lastServiceAt : null, lastServiceOdo: Number.isInteger(part.lastServiceOdo) ? part.lastServiceOdo : null })) : [];
  return { modelId: model.id, odo, dustFlood: level(raw.dustFlood), heavyLoad: level(raw.heavyLoad), configuredAt: validDate(raw.configuredAt) ? raw.configuredAt : new Date(0).toISOString(), lastOdoAt: validDate(raw.lastOdoAt) ? raw.lastOdoAt : new Date(0).toISOString(), odoHistory: Array.isArray(raw.odoHistory) ? raw.odoHistory.filter((entry): entry is { odo: number; at: string } => !!entry && typeof entry.odo === 'number' && Number.isInteger(entry.odo) && entry.odo >= 0 && validDate(entry.at)) : [], defaultMonthlyKm: Number.isInteger(defaultMonthlyKm) && defaultMonthlyKm >= 100 ? defaultMonthlyKm : 1000, partStates, skippedMonthKey: typeof raw.skippedMonthKey === 'string' ? raw.skippedMonthKey : null };
}

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
  vehicleMaintenance: VehicleMaintenanceState | null;
  hasHydrated: boolean;
  setDailies: (dailies: DailyTemplate[]) => void;
  setEvents: (events: EventItem[]) => void;
  setSelectedDate: (date: string) => void;
  setCompletions: (completions: Record<string, true>) => void;
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setLockScreenLayout: (layout: LockScreenLayout) => void;
  setLockScreenTransparency: (transparency: LockScreenTransparency) => void;
  setWallpaperIndex: (index: number) => void;
  setVehicleMaintenance: (maintenance: VehicleMaintenanceState | null) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
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
      vehicleMaintenance: null,
      hasHydrated: false,
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
      setVehicleMaintenance: (vehicleMaintenance) => set({ vehicleMaintenance }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      resetDemoData: () => {
        const { language } = get();
        set({
          dailies: localizeDailies(initialDailies, language),
          events: localizeEvents(initialEvents, language),
          completions: {},
          vehicleMaintenance: null,
        });
      },
    }),
    {
      name: 'notein-personal-schedule-v1',
      version: 3,
      storage: createJSONStorage(() => storage),
      migrate: (persisted) => ({
        ...(persisted as Partial<ScheduleState>),
        vehicleMaintenance: sanitizeMaintenance(
          (persisted as { vehicleMaintenance?: unknown })?.vehicleMaintenance,
        ),
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      partialize: (state) => ({
        dailies: state.dailies,
        events: state.events,
        completions: state.completions,
        selectedDate: state.selectedDate,
        language: state.language,
        theme: state.theme,
        lockScreenLayout: state.lockScreenLayout,
        lockScreenTransparency: state.lockScreenTransparency,
        wallpaperIndex: state.wallpaperIndex,
        vehicleMaintenance: state.vehicleMaintenance,
      }),
    },
  ),
);
