/** Round a number to a fixed number of decimal places. */
export const roundTo = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const formatMoney = (
  value: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
) => {
  const minimumFractionDigits = options?.minimumFractionDigits ?? 0;
  const maximumFractionDigits = Math.max(
    options?.maximumFractionDigits ?? minimumFractionDigits,
    minimumFractionDigits
  );
  const amount = Number.isFinite(value) ? value : 0;
  return `PKR ${amount.toLocaleString('en-PK', {
    minimumFractionDigits,
    maximumFractionDigits,
  })}`;
};

export const formatLitres = (value: number) => `${value.toLocaleString()} L`;

/** Today as `YYYY-MM-DD` in Asia/Karachi (station business calendar). */
export const todayYmd = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());

/**
 * Build an ISO timestamp for a business calendar day in Asia/Karachi.
 * Uses the current clock time-of-day on that YMD (or 12:00 if `atNoon`).
 */
export const businessDateTimeIso = (businessDateYmd: string, options?: { atNoon?: boolean }) => {
  const nowParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => nowParts.find((part) => part.type === type)?.value ?? '00';
  const time = options?.atNoon ? '12:00:00' : `${get('hour')}:${get('minute')}:${get('second')}`;
  return new Date(`${businessDateYmd}T${time}+05:00`).toISOString();
};


export const emptyRecord = (): Record<string, string> => ({});

/** Row amount for cash denomination counting (closing): quantity × note face value. */
export const denominationRowAmount = (quantity: number, faceValue: number): number => {
  if (!Number.isFinite(quantity) || !Number.isFinite(faceValue)) return 0;
  if (quantity < 0 || faceValue < 0) return 0;
  return quantity * faceValue;
};

/** Sum of denomination row amounts. */
export const denominationCashTotal = (
  rows: Array<{ quantity: number; faceValue: number }>
): number => rows.reduce((sum, row) => sum + denominationRowAmount(row.quantity, row.faceValue), 0);
