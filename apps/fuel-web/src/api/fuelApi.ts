const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');

function token() {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem('auth_token');
}

export async function fuelRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message ?? 'The request could not be completed.');
  return body as T;
}

export type FuelDashboard = {
  station: { id: string; name: string; code: string };
  today: {
    sales: number;
    litres: number;
    receivedCost: number;
    payments: number;
    expenses: number;
    creditOutstanding: number;
  };
  tanks: Array<{
    id: string;
    name: string;
    currentStock: number;
    capacity: number;
    fuelType: { name: string; sellingPrice: string };
  }>;
};

export async function getFuelDashboard(): Promise<FuelDashboard> {
  return fuelRequest<FuelDashboard>('/fuel/dashboard');
}

export type Station = { id: string; name: string; code: string };
export type FuelType = { id: string; name: string; sellingPrice: string; purchasePrice: string };
export type Organization = {
  id: string;
  name: string;
  vehicles: Array<{ id: string; registration: string }>;
};
export type StationAssets = {
  tanks: Array<{ id: string; name: string; fuelTypeId: string }>;
  pumps: unknown[];
};

export const getStations = () => fuelRequest<Station[]>('/fuel/stations');
export const getFuelTypes = () => fuelRequest<FuelType[]>('/fuel/types');
export const getOrganizations = () => fuelRequest<Organization[]>('/fuel/organizations');
export const getStationAssets = (stationId: string) =>
  fuelRequest<StationAssets>(`/fuel/stations/${stationId}/assets`);
export const createFuelRecord = (path: string, data: Record<string, unknown>) =>
  fuelRequest(path, { method: 'POST', body: JSON.stringify(data) });
