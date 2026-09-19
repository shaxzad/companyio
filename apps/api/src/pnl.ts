/** Feature 14 — Daily P&L math with Section 5 placeholders (not permanent guesses). */

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const COSTING_METHODS = ['PURCHASE_RATE', 'WEIGHTED_AVERAGE', 'FIFO'] as const;
export type CostingMethod = (typeof COSTING_METHODS)[number];

export const ACCESS_VALUATIONS = ['PURCHASE', 'SELLING'] as const;
export type AccessValuation = (typeof ACCESS_VALUATIONS)[number];

export const TANKER_TIP_MODES = ['SEPARATE', 'FOLDED_INTO_FUEL_COST'] as const;
export type TankerTipMode = (typeof TANKER_TIP_MODES)[number];

export const REOPEN_POLICIES = ['OWNER_ONLY', 'OWNER_AND_MANAGER'] as const;
export type ReopenPolicy = (typeof REOPEN_POLICIES)[number];

export type PnlSettings = {
  costingMethod: CostingMethod;
  accessValuation: AccessValuation;
  tankerTipInPnl: TankerTipMode;
  /** Section 5 Q12 — who may reopen a closed day. */
  reopenPolicy: ReopenPolicy;
};

export const DEFAULT_PNL_SETTINGS: PnlSettings = {
  /** Placeholder until Section 5 Q2 — use product purchase rate × litres sold. */
  costingMethod: 'PURCHASE_RATE',
  /** Placeholder until Section 5 Q1 — receipts already store accessRate from chosen mode. */
  accessValuation: 'PURCHASE',
  /** Placeholder until Section 5 Q9 — tip as its own P&L cost line. */
  tankerTipInPnl: 'SEPARATE',
  /** Placeholder until Section 5 Q12 — owner only by default. */
  reopenPolicy: 'OWNER_ONLY',
};

export const parsePnlSettings = (raw: unknown): PnlSettings => {
  const record =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const costingMethod = COSTING_METHODS.includes(record.costingMethod as CostingMethod)
    ? (record.costingMethod as CostingMethod)
    : DEFAULT_PNL_SETTINGS.costingMethod;
  const accessValuation = ACCESS_VALUATIONS.includes(record.accessValuation as AccessValuation)
    ? (record.accessValuation as AccessValuation)
    : DEFAULT_PNL_SETTINGS.accessValuation;
  const tankerTipInPnl = TANKER_TIP_MODES.includes(record.tankerTipInPnl as TankerTipMode)
    ? (record.tankerTipInPnl as TankerTipMode)
    : DEFAULT_PNL_SETTINGS.tankerTipInPnl;
  const reopenPolicy = REOPEN_POLICIES.includes(record.reopenPolicy as ReopenPolicy)
    ? (record.reopenPolicy as ReopenPolicy)
    : DEFAULT_PNL_SETTINGS.reopenPolicy;
  return { costingMethod, accessValuation, tankerTipInPnl, reopenPolicy };
};

export const canReopenDay = (role: string, policy: ReopenPolicy) => {
  if (role === 'owner') return true;
  if (policy === 'OWNER_AND_MANAGER' && role === 'manager') return true;
  return false;
};

export type PnlInputs = {
  /** Cash / metre pump sales (F4). */
  cashSalesRevenue: number;
  /** Company credit sales (F7) — shown separately from cash revenue. */
  creditSalesRevenue: number;
  /** Online receipts (F8) — cash-flow line, not in Net P&L formula. */
  onlinePaymentsTotal: number;
  /** Litres sold (cash + credit) × unit cost under active costing placeholder. */
  fuelCost: number;
  tankerTipTotal: number;
  /** Expenses excluding amounts already counted as tanker tip when tip is SEPARATE. */
  otherExpenses: number;
  /** Access litres × access rate from tanker receipts (F5). */
  accessGain: number;
  /** (Selling − cost) × litres sold — placeholder price variance. */
  priceGainLoss: number;
  settings: PnlSettings;
};

export type PnlResult = {
  /** Fuel sales revenue used in Net = cash + credit (accounting revenue). */
  revenue: number;
  cashSalesRevenue: number;
  creditSalesRevenue: number;
  onlinePaymentsTotal: number;
  fuelCost: number;
  tankerTipTotal: number;
  tankerTipAppliedToFuelCost: number;
  tankerTipShownSeparate: number;
  otherExpenses: number;
  accessGain: number;
  priceGainLoss: number;
  /**
   * Net = Revenue − Fuel Cost − Other Expenses − Tanker Tip (if separate) + Access / Gain
   * Price Gain / Loss is shown as gross margin (Revenue − Fuel Cost) for transparency;
   * it is not added again into Net until Section 5 confirms the exact formula.
   */
  netProfitLoss: number;
  settings: PnlSettings;
  notes: string[];
};

export function computeDailyPnl(input: PnlInputs): PnlResult {
  const cashSalesRevenue = round2(input.cashSalesRevenue);
  const creditSalesRevenue = round2(input.creditSalesRevenue);
  const onlinePaymentsTotal = round2(input.onlinePaymentsTotal);
  const revenue = round2(cashSalesRevenue + creditSalesRevenue);

  let fuelCost = round2(input.fuelCost);
  const tankerTipTotal = round2(input.tankerTipTotal);
  let tankerTipAppliedToFuelCost = 0;
  let tankerTipShownSeparate = 0;

  if (input.settings.tankerTipInPnl === 'FOLDED_INTO_FUEL_COST') {
    tankerTipAppliedToFuelCost = tankerTipTotal;
    fuelCost = round2(fuelCost + tankerTipTotal);
  } else {
    tankerTipShownSeparate = tankerTipTotal;
  }

  const otherExpenses = round2(input.otherExpenses);
  const accessGain = round2(input.accessGain);
  /** Displayed gross margin; not double-counted in Net (Section 5 pending). */
  const priceGainLoss = round2(input.priceGainLoss);

  const netProfitLoss = round2(
    revenue - fuelCost - otherExpenses - tankerTipShownSeparate + accessGain
  );

  const notes: string[] = [
    `Costing method: ${input.settings.costingMethod} (Section 5 — not a permanent choice).`,
    `Access valuation preference: ${input.settings.accessValuation} (receipts store the rate used at entry).`,
    input.settings.tankerTipInPnl === 'FOLDED_INTO_FUEL_COST'
      ? 'Tanker tip is folded into fuel cost for this P&L.'
      : 'Tanker tip is shown as a separate cost line.',
    'Online payments are listed for cash context only — they are not added into Net Profit / Loss.',
    'Price Gain / Loss shows Revenue − Fuel Cost (gross). It is not added again into Net until the owner confirms the formula.',
  ];

  return {
    revenue,
    cashSalesRevenue,
    creditSalesRevenue,
    onlinePaymentsTotal,
    fuelCost,
    tankerTipTotal,
    tankerTipAppliedToFuelCost,
    tankerTipShownSeparate,
    otherExpenses,
    accessGain,
    priceGainLoss,
    netProfitLoss,
    settings: input.settings,
    notes,
  };
}
