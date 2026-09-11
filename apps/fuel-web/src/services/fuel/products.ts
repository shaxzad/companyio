import { apiRequest } from '../http';
import type { FuelType } from '../../types';

export const listFuelTypes = (includeInactive = false) =>
  apiRequest<FuelType[]>(`/fuel/types${includeInactive ? '?includeInactive=true' : ''}`);

export const createProduct = (data: Record<string, unknown>) =>
  apiRequest<FuelType>('/fuel/types', { method: 'POST', body: JSON.stringify(data) });

export const updateProduct = (id: string, data: Record<string, unknown>) =>
  apiRequest<FuelType>(`/fuel/types/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
