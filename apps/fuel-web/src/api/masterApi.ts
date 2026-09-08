import {
  createFuelRecord,
  fuelRequest,
  getFuelTypes,
  getStationAssets,
  getStations,
  type FuelType,
  type Station,
  type StationAssets,
} from './fuelApi';

export type { FuelType, Station, StationAssets };

export type CashDenomination = {
  id: string;
  value: number;
  label: string | null;
  sortOrder: number;
  active: boolean;
};

export type SellingRate = {
  id: string;
  fuelTypeId: string;
  sellingPrice: string | number;
  effectiveFrom: string;
  createdAt: string;
  fuelType: FuelType;
};

export const listStations = getStations;
export const listFuelTypes = getFuelTypes;
export const listStationAssets = getStationAssets;

export const createStation = (data: {
  name: string;
  code: string;
  address?: string;
  city?: string;
}) => createFuelRecord('/fuel/stations', data);

export const updateStation = (id: string, data: Record<string, unknown>) =>
  fuelRequest<Station>(`/fuel/stations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const createProduct = (data: Record<string, unknown>) =>
  createFuelRecord('/fuel/types', data);

export const updateProduct = (id: string, data: Record<string, unknown>) =>
  fuelRequest<FuelType>(`/fuel/types/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const createTank = (data: Record<string, unknown>) => createFuelRecord('/fuel/tanks', data);

export const updateTank = (id: string, data: Record<string, unknown>) =>
  fuelRequest(`/fuel/tanks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const createPump = (data: Record<string, unknown>) => createFuelRecord('/fuel/pumps', data);

export const updatePump = (id: string, data: Record<string, unknown>) =>
  fuelRequest(`/fuel/pumps/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const createNozzle = (data: Record<string, unknown>) =>
  createFuelRecord('/fuel/nozzles', data);

export const updateNozzle = (id: string, data: Record<string, unknown>) =>
  fuelRequest(`/fuel/nozzles/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const listDenominations = () => fuelRequest<CashDenomination[]>('/fuel/denominations');

export const createDenomination = (data: { value: number; label?: string }) =>
  createFuelRecord('/fuel/denominations', data) as Promise<CashDenomination>;

export const loadDefaultDenominations = () =>
  fuelRequest<CashDenomination[]>('/fuel/denominations/defaults', { method: 'POST', body: '{}' });

export const updateDenomination = (id: string, data: Record<string, unknown>) =>
  fuelRequest<CashDenomination>(`/fuel/denominations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const listRates = (fuelTypeId?: string) =>
  fuelRequest<SellingRate[]>(`/fuel/rates${fuelTypeId ? `?fuelTypeId=${fuelTypeId}` : ''}`);

export const createRate = (data: {
  fuelTypeId: string;
  sellingPrice: number;
  effectiveFrom?: string;
}) => createFuelRecord('/fuel/rates', data) as Promise<SellingRate>;
