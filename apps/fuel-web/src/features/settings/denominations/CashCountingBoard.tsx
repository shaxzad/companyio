import { useMemo } from 'react';
import {
  DataTable,
  type DataTableColumn,
  secondaryActionClass,
  surfaceClass,
} from '@companyio/platform-ui';
import type { CashCountLine } from '../../../utils';
import { formatMoney } from '../../../utils';
type CashCountingBoardProps = {
  lines: CashCountLine[];
  totalCash: number;
  onCountChange: (denominationId: string, value: string) => void;
  onBump: (denominationId: string, delta: number) => void;
  onClear: () => void;
  emptyHint?: string;
};

export function CashCountingBoard({
  lines,
  totalCash,
  onCountChange,
  onBump,
  onClear,
  emptyHint,
}: CashCountingBoardProps) {
  const columns = useMemo<DataTableColumn<CashCountLine>[]>(
    () => [
      {
        id: 'denomination',
        header: 'Denomination',
        cell: (line) => (
          <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
            {line.label}
          </p>
        ),
      },
      {
        id: 'count',
        header: 'Count',
        headerClassName: 'text-center',
        cell: (line) => (
          <CountStepper
            id={`count-${line.denominationId}`}
            value={line.countRaw}
            invalid={line.invalid}
            onChange={(next) => onCountChange(line.denominationId, next)}
            onBump={(delta) => onBump(line.denominationId, delta)}
          />
        ),
      },
      {
        id: 'calculation',
        header: 'Calculation',
        className: 'text-xs tabular-nums text-gray-500 dark:text-gray-400',
        cell: (line) => line.calcText,
      },
      {
        id: 'amount',
        header: 'Amount',
        className: 'text-end text-sm font-semibold tabular-nums text-brand-600 dark:text-brand-400',
        headerClassName: 'text-end',
        cell: (line) =>
          line.countRaw.trim() === '' || line.invalid ? '—' : formatMoney(line.amount),
      },
    ],
    [onBump, onCountChange]
  );

  if (lines.length === 0) {
    return (
      <section className={`${surfaceClass} p-6 text-center`}>
        <p className="text-sm font-medium text-gray-900 dark:text-white">No active notes to count</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {emptyHint ??
            'Load PKR defaults or activate denominations in Manage notes below.'}
        </p>
      </section>
    );
  }

  return (
    <section className={surfaceClass}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2.5 dark:border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Cash denominations</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Amount = Count × Value — updates instantly.
          </p>
        </div>
        <button type="button" className={`${secondaryActionClass} !px-3 !py-1.5 text-xs`} onClick={onClear}>
          Clear counts
        </button>
      </div>

      <DataTable
        dense
        className="hidden md:block"
        columns={columns}
        rows={lines}
        getRowKey={(line) => line.denominationId}
      />

      <ul className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
        {lines.map((line) => (
          <li key={line.denominationId} className="space-y-1.5 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                {line.label}
              </p>
              <p className="text-sm font-semibold tabular-nums text-brand-600 dark:text-brand-400">
                {line.countRaw.trim() === '' || line.invalid ? '—' : formatMoney(line.amount)}
              </p>
            </div>
            <CountStepper
              id={`count-m-${line.denominationId}`}
              value={line.countRaw}
              invalid={line.invalid}
              onChange={(next) => onCountChange(line.denominationId, next)}
              onBump={(delta) => onBump(line.denominationId, delta)}
            />
            <p className="text-xs tabular-nums text-gray-500">{line.calcText}</p>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 border-t border-brand-200 bg-brand-50 px-4 py-2.5 dark:border-brand-900 dark:bg-brand-950/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-400">
              Total cash
            </p>
            <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-white sm:text-2xl">
              {formatMoney(totalCash)}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sum of all note amounts</p>
        </div>
      </div>
    </section>
  );
}

function CountStepper({
  id,
  value,
  invalid,
  onChange,
  onBump,
}: {
  id: string;
  value: string;
  invalid: boolean;
  onChange: (next: string) => void;
  onBump: (delta: number) => void;
}) {
  return (
    <div className="mx-auto flex max-w-[11rem] items-stretch gap-1">
      <button
        type="button"
        aria-label="Decrease count"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
        onClick={() => onBump(-1)}
      >
        −
      </button>
      <input
        id={id}
        inputMode="numeric"
        pattern="[0-9]*"
        type="text"
        autoComplete="off"
        placeholder="0"
        aria-invalid={invalid}
        className={`h-8 min-w-0 flex-1 rounded-md border bg-white px-2 text-center text-sm font-semibold tabular-nums text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 dark:bg-gray-950 dark:text-white ${
          invalid
            ? 'border-error-400 focus:border-error-500 focus:ring-error-500/20'
            : 'border-gray-200 dark:border-gray-700'
        }`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        aria-label="Increase count"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
        onClick={() => onBump(1)}
      >
        +
      </button>
    </div>
  );
}
