export type AccessRateMode = 'PURCHASE' | 'SELLING';

export type FuelReceipt = {
  id: string;
  stationId: string;
  businessDayId: string | null;
  supplier: string;
  tankerNumber: string | null;
  invoiceNumber: string | null;
  receivedAt: string;
  enteredAt: string;
  expectedLitres: number;
  actualLitres: number;
  totalDip: number | null;
  receivedDip: number | null;
  accessLitres: number;
  shortageLitres: number;
  purchaseRate: number;
  accessRateMode: AccessRateMode;
  accessRate: number;
  fuelCost: number;
  tankerTip: number;
  otherReceivingCost: number;
  totalCost: number;
  notes: string | null;
  fuelTypeId: string | null;
  fuelTypeName: string | null;
  fuelTypeCode: string | null;
  tankId: string | null;
  tankName: string | null;
};

export type CreateReceivingInput = {
  stationId: string;
  businessDayId?: string;
  supplier: string;
  tankerNumber?: string;
  invoiceNumber?: string;
  fuelTypeId: string;
  tankId: string;
  expectedLitres: number;
  actualLitres: number;
  totalDip?: number;
  receivedDip?: number;
  purchaseRate: number;
  accessRateMode?: AccessRateMode;
  tankerTip?: number;
  otherReceivingCost?: number;
  receivedAt?: string;
  notes?: string;
};

export type ListReceiptsParams = {
  stationId?: string;
  tankId?: string;
};
