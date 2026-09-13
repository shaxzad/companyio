export type PaymentMethodKind = 'CASH' | 'BANK' | 'CARD' | 'TRANSFER';

export type PaymentAccount = {
  id: string;
  businessId: string;
  name: string;
  code: string;
  kind: PaymentMethodKind;
  sortOrder: number;
  active: boolean;
};

export type PaymentRow = {
  id: string;
  stationId: string;
  organizationId: string | null;
  paymentAccountId: string | null;
  saleId: string | null;
  amount: number;
  quantity: number;
  method: PaymentMethodKind;
  reference: string | null;
  paidAt: string;
  notes: string | null;
  organization?: { id: string; name: string } | null;
  paymentAccount?: { id: string; name: string; code: string; kind: PaymentMethodKind } | null;
  sale?: { id: string; invoiceNumber: string | null; saleNumber: string } | null;
};

export type PaymentsSummary = {
  businessDate: string;
  dailyTotal: number;
  monthlyTotal: number;
  dailyCount: number;
  monthlyCount: number;
  payments: PaymentRow[];
};

export type CreatePaymentInput = {
  stationId: string;
  paymentAccountId: string;
  amount: number;
  quantity?: number;
  organizationId?: string;
  saleId?: string;
  reference?: string;
  paidAt?: string;
  notes?: string;
};

export type CreatePaymentAccountInput = {
  name: string;
  code: string;
  kind: PaymentMethodKind;
  sortOrder?: number;
};
