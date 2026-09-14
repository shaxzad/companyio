import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCreditSale, getCompanyLedger, getCreditSale } from '../services/fuel';
import type { CreateCreditSaleInput } from '../types';
import { queryKeys } from './queryKeys';

export function useCreditSale(saleId?: string) {
  return useQuery({
    queryKey: queryKeys.credit.sale(saleId ?? ''),
    queryFn: () => getCreditSale(saleId!),
    enabled: Boolean(saleId),
  });
}

export function useCompanyLedger(organizationId?: string) {
  return useQuery({
    queryKey: queryKeys.credit.ledger(organizationId ?? ''),
    queryFn: () => getCompanyLedger(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useCreditSaleMutations() {
  const queryClient = useQueryClient();

  return {
    createCreditSale: useMutation({
      mutationFn: (data: CreateCreditSaleInput) => createCreditSale(data),
      onSuccess: (sale) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        void queryClient.invalidateQueries({ queryKey: ['stationAssets'] });
        if (sale.organization?.id) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.credit.ledger(sale.organization.id),
          });
        }
      },
    }),
  };
}
