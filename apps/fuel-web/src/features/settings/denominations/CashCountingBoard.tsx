import type { CashCountLine } from '../../../utils';
import { formatMoney } from '../../../utils';
import { secondaryActionClass, surfaceClass } from '../../../ui/page';

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
  if (lines.length === 0) {
    return (
      <section className={`${surfaceClass} p-8 text-center`}>
        <p className="text-base font-medium text-gray-900 dark:text-white">No active notes to count</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {emptyHint ??
            'Load PKR defaults or activate denominations in Manage notes below.'}
        </p>
      </section>
    );
  }

  return (
    <section className={surfaceClass}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cash denominations</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enter how many notes you have. Amount = Count × Value — updates instantly.
          </p>
        </div>
        <button type="button" className={secondaryActionClass} onClick={onClear}>
          Clear counts
        </button>
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-950/50">
              <th className="px-5 py-3">Denomination</th>
              <th className="px-5 py-3 text-center">Count</th>
              <th className="px-5 py-3">Calculation</th>
              <th className="px-5 py-3 text-end">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {lines.map((line) => (
              <tr key={line.denominationId} className="align-middle">
                <td className="px-5 py-4">
                  <p className="text-xl font-semibold tabular-nums text-gray-900 dark:text-white">
                    {line.label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Face {line.faceValue.toLocaleString('en-PK')}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <CountStepper
                    id={`count-${line.denominationId}`}
                    value={line.countRaw}
                    invalid={line.invalid}
                    onChange={(next) => onCountChange(line.denominationId, next)}
                    onBump={(delta) => onBump(line.denominationId, delta)}
                  />
                </td>
                <td className="px-5 py-4 font-medium tabular-nums text-gray-600 dark:text-gray-300">
                  {line.calcText}
                </td>
                <td className="px-5 py-4 text-end text-lg font-semibold tabular-nums text-brand-600 dark:text-brand-400">
                  {line.countRaw.trim() === '' && !line.invalid
                    ? '—'
                    : line.invalid
                      ? '—'
                      : formatMoney(line.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
        {lines.map((line) => (
          <li key={line.denominationId} className="space-y-3 px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xl font-semibold tabular-nums text-gray-900 dark:text-white">
                {line.label}
              </p>
              <p className="text-lg font-semibold tabular-nums text-brand-600 dark:text-brand-400">
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
            <p className="text-sm tabular-nums text-gray-500">{line.calcText}</p>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 border-t border-brand-200 bg-brand-50 px-5 py-5 dark:border-brand-900 dark:bg-brand-950/40">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-400">
              Total cash
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {formatMoney(totalCash)}
            </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sum of all note amounts
          </p>
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
    <div className="mx-auto flex max-w-[14rem] items-stretch gap-1.5">
      <button
        type="button"
        aria-label="Decrease count"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl font-semibold text-gray-700 hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
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
        className={`h-12 min-w-0 flex-1 rounded-xl border bg-white px-3 text-center text-xl font-semibold tabular-nums text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-950 dark:text-white ${
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
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl font-semibold text-gray-700 hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
        onClick={() => onBump(1)}
      >
        +
      </button>
    </div>
  );
}
