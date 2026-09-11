import type { CashDenomination } from '../types';
import { denominationCashTotal, denominationRowAmount } from './format';
import { parseFinancialInput } from './financial';

/** Display label for a note face value (config-driven, not hard-coded). */
export const denominationDisplayLabel = (row: Pick<CashDenomination, 'value' | 'label'>): string => {
  const faceValue = Number(row.value);
  if (row.label?.trim()) return row.label.trim();
  if (!Number.isFinite(faceValue)) return '—';
  return `PKR ${faceValue.toLocaleString('en-PK')}`;
};

/**
 * Parse a note-count field for cash closing.
 * Empty → treated as 0 notes for amount math (input stays blank).
 * Negative / non-numeric → null (invalid).
 */
export const parseNoteCount = (raw: string): number | null => {
  const trimmed = raw.trim().replace(/,/g, '');
  if (trimmed === '') return 0;
  const numeric = parseFinancialInput(trimmed);
  if (numeric === null) return null;
  if (!Number.isInteger(numeric) || numeric < 0) return null;
  return numeric;
};

export type CashCountLine = {
  denominationId: string;
  faceValue: number;
  label: string;
  countRaw: string;
  count: number;
  amount: number;
  calcText: string;
  invalid: boolean;
};

/** Build live count rows for active denominations only. */
export const buildCashCountLines = (
  denominations: CashDenomination[],
  counts: Record<string, string>
): CashCountLine[] =>
  denominations
    .filter((row) => row.active)
    .map((row) => {
      const faceValue = Number(row.value);
      const countRaw = counts[row.id] ?? '';
      const parsed = parseNoteCount(countRaw);
      const invalid = parsed === null || !Number.isFinite(faceValue) || faceValue <= 0;
      const count = parsed ?? 0;
      const amount =
        invalid || faceValue <= 0 ? 0 : denominationRowAmount(count, faceValue);
      const calcText =
        countRaw.trim() === '' || invalid
          ? `— × ${faceValue.toLocaleString('en-PK')}`
          : `${count.toLocaleString('en-PK')} × ${faceValue.toLocaleString('en-PK')}`;

      return {
        denominationId: row.id,
        faceValue,
        label: denominationDisplayLabel(row),
        countRaw,
        count,
        amount,
        calcText,
        invalid,
      };
    })
    .sort((a, b) => b.faceValue - a.faceValue);

export const totalCashFromLines = (lines: CashCountLine[]): number =>
  denominationCashTotal(lines.map((line) => ({ quantity: line.count, faceValue: line.faceValue })));
