import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDenomination,
  createProduct,
  createPump,
  createNozzle,
  createRate,
  createStation,
  createTank,
  deleteDenomination,
  listDenominations,
  listRates,
  loadDefaultDenominations,
  updateDenomination,
  updateNozzle,
  updateProduct,
  updatePump,
  updateStation,
  updateTank,
} from '../services/fuel';
import { queryKeys } from './queryKeys';

export function useDenominations() {
  return useQuery({
    queryKey: queryKeys.denominations.all,
    queryFn: listDenominations,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRates(fuelTypeId?: string) {
  return useQuery({
    queryKey: queryKeys.rates.list(fuelTypeId),
    queryFn: () => listRates(fuelTypeId),
    staleTime: 60 * 1000,
  });
}

export function useStationMutations() {
  const queryClient = useQueryClient();
  const invalidateStations = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.stations.all });

  return {
    createStation: useMutation({ mutationFn: createStation, onSuccess: invalidateStations }),
    updateStation: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
        updateStation(id, data),
      onSuccess: invalidateStations,
    }),
  };
}

export function useProductMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.fuelTypes.all });

  return {
    createProduct: useMutation({ mutationFn: createProduct, onSuccess: invalidate }),
    updateProduct: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
        updateProduct(id, data),
      onSuccess: invalidate,
    }),
  };
}

export function useAssetMutations(stationId?: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    if (stationId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.assets.byStation(stationId) });
    }
  };

  return {
    createTank: useMutation({ mutationFn: createTank, onSuccess: invalidate }),
    updateTank: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
        updateTank(id, data),
      onSuccess: invalidate,
    }),
    createPump: useMutation({ mutationFn: createPump, onSuccess: invalidate }),
    updatePump: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
        updatePump(id, data),
      onSuccess: invalidate,
    }),
    createNozzle: useMutation({ mutationFn: createNozzle, onSuccess: invalidate }),
    updateNozzle: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
        updateNozzle(id, data),
      onSuccess: invalidate,
    }),
  };
}

export function useDenominationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.denominations.all });

  return {
    createDenomination: useMutation({ mutationFn: createDenomination, onSuccess: invalidate }),
    loadDefaults: useMutation({ mutationFn: loadDefaultDenominations, onSuccess: invalidate }),
    updateDenomination: useMutation({
      mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
        updateDenomination(id, data),
      onSuccess: invalidate,
    }),
    deleteDenomination: useMutation({
      mutationFn: (id: string) => deleteDenomination(id),
      onSuccess: invalidate,
    }),
  };
}

export function useRateMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.rates.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.fuelTypes.all });
  };

  return {
    createRate: useMutation({ mutationFn: createRate, onSuccess: invalidate }),
  };
}
