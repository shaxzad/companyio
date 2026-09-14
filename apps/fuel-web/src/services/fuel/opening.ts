import { apiRequest } from '../http';
import type { BusinessDay, OpenBusinessDayInput, OpeningPreview } from '../../types';

export const previewOpening = (stationId: string, businessDate: string) =>
  apiRequest<OpeningPreview>(
    `/fuel/days/preview?stationId=${encodeURIComponent(stationId)}&businessDate=${encodeURIComponent(businessDate)}`
  );

export const listBusinessDays = (stationId: string) =>
  apiRequest<BusinessDay[]>(`/fuel/days?stationId=${encodeURIComponent(stationId)}`);

export const openBusinessDay = (data: OpenBusinessDayInput) =>
  apiRequest<BusinessDay>('/fuel/days', { method: 'POST', body: JSON.stringify(data) });
