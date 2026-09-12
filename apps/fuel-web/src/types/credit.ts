export type CreditSaleLine = {
  id: string;
  fuelTypeId: string;
  productName: string;
  productCode: string;
  litres: number;
  unitPrice: number;
  amount: number;
};

export type CreditSale = {
  id: string;
  saleNumber: string;
  invoiceNumber: string | null;
  driverName: string | null;
  saleType: 'CREDIT';
  soldAt: string;
  createdAt: string;
  totalAmount: number;
  totalLitres: number;
  notes: string | null;
  station: {
    id: string;
    name: string;
    code: string;
    address?: string | null;
    logoUrl?: string | null;
  };
  organization: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    creditType?: string;
  } | null;
  vehicle: {
    id: string;
    registration: string;
    driver?: string | null;
  } | null;
  lines: CreditSaleLine[];
};

export type CreateCreditSaleInput = {
  stationId: string;
  organizationId: string;
  vehicleId: string;
  fuelTypeId: string;
  tankId: string;
  litres: number;
  unitPrice?: number;
  driverName?: string;
  soldAt?: string;
  notes?: string;
};

export type LedgerEntry = {
  date: string;
  type: 'OPENING' | 'CREDIT' | 'PAYMENT';
  debit: number;
  credit: number;
  balance: number;
  reference: string;
  description: string;
  saleId?: string;
};

export type CompanyLedger = {
  organization: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    creditType?: string;
    creditLimit: number;
    openingBalance: number;
    active: boolean;
  };
  ledger: LedgerEntry[];
  outstanding: number;
};
