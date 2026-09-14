import { useQuery } from '@tanstack/react-query';
import { getFuelDashboard } from '../services/fuel';
import { queryKeys } from './queryKeys';

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: getFuelDashboard,
    staleTime: 30 * 1000,
  });
}
