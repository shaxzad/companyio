import { FormEvent, useState } from 'react';
import { Badge, Input, Label } from '@companyio/platform-ui';
import type { CashDenomination } from '../../../types';
import {
  denominationDisplayLabel,
  parseFinancialInput,
  requireFinancialInput,
  toErrorMessage,
} from '../../../utils';
import {
  Notice,
  primaryActionClass,
  secondaryActionClass,
  surfaceClass,
} from '../../../ui/page';

type ManageDenominationsProps = {
  canEdit: boolean;
  rows: CashDenomination[];
  createPending: boolean;
  loadDefaultsPending: boolean;
  /** Open the manage panel by default (e.g. when no notes are configured). */
  defaultOpen?: boolean;
  onCreate: (input: { value: number; label: string }) => Promise<void>;
  onToggleActive: (row: CashDenomination) => Promise<void>;
  onLoadDefaults: () => Promise<void>;
};

const faceLabel = (faceValue: number) => `PKR ${faceValue.toLocaleString('en-PK')}`;

export function ManageDenominations({
  canEdit,
  rows,
  createPending,
  loadDefaultsPending,
  defaultOpen = false,
  onCreate,
  onToggleActive,
  onLoadDefaults,
}: ManageDenominationsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAdd, setShowAdd] = useState(false);
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [labelTouched, setLabelTouched] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const onValueChange = (next: string) => {
    setValue(next);
    if (labelTouched) return;
    const parsed = parseFinancialInput(next);
    setLabel(parsed !== null && parsed > 0 ? faceLabel(parsed) : '');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    setError('');
    setStatus('');
    try {
      const parsedValue = requireFinancialInput(value, 'Note value');
      if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw new Error('Note value must be a whole number greater than zero.');
      }
      await onCreate({
        value: parsedValue,
        label: label.trim() || faceLabel(parsedValue),
      });
      setValue('');
      setLabel('');
      setLabelTouched(false);
      setShowAdd(false);
      setStatus('Denomination added — it appears in the count list when active.');
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  };

  return (
    <section className={surfaceClass}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Manage denominations</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add notes or activate / deactivate. Only active notes show in cash counting.
          </p>
        </div>
        <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-gray-200 px-5 py-5 dark:border-gray-800">
          {error && <Notice tone="error">{error}</Notice>}
          {status && <Notice tone="success">{status}</Notice>}

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryActionClass}
                disabled={loadDefaultsPending}
                onClick={() => {
                  setError('');
                  void onLoadDefaults()
                    .then(() => setStatus('Loaded PKR defaults.'))
                    .catch((caught) => setError(toErrorMessage(caught)));
                }}
              >
                Load PKR defaults
              </button>
              <button
                type="button"
                className={primaryActionClass}
                onClick={() => setShowAdd((prev) => !prev)}
              >
                {showAdd ? 'Cancel add' : 'Add denomination'}
              </button>
            </div>
          )}

          {canEdit && showAdd && (
            <form
              onSubmit={(event) => void submit(event)}
              className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 dark:border-gray-700 dark:bg-gray-950/40"
            >
              <div>
                <Label htmlFor="manage-denom-value">
                  Value (PKR) <span className="text-brand-500">*</span>
                </Label>
                <Input
                  id="manage-denom-value"
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 5000"
                  value={value}
                  onChange={(event) => onValueChange(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="manage-denom-label">Label</Label>
                <Input
                  id="manage-denom-label"
                  placeholder="e.g. PKR 5,000"
                  value={label}
                  onChange={(event) => {
                    setLabelTouched(true);
                    setLabel(event.target.value);
                  }}
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className={primaryActionClass} disabled={createPending}>
                  Save denomination
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-950/50">
                <tr>
                  <th className="px-4 py-3">Denomination</th>
                  <th className="px-4 py-3">Status</th>
                  {canEdit && <th className="px-4 py-3 text-end">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {denominationDisplayLabel(row)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.active ? 'success' : 'error'}>
                        {row.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-end">
                        <button
                          type="button"
                          className={`${secondaryActionClass} px-3! py-1.5! text-xs`}
                          onClick={() => {
                            setError('');
                            void onToggleActive(row).catch((caught) =>
                              setError(toErrorMessage(caught))
                            );
                          }}
                        >
                          {row.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-gray-500" colSpan={3}>
                      No denominations configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
