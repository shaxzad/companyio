/** Pure paper-form cash reconciliation math (Feature 13 / Gaps 2.1–2.2). */

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export type CashReconInputs = {
  /** Meter / cash pump sales by product (e.g. PMG, HSD). */
  productSales: Array<{ productCode: string; productName: string; amount: number }>;
  bbfCash: number;
  creditSalesTotal: number;
  cashPaidOutTotal: number;
  actualCashCounted: number;
  onlinePaymentsTotal: number;
};

export type CashReconResult = {
  saleTotal: number;
  productSales: Array<{ productCode: string; productName: string; amount: number }>;
  bbfCash: number;
  /** Total = Sale(s) + BBF Cash */
  total: number;
  creditSalesTotal: number;
  cashPaidOutTotal: number;
  /** Expected Cash in Hand = Total − Credit Sales − Cash Paid Out */
  expectedCashInHand: number;
  actualCashCounted: number;
  onlinePaymentsTotal: number;
  /** Actual cash + online receipts covering the expected position */
  actualPlusOnline: number;
  /** Difference = Expected − (Actual Cash + Online Payments) */
  difference: number;
  hasDifference: boolean;
};

export function computeCashReconciliation(input: CashReconInputs): CashReconResult {
  const productSales = input.productSales.map((row) => ({
    productCode: row.productCode,
    productName: row.productName,
    amount: round2(row.amount),
  }));
  const saleTotal = round2(productSales.reduce((sum, row) => sum + row.amount, 0));
  const bbfCash = round2(input.bbfCash);
  const creditSalesTotal = round2(input.creditSalesTotal);
  const cashPaidOutTotal = round2(input.cashPaidOutTotal);
  const actualCashCounted = round2(input.actualCashCounted);
  const onlinePaymentsTotal = round2(input.onlinePaymentsTotal);

  const total = round2(saleTotal + bbfCash);
  const expectedCashInHand = round2(total - creditSalesTotal - cashPaidOutTotal);
  const actualPlusOnline = round2(actualCashCounted + onlinePaymentsTotal);
  const difference = round2(expectedCashInHand - actualPlusOnline);

  return {
    saleTotal,
    productSales,
    bbfCash,
    total,
    creditSalesTotal,
    cashPaidOutTotal,
    expectedCashInHand,
    actualCashCounted,
    onlinePaymentsTotal,
    actualPlusOnline,
    difference,
    hasDifference: Math.abs(difference) > 0.009,
  };
}
