import { apiRequest } from '../http';
import type { CashDenomination, SellingRate } from '../../types';

export const listDenominations = () => apiRequest<CashDenomination[]>('/fuel/denominations');

export const createDenomination = (data: { value: number; label?: string }) =>
  apiRequest<CashDenomination>('/fuel/denominations', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const loadDefaultDenominations = () =>
  apiRequest<CashDenomination[]>('/fuel/denominations/defaults', {
    method: 'POST',
    body: '{}',
  });

export const updateDenomination = (id: string, data: Record<string, unknown>) =>
  apiRequest<CashDenomination>(`/fuel/denominations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const listRates = (fuelTypeId?: string) =>
  apiRequest<SellingRate[]>(`/fuel/rates${fuelTypeId ? `?fuelTypeId=${fuelTypeId}` : ''}`);

export const createRate = (data: {
  fuelTypeId: string;
  sellingPrice: number;
  effectiveFrom?: string;
}) =>
  apiRequest<SellingRate>('/fuel/rates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
