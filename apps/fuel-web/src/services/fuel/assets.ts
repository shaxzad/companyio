import { apiRequest } from '../http';
import type { StationAssets } from '../../types';

export const getStationAssets = (stationId: string) =>
  apiRequest<StationAssets>(`/fuel/stations/${stationId}/assets`);

export const createTank = (data: Record<string, unknown>) =>
  apiRequest('/fuel/tanks', { method: 'POST', body: JSON.stringify(data) });

export const updateTank = (id: string, data: Record<string, unknown>) =>
  apiRequest(`/fuel/tanks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const createPump = (data: Record<string, unknown>) =>
  apiRequest('/fuel/pumps', { method: 'POST', body: JSON.stringify(data) });

export const updatePump = (id: string, data: Record<string, unknown>) =>
  apiRequest(`/fuel/pumps/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const createNozzle = (data: Record<string, unknown>) =>
  apiRequest('/fuel/nozzles', { method: 'POST', body: JSON.stringify(data) });

export const updateNozzle = (id: string, data: Record<string, unknown>) =>
  apiRequest(`/fuel/nozzles/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
