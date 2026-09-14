import { useQuery } from '@tanstack/react-query';
import { listStations } from '../services/fuel';
import { queryKeys } from './queryKeys';

const STATIONS_STALE_MS = 5 * 60 * 1000;

export function useStations() {
  return useQuery({
    queryKey: queryKeys.stations.all,
    queryFn: listStations,
    staleTime: STATIONS_STALE_MS,
  });
}
