import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createReceiving, listReceipts } from '../services/fuel';
import type { CreateReceivingInput } from '../types';
import { queryKeys } from './queryKeys';

export function useReceipts(stationId?: string, tankId?: string) {
  return useQuery({
    queryKey: queryKeys.receiving.receipts(stationId, tankId),
    queryFn: () =>
      listReceipts({
        ...(stationId ? { stationId } : {}),
        ...(tankId ? { tankId } : {}),
      }),
    enabled: Boolean(stationId),
    staleTime: 30 * 1000,
  });
}

export function useCreateReceiving() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReceivingInput) => createReceiving(data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['receipts'] });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.assets.byStation(variables.stationId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
