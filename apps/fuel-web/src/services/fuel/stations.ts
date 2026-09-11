import { apiRequest } from '../http';
import type { Station } from '../../types';

export const listStations = () => apiRequest<Station[]>('/fuel/stations');

export const createStation = (data: {
  name: string;
  code: string;
  address?: string;
  city?: string;
}) => apiRequest<Station>('/fuel/stations', { method: 'POST', body: JSON.stringify(data) });

export const updateStation = (id: string, data: Record<string, unknown>) =>
  apiRequest<Station>(`/fuel/stations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
