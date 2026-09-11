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
