import { apiRequest } from '../http';
import type {
  CreatePaymentAccountInput,
  CreatePaymentInput,
  PaymentAccount,
  PaymentRow,
  PaymentsSummary,
} from '../../types';

export const listPaymentAccounts = (options?: { includeInactive?: boolean; onlineOnly?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.includeInactive) params.set('includeInactive', 'true');
  if (options?.onlineOnly) params.set('onlineOnly', 'true');
  const query = params.toString();
  return apiRequest<PaymentAccount[]>(`/fuel/payment-accounts${query ? `?${query}` : ''}`);
};

export const createPaymentAccount = (data: CreatePaymentAccountInput) =>
  apiRequest<PaymentAccount>('/fuel/payment-accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const loadDefaultPaymentAccounts = () =>
  apiRequest<{ created: number; accounts: PaymentAccount[] }>('/fuel/payment-accounts/defaults', {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const updatePaymentAccount = (id: string, data: Partial<CreatePaymentAccountInput> & { active?: boolean }) =>
  apiRequest<PaymentAccount>(`/fuel/payment-accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const listPayments = (options: {
  stationId: string;
  businessDate?: string;
  onlineOnly?: boolean;
}) => {
  const params = new URLSearchParams({ stationId: options.stationId });
  if (options.businessDate) params.set('businessDate', options.businessDate);
  if (options.onlineOnly) params.set('onlineOnly', 'true');
  return apiRequest<PaymentsSummary>(`/fuel/payments?${params.toString()}`);
};

export const createPayment = (data: CreatePaymentInput) =>
  apiRequest<PaymentRow>('/fuel/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
