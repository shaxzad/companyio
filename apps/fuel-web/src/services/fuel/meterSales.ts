import { apiRequest } from '../http';
import type { MeterSaleSheet, PostMeterSalesInput, PostMeterSalesResult } from '../../types';

export const getMeterSaleSheet = (stationId: string, businessDayId?: string) =>
  apiRequest<MeterSaleSheet>(
    `/fuel/meter-sales/sheet?stationId=${encodeURIComponent(stationId)}${
      businessDayId ? `&businessDayId=${encodeURIComponent(businessDayId)}` : ''
    }`
  );

export const postMeterSales = (data: PostMeterSalesInput) =>
  apiRequest<PostMeterSalesResult>('/fuel/meter-sales', {
    method: 'POST',
    body: JSON.stringify(data),
  });
