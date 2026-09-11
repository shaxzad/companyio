import { useQuery } from '@tanstack/react-query';
import { listFuelTypes } from '../services/fuel';
import { queryKeys } from './queryKeys';

const FUEL_TYPES_STALE_MS = 5 * 60 * 1000;

export function useFuelTypes(includeInactive = false) {
  return useQuery({
    queryKey: queryKeys.fuelTypes.list(includeInactive),
    queryFn: () => listFuelTypes(includeInactive),
    staleTime: FUEL_TYPES_STALE_MS,
  });
}
