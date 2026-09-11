/** Round a number to a fixed number of decimal places. */
export const roundTo = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const formatMoney = (
  value: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
) =>
  `PKR ${value.toLocaleString('en-PK', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  })}`;

export const formatLitres = (value: number) => `${value.toLocaleString()} L`;

export const toErrorMessage = (caught: unknown, fallback = 'Something went wrong.') =>
  caught instanceof Error ? caught.message : typeof caught === 'string' ? caught : fallback;

/** Today as `YYYY-MM-DD` in Asia/Karachi (station business calendar). */
export const todayYmd = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());


export const emptyRecord = (): Record<string, string> => ({});
