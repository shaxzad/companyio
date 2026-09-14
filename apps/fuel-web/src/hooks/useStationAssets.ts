import { useQuery } from '@tanstack/react-query';
import { getStationAssets } from '../services/fuel';
import { queryKeys } from './queryKeys';

const ASSETS_STALE_MS = 60 * 1000;

export function useStationAssets(stationId: string | undefined | null) {
  return useQuery({
    queryKey: queryKeys.assets.byStation(stationId ?? ''),
    queryFn: () => getStationAssets(stationId!),
    enabled: Boolean(stationId),
    staleTime: ASSETS_STALE_MS,
  });
}
