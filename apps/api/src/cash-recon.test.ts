import { describe, expect, it } from 'vitest';
import { computeCashReconciliation } from './cash-recon.ts';

describe('computeCashReconciliation (Feature 13)', () => {
  it('matches the paper-form Cash in Hand chain', () => {
    // Sample shape from gap notes: total 1,544,176 → expected 1,373,476
    const result = computeCashReconciliation({
      productSales: [
        { productCode: 'PMG', productName: 'Petrol', amount: 900_000 },
        { productCode: 'HSD', productName: 'Diesel', amount: 500_000 },
      ],
      bbfCash: 144_176,
      creditSalesTotal: 100_000,
      cashPaidOutTotal: 70_700,
      actualCashCounted: 1_200_000,
      onlinePaymentsTotal: 173_476,
    });

    expect(result.saleTotal).toBe(1_400_000);
    expect(result.total).toBe(1_544_176);
    expect(result.expectedCashInHand).toBe(1_373_476);
    expect(result.actualPlusOnline).toBe(1_373_476);
    expect(result.difference).toBe(0);
    expect(result.hasDifference).toBe(false);
  });

  it('flags a non-zero difference', () => {
    const result = computeCashReconciliation({
      productSales: [{ productCode: 'PMG', productName: 'Petrol', amount: 100_000 }],
      bbfCash: 0,
      creditSalesTotal: 0,
      cashPaidOutTotal: 0,
      actualCashCounted: 90_000,
      onlinePaymentsTotal: 0,
    });
    expect(result.expectedCashInHand).toBe(100_000);
    expect(result.difference).toBe(10_000);
    expect(result.hasDifference).toBe(true);
  });
});
