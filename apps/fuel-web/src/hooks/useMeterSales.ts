import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMeterSaleSheet, postMeterSales } from '../services/fuel';
import type { PostMeterSalesInput } from '../types';
import { queryKeys } from './queryKeys';

export function useMeterSaleSheet(stationId: string, businessDayId?: string) {
  return useQuery({
    queryKey: queryKeys.meterSales.sheet(stationId, businessDayId),
    queryFn: () => getMeterSaleSheet(stationId, businessDayId),
    enabled: Boolean(stationId),
    staleTime: 10 * 1000,
    retry: false,
  });
}

export function usePostMeterSales() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PostMeterSalesInput) => postMeterSales(data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.meterSales.sheet(variables.stationId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.assets.byStation(variables.stationId),
      });
    },
  });
}
