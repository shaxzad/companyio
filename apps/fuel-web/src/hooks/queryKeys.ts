/**
 * Central React Query key factory.
 * Always use these helpers so cache sharing / invalidation stays consistent.
 */
export const queryKeys = {
  stations: {
    all: ['stations'] as const,
  },
  fuelTypes: {
    all: ['fuelTypes'] as const,
    list: (includeInactive = false) => ['fuelTypes', { includeInactive }] as const,
  },
  organizations: {
    all: ['organizations'] as const,
    list: (includeInactive = false) => ['organizations', { includeInactive }] as const,
  },
  vehicles: {
    all: ['vehicles'] as const,
    list: (organizationId?: string, includeInactive = false) =>
      ['vehicles', { organizationId: organizationId ?? null, includeInactive }] as const,
  },
  assets: {
    byStation: (stationId: string) => ['stationAssets', stationId] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
  },
  denominations: {
    all: ['denominations'] as const,
  },
  rates: {
    all: ['rates'] as const,
    list: (fuelTypeId?: string) => ['rates', { fuelTypeId: fuelTypeId ?? null }] as const,
  },
  opening: {
    preview: (stationId: string, businessDate: string) =>
      ['openingPreview', stationId, businessDate] as const,
    days: (stationId: string) => ['businessDays', stationId] as const,
  },
  meterSales: {
    sheet: (stationId: string, businessDayId?: string) =>
      ['meterSaleSheet', stationId, businessDayId ?? null] as const,
  },
  receiving: {
    receipts: (stationId?: string, tankId?: string) =>
      ['receipts', { stationId: stationId ?? null, tankId: tankId ?? null }] as const,
  },
  credit: {
    sale: (saleId: string) => ['creditSale', saleId] as const,
    ledger: (organizationId: string) => ['companyLedger', organizationId] as const,
  },
  payments: {
    all: ['payments'] as const,
    accounts: (includeInactive = false, onlineOnly = false) =>
      ['paymentAccounts', { includeInactive, onlineOnly }] as const,
    summary: (stationId: string, businessDate: string) =>
      ['paymentsSummary', stationId, businessDate] as const,
  },
  users: {
    all: ['users'] as const,
    detail: (userId: string) => ['users', userId] as const,
  },
} as const;
