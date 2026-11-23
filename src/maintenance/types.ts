export type PartKind = 'REPLACE_KM' | 'CHECK_KM' | 'TIME_ONLY';
export type ServiceSource = 'exact' | 'estimated' | 'unknown';
export type ServiceAgeRange = 'under-1' | '1-3' | '3-6' | 'over-6' | 'unknown';
export type UsageLevel = 'light' | 'occasional' | 'frequent';
export interface MaintenancePart { id: string; name: string; kind: PartKind; intervalKm?: number; severeKm?: number; intervalMonths?: number; }
export interface VehicleModel { id: string; brand: 'Honda' | 'Yamaha'; name: string; parts: MaintenancePart[]; }
export interface OdoEntry { odo: number; at: string; }
export interface PartState { partId: string; lastServiceOdo: number | null; lastServiceAt: string | null; wearKm: number | null; source: ServiceSource; }
export interface VehicleMaintenanceState { modelId: string; odo: number; dustFlood: UsageLevel; heavyLoad: UsageLevel; configuredAt: string; lastOdoAt: string; odoHistory: OdoEntry[]; defaultMonthlyKm: number; partStates: PartState[]; skippedMonthKey: string | null; }
export type PartHealth = 'ok' | 'warning' | 'overdue';
export interface PartSummary { part: MaintenancePart; status: PartHealth; remainingKm: number | null; remainingMonths: number | null; source: ServiceSource; safetyNote: string | null; }
