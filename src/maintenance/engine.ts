import { getVehicleModel } from './catalog';
import type { MaintenancePart, OdoEntry, PartState, PartSummary, ServiceAgeRange, ServiceSource, UsageLevel, VehicleMaintenanceState } from './types';

const MONTH_MS = (365.25 / 12) * 24 * 60 * 60 * 1000;
const FALLBACK_MONTHLY_KM = 1000;
const AGE_MONTHS: Record<Exclude<ServiceAgeRange, 'unknown'>, number> = { 'under-1': 0.5, '1-3': 2, '3-6': 4.5, 'over-6': 7 };
const USAGE_RANK: Record<UsageLevel, number> = { light: 0, occasional: 1, frequent: 2 };

export function effectiveUsageLevel(state: Pick<VehicleMaintenanceState, 'dustFlood' | 'heavyLoad'>): UsageLevel {
  return USAGE_RANK[state.dustFlood] >= USAGE_RANK[state.heavyLoad] ? state.dustFlood : state.heavyLoad;
}

export function effectiveIntervalKm(part: MaintenancePart, state: Pick<VehicleMaintenanceState, 'dustFlood' | 'heavyLoad'>): number | undefined {
  if (part.intervalKm === undefined || part.severeKm === undefined) return part.intervalKm;
  switch (effectiveUsageLevel(state)) {
    case 'frequent': return part.severeKm;
    case 'occasional': return (part.intervalKm + part.severeKm) / 2;
    default: return part.intervalKm;
  }
}

function elapsedMonths(at: string | null, now: Date): number {
  const timestamp = at ? Date.parse(at) : NaN;
  return Number.isFinite(timestamp) ? Math.max(0, (now.getTime() - timestamp) / MONTH_MS) : 0;
}

export function learnedMonthlyKm(history: readonly OdoEntry[], fallback = FALLBACK_MONTHLY_KM): number {
  if (history.length < 3) return fallback;
  const first = history[0]; const last = history[history.length - 1];
  const days = (Date.parse(last.at) - Date.parse(first.at)) / 86_400_000;
  return Number.isFinite(days) && days >= 14 && last.odo >= first.odo ? Math.max(100, Math.round(((last.odo - first.odo) / days) * 30.4375)) : fallback;
}

function estimatedDate(now: Date, ageMonths: number): string { return new Date(now.getTime() - ageMonths * MONTH_MS).toISOString(); }

export function buildInitialPartStates(modelId: string, odo: number, setup: Record<string, { source: ServiceSource; lastServiceOdo?: number; ageRange?: ServiceAgeRange }>, defaultMonthlyKm = FALLBACK_MONTHLY_KM, factors: Pick<VehicleMaintenanceState, 'dustFlood' | 'heavyLoad'> = { dustFlood: 'light', heavyLoad: 'light' }, now = new Date()): PartState[] {
  const model = getVehicleModel(modelId); if (!model) throw new Error('Không tìm thấy mẫu xe.');
  return model.parts.map((part) => {
    const input = setup[part.id] ?? { source: 'unknown' as const };
    if (input.source === 'exact' && input.lastServiceOdo !== undefined) return { partId: part.id, lastServiceOdo: part.kind === 'TIME_ONLY' ? null : input.lastServiceOdo, lastServiceAt: now.toISOString(), wearKm: part.kind === 'TIME_ONLY' ? null : Math.max(0, odo - input.lastServiceOdo), source: 'exact' };
    if (input.source === 'estimated' && input.ageRange && input.ageRange !== 'unknown') { const ageMonths = AGE_MONTHS[input.ageRange]; return { partId: part.id, lastServiceOdo: part.kind === 'TIME_ONLY' ? null : Math.max(0, Math.round(odo - ageMonths * defaultMonthlyKm)), lastServiceAt: estimatedDate(now, ageMonths), wearKm: part.kind === 'TIME_ONLY' ? null : ageMonths * defaultMonthlyKm, source: 'estimated' }; }
    return { partId: part.id, lastServiceOdo: null, lastServiceAt: part.intervalMonths ? estimatedDate(now, part.intervalMonths * 0.5) : null, wearKm: part.kind === 'TIME_ONLY' ? null : (effectiveIntervalKm(part, factors) ?? 0) * 0.5, source: 'unknown' };
  });
}

export function recordOdo(state: VehicleMaintenanceState, odo: number, now = new Date()): VehicleMaintenanceState { if (!Number.isInteger(odo) || odo < state.odo) throw new Error('ODO mới phải là số nguyên và không nhỏ hơn ODO hiện tại.'); const distance = odo - state.odo; return { ...state, odo, lastOdoAt: now.toISOString(), odoHistory: [...state.odoHistory, { odo, at: now.toISOString() }], partStates: state.partStates.map((part) => ({ ...part, wearKm: part.wearKm === null ? null : part.wearKm + distance })) }; }
export function servicePart(state: VehicleMaintenanceState, partId: string, now = new Date()): VehicleMaintenanceState { return { ...state, partStates: state.partStates.map((part) => part.partId === partId ? { partId, lastServiceOdo: part.wearKm === null ? null : state.odo, lastServiceAt: now.toISOString(), wearKm: part.wearKm === null ? null : 0, source: 'exact' } : part) }; }

function summary(part: MaintenancePart, state: PartState, factors: Pick<VehicleMaintenanceState, 'dustFlood' | 'heavyLoad'>, now: Date): PartSummary { const monthsRemaining = part.intervalMonths === undefined ? null : part.intervalMonths - elapsedMonths(state.lastServiceAt, now); const intervalKm = effectiveIntervalKm(part, factors); const remainingKm = intervalKm === undefined || state.wearKm === null ? null : intervalKm - state.wearKm; const overdue = (remainingKm !== null && remainingKm <= 0) || (monthsRemaining !== null && monthsRemaining <= 0); const warning = state.source === 'unknown' || (remainingKm !== null && remainingKm <= 450) || (monthsRemaining !== null && monthsRemaining <= 1); return { part, status: overdue ? 'overdue' : warning ? 'warning' : 'ok', remainingKm: remainingKm === null ? null : Math.max(0, Math.round(remainingKm)), remainingMonths: monthsRemaining === null ? null : Math.max(0, Math.ceil(monthsRemaining)), source: state.source, safetyNote: state.source === 'unknown' ? 'Chưa rõ lịch sử — nên kiểm tra ở lần ghé tiệm tới.' : state.source === 'estimated' ? 'Mốc ước tính từ khoảng thời gian bạn nhớ.' : null }; }
export function getPartSummaries(state: VehicleMaintenanceState, now = new Date()): PartSummary[] { const model = getVehicleModel(state.modelId); if (!model) return []; return model.parts.map((part) => summary(part, state.partStates.find((item) => item.partId === part.id) ?? { partId: part.id, lastServiceOdo: null, lastServiceAt: null, wearKm: null, source: 'unknown' }, state, now)); }
export function odoUpdatedDaysAgo(state: VehicleMaintenanceState, now = new Date()): number { const timestamp = Date.parse(state.lastOdoAt); return Number.isFinite(timestamp) ? Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000)) : 0; }
