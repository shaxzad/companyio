/**
 * Financial input helpers.
 * In this product, a blank field and an explicit `0` mean different things.
 * Never present bare `0` as a default that looks like a confirmed amount.
 */

export type FinancialInputOptions = {
  /** When true, persist/display an actual zero (e.g. already-saved opening). Default false. */
  allowZero?: boolean;
};

/**
 * Convert a numeric API/suggestion value into a controlled input string.
 * `0` → `''` unless `allowZero` is set.
 */
export const toFinancialInput = (
  value: number | string | null | undefined,
  options?: FinancialInputOptions
): string => {
  if (value === null || value === undefined || value === '') return '';
  const numeric = typeof value === 'number' ? value : Number(String(value).trim().replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return '';
  if (numeric === 0 && !options?.allowZero) return '';
  return String(numeric);
};

/** Parse a financial input. Empty → `null` (missing). Explicit `0` → `0`. */
export const parseFinancialInput = (raw: string): number | null => {
  const trimmed = raw.trim().replace(/,/g, '');
  if (trimmed === '') return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
};

/** Require a filled financial input. Empty throws; explicit `0` is allowed. */
export const requireFinancialInput = (raw: string, label: string): number => {
  const numeric = parseFinancialInput(raw);
  if (numeric === null) {
    throw new Error(`${label} is required.`);
  }
  return numeric;
};
