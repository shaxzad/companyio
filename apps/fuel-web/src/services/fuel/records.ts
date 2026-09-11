import { apiRequest } from '../http';

/** Generic POST helper for legacy FuelRecordPage endpoints. Prefer domain services for new work. */
export const createFuelRecord = (path: string, data: Record<string, unknown>) =>
  apiRequest(path, { method: 'POST', body: JSON.stringify(data) });
