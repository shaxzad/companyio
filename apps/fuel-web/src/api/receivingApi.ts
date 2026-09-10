import { fuelRequest } from './fuelApi';

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
  accessRateMode: 'PURCHASE' | 'SELLING';
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

export const listReceipts = (params?: { stationId?: string; tankId?: string }) => {
  const query = new URLSearchParams();
  if (params?.stationId) query.set('stationId', params.stationId);
  if (params?.tankId) query.set('tankId', params.tankId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return fuelRequest<FuelReceipt[]>(`/fuel/receipts${suffix}`);
};

export const createReceiving = (data: {
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
  accessRateMode?: 'PURCHASE' | 'SELLING';
  tankerTip?: number;
  otherReceivingCost?: number;
  receivedAt?: string;
  notes?: string;
}) => fuelRequest<FuelReceipt>('/fuel/receiving', { method: 'POST', body: JSON.stringify(data) });
