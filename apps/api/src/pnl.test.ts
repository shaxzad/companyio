import { describe, expect, it } from 'vitest';
import { computeDailyPnl, DEFAULT_PNL_SETTINGS } from './pnl.ts';

describe('computeDailyPnl (Feature 14)', () => {
  it('keeps cash context separate and does not double-count price gain', () => {
    const result = computeDailyPnl({
      cashSalesRevenue: 800_000,
      creditSalesRevenue: 200_000,
      onlinePaymentsTotal: 50_000,
      fuelCost: 700_000,
      tankerTipTotal: 5_000,
      otherExpenses: 20_000,
      accessGain: 3_000,
      priceGainLoss: 300_000,
      settings: DEFAULT_PNL_SETTINGS,
    });

    expect(result.revenue).toBe(1_000_000);
    expect(result.onlinePaymentsTotal).toBe(50_000);
    expect(result.tankerTipShownSeparate).toBe(5_000);
    // Net = 1_000_000 - 700_000 - 20_000 - 5_000 + 3_000 = 278_000 (price gain not added again)
    expect(result.netProfitLoss).toBe(278_000);
    expect(result.priceGainLoss).toBe(300_000);
  });

  it('can fold tanker tip into fuel cost', () => {
    const result = computeDailyPnl({
      cashSalesRevenue: 100_000,
      creditSalesRevenue: 0,
      onlinePaymentsTotal: 0,
      fuelCost: 80_000,
      tankerTipTotal: 2_000,
      otherExpenses: 0,
      accessGain: 0,
      priceGainLoss: 20_000,
      settings: { ...DEFAULT_PNL_SETTINGS, tankerTipInPnl: 'FOLDED_INTO_FUEL_COST' },
    });
    expect(result.fuelCost).toBe(82_000);
    expect(result.tankerTipShownSeparate).toBe(0);
    expect(result.netProfitLoss).toBe(18_000);
  });
});
