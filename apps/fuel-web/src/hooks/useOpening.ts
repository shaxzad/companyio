import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { openBusinessDay, previewOpening } from '../services/fuel';
import type { OpenBusinessDayInput } from '../types';
import { queryKeys } from './queryKeys';

export function useOpeningPreview(stationId: string, businessDate: string) {
  return useQuery({
    queryKey: queryKeys.opening.preview(stationId, businessDate),
    queryFn: () => previewOpening(stationId, businessDate),
    enabled: Boolean(stationId && businessDate),
    staleTime: 15 * 1000,
  });
}

export function useOpenBusinessDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OpenBusinessDayInput) => openBusinessDay(data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.opening.preview(variables.stationId, variables.businessDate),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.opening.days(variables.stationId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.meterSales.sheet(variables.stationId),
      });
    },
  });
}
