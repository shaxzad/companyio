import { useMemo, useState } from 'react';
import type { CashDenomination } from '../types';
import { buildCashCountLines, emptyRecord, totalCashFromLines } from '../utils';

/**
 * Client draft for cash denomination counting (F11).
 * Counts are UI state until a closing API persists them.
 */
export function useCashCountDraft(denominations: CashDenomination[]) {
  const [counts, setCounts] = useState<Record<string, string>>(emptyRecord);

  const lines = useMemo(
    () => buildCashCountLines(denominations, counts),
    [counts, denominations]
  );

  const totalCash = useMemo(() => totalCashFromLines(lines), [lines]);
  const hasInvalid = lines.some((line) => line.invalid);

  const setCount = (denominationId: string, next: string) => {
    setCounts((prev) => ({ ...prev, [denominationId]: next }));
  };

  const bumpCount = (denominationId: string, delta: number) => {
    setCounts((prev) => {
      const current = prev[denominationId] ?? '';
      const parsed = current.trim() === '' ? 0 : Number(current);
      const base = Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
      const next = Math.max(0, base + delta);
      return { ...prev, [denominationId]: next === 0 ? '' : String(next) };
    });
  };

  const clearCounts = () => setCounts(emptyRecord());

  return {
    counts,
    lines,
    totalCash,
    hasInvalid,
    setCount,
    bumpCount,
    clearCounts,
  };
}
