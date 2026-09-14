import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPayment,
  createPaymentAccount,
  listPaymentAccounts,
  listPayments,
  loadDefaultPaymentAccounts,
  updatePaymentAccount,
} from '../services/fuel';
import type { CreatePaymentAccountInput, CreatePaymentInput } from '../types';
import { queryKeys } from './queryKeys';

export function usePaymentAccounts(options?: { includeInactive?: boolean; onlineOnly?: boolean }) {
  return useQuery({
    queryKey: queryKeys.payments.accounts(options?.includeInactive, options?.onlineOnly),
    queryFn: () => listPaymentAccounts(options),
  });
}

export function usePaymentsSummary(stationId?: string, businessDate?: string) {
  return useQuery({
    queryKey: queryKeys.payments.summary(stationId ?? '', businessDate ?? ''),
    queryFn: () =>
      listPayments({
        stationId: stationId!,
        businessDate,
        onlineOnly: true,
      }),
    enabled: Boolean(stationId),
  });
}

export function usePaymentMutations(stationId?: string, businessDate?: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    void queryClient.invalidateQueries({ queryKey: ['paymentsSummary'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  return {
    createPayment: useMutation({
      mutationFn: (data: CreatePaymentInput) => createPayment(data),
      onSuccess: (payment) => {
        invalidate();
        if (payment.organizationId) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.credit.ledger(payment.organizationId),
          });
        }
      },
    }),
    createPaymentAccount: useMutation({
      mutationFn: (data: CreatePaymentAccountInput) => createPaymentAccount(data),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['paymentAccounts'] });
      },
    }),
    loadDefaults: useMutation({
      mutationFn: () => loadDefaultPaymentAccounts(),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['paymentAccounts'] });
      },
    }),
    updatePaymentAccount: useMutation({
      mutationFn: ({
        id,
        data,
      }: {
        id: string;
        data: Partial<CreatePaymentAccountInput> & { active?: boolean };
      }) => updatePaymentAccount(id, data),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['paymentAccounts'] });
      },
    }),
  };
}
