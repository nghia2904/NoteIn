import { buildInitialPartStates, effectiveIntervalKm, effectiveUsageLevel, getPartSummaries, recordOdo, servicePart } from './engine';
import type { VehicleMaintenanceState } from './types';

const now = new Date('2026-11-01T00:00:00.000Z');
function configured(): VehicleMaintenanceState {
  return { modelId: 'honda-air-blade', odo: 10_000, dustFlood: 'frequent', heavyLoad: 'frequent', configuredAt: now.toISOString(), lastOdoAt: now.toISOString(), odoHistory: [{ odo: 10_000, at: now.toISOString() }], defaultMonthlyKm: 1000, partStates: buildInitialPartStates('honda-air-blade', 10_000, { ENGINE_OIL: { source: 'exact', lastServiceOdo: 9_000 } }, 1000, { dustFlood: 'frequent', heavyLoad: 'frequent' }, now), skippedMonthKey: null };
}
describe('vehicle maintenance engine', () => {
  const oil = { id: 'OIL', name: 'Oil', kind: 'REPLACE_KM' as const, intervalKm: 6000, severeKm: 3000 };
  it('chooses the more severe of the two conditions', () => expect(effectiveUsageLevel({ dustFlood: 'light', heavyLoad: 'frequent' })).toBe('frequent'));
  it('uses severe, normal, and middle intervals correctly', () => {
    expect(effectiveIntervalKm(oil, { dustFlood: 'frequent', heavyLoad: 'light' })).toBe(3000);
    expect(effectiveIntervalKm(oil, { dustFlood: 'light', heavyLoad: 'light' })).toBe(6000);
    expect(effectiveIntervalKm(oil, { dustFlood: 'occasional', heavyLoad: 'light' })).toBe(4500);
  });
  it('uses normal interval when a part has no severe interval', () => expect(effectiveIntervalKm({ ...oil, severeKm: undefined }, { dustFlood: 'frequent', heavyLoad: 'frequent' })).toBe(6000));
  it('records actual odo distance and resets after service', () => {
    const state = recordOdo(configured(), 10_100, new Date('2026-11-02T00:00:00.000Z'));
    expect(state.partStates.find((part) => part.partId === 'ENGINE_OIL')?.wearKm).toBe(1100);
    expect(getPartSummaries(state).find((part) => part.part.id === 'ENGINE_OIL')?.status).toBe('ok');
    expect(getPartSummaries(servicePart(state, 'ENGINE_OIL')).find((part) => part.part.id === 'ENGINE_OIL')?.status).toBe('ok');
  });
});
