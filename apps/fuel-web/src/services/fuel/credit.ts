import { apiRequest } from '../http';
import type { CompanyLedger, CreateCreditSaleInput, CreditSale } from '../../types';

export const createCreditSale = (data: CreateCreditSaleInput) =>
  apiRequest<CreditSale>('/fuel/credit-sales', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getCreditSale = (saleId: string) =>
  apiRequest<CreditSale>(`/fuel/credit-sales/${saleId}`);

export const getCompanyLedger = (organizationId: string) =>
  apiRequest<CompanyLedger>(`/fuel/organizations/${organizationId}/ledger`);
