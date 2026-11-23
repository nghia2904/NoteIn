import { getVehicleModel } from './catalog';
import { buildInitialPartStates } from './engine';
import type { ServiceAgeRange, ServiceSource, UsageLevel, VehicleMaintenanceState } from './types';

export type SetupItem = { source: ServiceSource; odo: string; age: ServiceAgeRange };
export type MaintenanceForm = { modelId: string; odoText: string; monthlyKm: string; dustFlood: UsageLevel; heavyLoad: UsageLevel; setup: Record<string, SetupItem> };
const blank = (): SetupItem => ({ source: 'unknown', odo: '', age: 'unknown' });
export function maintenanceToForm(state: VehicleMaintenanceState): MaintenanceForm {
  const model = getVehicleModel(state.modelId);
  return { modelId: state.modelId, odoText: String(state.odo), monthlyKm: String(state.defaultMonthlyKm), dustFlood: state.dustFlood, heavyLoad: state.heavyLoad, setup: Object.fromEntries((model?.parts ?? []).map((part) => { const item = state.partStates.find((value) => value.partId === part.id); return [part.id, item ? { source: item.source, odo: item.lastServiceOdo === null ? '' : String(item.lastServiceOdo), age: item.source === 'estimated' ? '1-3' : 'unknown' } : blank()]; })) };
}
export function newMaintenanceForm(modelId: string): MaintenanceForm { return { modelId, odoText: '', monthlyKm: '1000', dustFlood: 'light', heavyLoad: 'light', setup: {} }; }
export function removedPartNames(oldState: VehicleMaintenanceState, nextModelId: string): string[] { const next = new Set(getVehicleModel(nextModelId)?.parts.map((part) => part.id) ?? []); const old = getVehicleModel(oldState.modelId); return (old?.parts ?? []).filter((part) => !next.has(part.id)).map((part) => part.name); }
export function applyForm(previous: VehicleMaintenanceState | null, form: MaintenanceForm, keepHistory: boolean, now = new Date()): VehicleMaintenanceState {
  const odo = Number(form.odoText); const defaultMonthlyKm = Number(form.monthlyKm);
  if (!Number.isInteger(odo) || odo < 0 || !Number.isInteger(defaultMonthlyKm) || defaultMonthlyKm < 100) throw new Error('Dữ liệu chưa hợp lệ.');
  if (previous && previous.modelId === form.modelId && JSON.stringify(maintenanceToForm(previous)) === JSON.stringify(form)) return previous;
  const setup = Object.fromEntries(Object.entries(form.setup).map(([id, item]) => [id, { source: item.source, lastServiceOdo: item.odo ? Number(item.odo) : undefined, ageRange: item.age }]));
  const partStates = buildInitialPartStates(form.modelId, odo, setup, defaultMonthlyKm, form, now);
  const retained = keepHistory && previous ? new Map(previous.partStates.map((part) => [part.partId, part])) : new Map();
  return { modelId: form.modelId, odo, dustFlood: form.dustFlood, heavyLoad: form.heavyLoad, configuredAt: previous?.configuredAt ?? now.toISOString(), lastOdoAt: previous?.lastOdoAt ?? now.toISOString(), odoHistory: previous?.odo === odo ? previous.odoHistory : [{ odo, at: now.toISOString() }], defaultMonthlyKm, partStates: partStates.map((part) => retained.get(part.partId) ?? part), skippedMonthKey: previous?.skippedMonthKey ?? null };
}
