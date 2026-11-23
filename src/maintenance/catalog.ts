import type { MaintenancePart, VehicleModel } from './types';

const scooterParts: MaintenancePart[] = [
  { id: 'ENGINE_OIL', name: 'Nhớt máy', kind: 'REPLACE_KM', intervalKm: 6000, severeKm: 3000, intervalMonths: 12 },
  { id: 'AIR_FILTER', name: 'Lọc gió', kind: 'REPLACE_KM', intervalKm: 18000, severeKm: 9000 },
  { id: 'SPARK_PLUG', name: 'Bugi', kind: 'REPLACE_KM', intervalKm: 12000, severeKm: 6000 },
  { id: 'DRIVE_BELT', name: 'Đai truyền động', kind: 'REPLACE_KM', intervalKm: 24000, severeKm: 12000 },
  { id: 'BRAKE_PAD', name: 'Kiểm tra má phanh', kind: 'CHECK_KM', intervalKm: 12000, severeKm: 6000 },
  { id: 'GEAR_OIL', name: 'Nhớt láp', kind: 'REPLACE_KM', intervalKm: 12000, severeKm: 6000 },
  { id: 'COOLANT', name: 'Dung dịch làm mát', kind: 'TIME_ONLY', intervalMonths: 24 },
  { id: 'BRAKE_FLUID', name: 'Dầu phanh', kind: 'TIME_ONLY', intervalMonths: 24 },
];

const underboneParts: MaintenancePart[] = [
  { id: 'ENGINE_OIL', name: 'Nhớt máy', kind: 'REPLACE_KM', intervalKm: 6000, severeKm: 3000, intervalMonths: 12 },
  { id: 'AIR_FILTER', name: 'Lọc gió', kind: 'REPLACE_KM', intervalKm: 16000, severeKm: 8000 },
  { id: 'SPARK_PLUG', name: 'Bugi', kind: 'REPLACE_KM', intervalKm: 12000, severeKm: 6000 },
  { id: 'CHAIN_SPROCKET', name: 'Nhông sên dĩa', kind: 'REPLACE_KM', intervalKm: 16000, severeKm: 8000 },
  { id: 'BRAKE_PAD', name: 'Kiểm tra má/guốc phanh', kind: 'CHECK_KM', intervalKm: 12000, severeKm: 6000 },
  { id: 'BRAKE_FLUID', name: 'Dầu phanh', kind: 'TIME_ONLY', intervalMonths: 24 },
];

const cloneParts = (parts: MaintenancePart[]) => parts.map((part) => ({ ...part }));

export const vehicleModels: VehicleModel[] = [
  { id: 'honda-air-blade', brand: 'Honda', name: 'Air Blade', parts: cloneParts(scooterParts) },
  { id: 'honda-vision', brand: 'Honda', name: 'Vision', parts: scooterParts.filter((part) => part.id !== 'COOLANT').map((part) => ({ ...part })) },
  { id: 'honda-sh', brand: 'Honda', name: 'SH', parts: cloneParts(scooterParts) },
  { id: 'honda-wave-alpha', brand: 'Honda', name: 'Wave Alpha', parts: cloneParts(underboneParts) },
  { id: 'honda-blade', brand: 'Honda', name: 'Blade', parts: cloneParts(underboneParts) },
  { id: 'yamaha-exciter-155', brand: 'Yamaha', name: 'Exciter 155 VVA', parts: [...cloneParts(underboneParts), { id: 'COOLANT', name: 'Dung dịch làm mát', kind: 'TIME_ONLY', intervalMonths: 24 }] },
  { id: 'yamaha-sirius', brand: 'Yamaha', name: 'Sirius', parts: cloneParts(underboneParts) },
];

export function getVehicleModel(modelId: string): VehicleModel | undefined {
  return vehicleModels.find((model) => model.id === modelId);
}
