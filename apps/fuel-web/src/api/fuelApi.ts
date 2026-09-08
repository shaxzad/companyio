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

export type Station = {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  logoUrl?: string | null;
};
export type FuelType = {
  id: string;
  name: string;
  code: string;
  sellingPrice: string;
  purchasePrice: string;
  minimumStock?: string;
  reorderLevel?: string;
  active?: boolean;
};
export type Organization = {
  id: string;
  name: string;
  vehicles: Array<{ id: string; registration: string }>;
};
export type StationAssets = {
  tanks: Array<{
    id: string;
    name: string;
    fuelTypeId: string;
    capacity: string | number;
    openingStock: string | number;
    currentStock: string | number;
    active: boolean;
    fuelType: { id: string; name: string };
  }>;
  pumps: Array<{
    id: string;
    number: string;
    name: string;
    active: boolean;
    nozzles: Array<{
      id: string;
      number: string;
      fuelTypeId: string;
      tankId: string | null;
      openingMeter: string | number;
      currentMeter: string | number;
      active: boolean;
      fuelType: { name: string };
      tank?: { id: string; name: string } | null;
    }>;
  }>;
};

export const getStations = () => fuelRequest<Station[]>('/fuel/stations');
export const getFuelTypes = (includeInactive = false) =>
  fuelRequest<FuelType[]>(`/fuel/types${includeInactive ? '?includeInactive=true' : ''}`);
export const getOrganizations = () => fuelRequest<Organization[]>('/fuel/organizations');
export const getStationAssets = (stationId: string) =>
  fuelRequest<StationAssets>(`/fuel/stations/${stationId}/assets`);
export const createFuelRecord = (path: string, data: Record<string, unknown>) =>
  fuelRequest(path, { method: 'POST', body: JSON.stringify(data) });
