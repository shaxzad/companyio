export type OpeningMeterRow = {
  nozzleId: string;
  pumpName: string;
  pumpNumber: string;
  nozzleNumber: string;
  productName: string;
  productCode: string;
  suggestedOpening: number;
  openingReading?: number;
  closingReading?: number | null;
};

export type OpeningTankRow = {
  tankId: string;
  tankName: string;
  productName: string;
  productCode: string;
  suggestedOpening: number;
  openingStock?: number;
  closingStock?: number | null;
};

export type BusinessDay = {
  id: string;
  stationId: string;
  businessDate: string;
  status: 'OPEN' | 'CLOSED';
  bbfCash: number;
  openedAt: string;
  enteredAt: string;
  overrideReason: string | null;
  closedAt: string | null;
  meters: Array<
    OpeningMeterRow & { id: string; openingReading: number; closingReading: number | null }
  >;
  tanks: Array<OpeningTankRow & { id: string; openingStock: number; closingStock: number | null }>;
};

export type OpeningPreview = {
  stationId: string;
  businessDate: string;
  canOpen: boolean;
  alreadyOpened: boolean;
  requiresOwnerOverride: boolean;
  blockedReason: string | null;
  previousDay: { businessDate: string; status: 'OPEN' | 'CLOSED' } | null;
  source: 'LAST_CLOSED_DAY' | 'MASTER_SETUP' | 'EXISTING_DAY';
  bbfCashSuggested: number;
  existing: BusinessDay | null;
  meters: OpeningMeterRow[];
  tanks: OpeningTankRow[];
};

export type OpenBusinessDayInput = {
  stationId: string;
  businessDate: string;
  bbfCash: number;
  overrideReason?: string;
  meters: Array<{ nozzleId: string; openingReading: number }>;
  tanks: Array<{ tankId: string; openingStock: number }>;
};
