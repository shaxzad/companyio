import { apiRequest } from '../http';
import type { CreateReceivingInput, FuelReceipt, ListReceiptsParams } from '../../types';

export const listReceipts = (params?: ListReceiptsParams) => {
  const query = new URLSearchParams();
  if (params?.stationId) query.set('stationId', params.stationId);
  if (params?.tankId) query.set('tankId', params.tankId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<FuelReceipt[]>(`/fuel/receipts${suffix}`);
};

export const createReceiving = (data: CreateReceivingInput) =>
  apiRequest<FuelReceipt>('/fuel/receiving', {
    method: 'POST',
    body: JSON.stringify(data),
  });
