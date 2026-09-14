export type MeterSaleRow = {
  nozzleId: string;
  pumpName: string;
  pumpNumber: string;
  nozzleNumber: string;
  fuelTypeId: string;
  productName: string;
  productCode: string;
  tankId: string | null;
  tankName: string | null;
  openingReading: number;
  suggestedRate: number;
  closingReading: number | null;
  unitPrice: number;
  litres: number;
  amount: number;
  rateOverrideReason: string | null;
};

export type ProductSaleTotal = {
  productCode: string;
  productName: string;
  litres: number;
  amount: number;
};

export type MeterSaleSheet = {
  businessDay: { id: string; businessDate: string; status: 'OPEN' | 'CLOSED' };
  alreadyPosted: boolean;
  postedSale: {
    id: string;
    saleNumber: string;
    soldAt: string;
    enteredAt: string;
    totalLitres: number;
    totalAmount: number;
  } | null;
  rows: MeterSaleRow[];
  productTotals: ProductSaleTotal[];
  grandTotal: { litres: number; amount: number };
};

export type PostMeterSalesInput = {
  stationId: string;
  businessDayId: string;
  soldAt?: string;
  lines: Array<{
    nozzleId: string;
    closingMeter: number;
    unitPrice?: number;
    rateOverrideReason?: string;
  }>;
};

export type PostMeterSalesResult = {
  id: string;
  saleNumber: string;
  soldAt: string;
  enteredAt: string;
  totalLitres: number;
  totalAmount: number;
  productTotals: ProductSaleTotal[];
};
