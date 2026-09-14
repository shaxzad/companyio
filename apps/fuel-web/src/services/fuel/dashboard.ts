import { apiRequest } from '../http';
import type { FuelDashboard } from '../../types';

export const getFuelDashboard = () => apiRequest<FuelDashboard>('/fuel/dashboard');
