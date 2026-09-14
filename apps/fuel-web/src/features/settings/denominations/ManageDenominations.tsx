import { FormEvent, useMemo, useState } from 'react';
import {
  Badge,
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  FormField,
  primaryActionClass,
  secondaryActionClass,
  surfaceClass,
  toast,
  useConfirmDialog,
} from '@companyio/platform-ui';
import { useFormSubmission } from '../../../hooks';
import type { CashDenomination } from '../../../types';
import {
  denominationDisplayLabel,
  parseFinancialInput,
  requireFinancialInput,
  toErrorMessage,
} from '../../../utils';
type ManageDenominationsProps = {
  canEdit: boolean;
  rows: CashDenomination[];
  createPending: boolean;
  loadDefaultsPending: boolean;
  deletePending?: boolean;
  /** Open the manage panel by default (e.g. when no notes are configured). */
  defaultOpen?: boolean;
  onCreate: (input: { value: number; label: string }) => Promise<void>;
  onToggleActive: (row: CashDenomination) => Promise<void>;
  onDelete: (row: CashDenomination) => Promise<void>;
  onLoadDefaults: () => Promise<void>;
};

const faceLabel = (faceValue: number) => `PKR ${faceValue.toLocaleString('en-PK')}`;

export function ManageDenominations({
  canEdit,
  rows,
  createPending,
  loadDefaultsPending,
  deletePending = false,
  defaultOpen = false,
  onCreate,
  onToggleActive,
  onDelete,
  onLoadDefaults,
}: ManageDenominationsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAdd, setShowAdd] = useState(false);
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [labelTouched, setLabelTouched] = useState(false);
  const { fieldError, clearFieldError, clearErrors, submit, runAction, submitting } =
    useFormSubmission();
  const confirmDialog = useConfirmDialog();

  const denominationColumns = useMemo<DataTableColumn<CashDenomination>[]>(() => {
    const columns: DataTableColumn<CashDenomination>[] = [
      {
        id: 'denomination',
        header: 'Denomination',
        className: 'font-medium text-gray-900 dark:text-white',
        cell: (row) => denominationDisplayLabel(row),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => (
          <Badge variant={row.active ? 'success' : 'error'}>
            {row.active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
    ];

    if (canEdit) {
      columns.push({
        id: 'actions',
        header: 'Actions',
        className: 'text-end',
        headerClassName: 'text-end',
        cell: (row) => (
          <div className="inline-flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className={`${secondaryActionClass} px-3! py-1.5! text-xs`}
              onClick={() => {
                void runAction(() => onToggleActive(row), {
                  successMessage: row.active
                    ? 'Denomination deactivated.'
                    : 'Denomination activated.',
                });
              }}
            >
              {row.active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-error-200 bg-white px-3 py-1.5 text-xs font-semibold text-error-700 hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-error-800 dark:bg-gray-900 dark:text-error-400 dark:hover:bg-error-950/40"
              disabled={deletePending || confirmDialog.pending}
              onClick={() => {
                const name = denominationDisplayLabel(row);
                confirmDialog.askConfirm({
                  title: 'Delete denomination?',
                  description: `Delete ${name}? This removes it from cash counting permanently.`,
                  confirmLabel: 'Delete',
                  tone: 'danger',
                  onConfirm: async () => {
                    try {
                      await onDelete(row);
                      toast.success('Denomination deleted.');
                    } catch (caught) {
                      toast.error(toErrorMessage(caught));
                      throw caught;
                    }
                  },
                });
              }}
            >
              Delete
            </button>
          </div>
        ),
      });
    }

    return columns;
  }, [canEdit, confirmDialog, deletePending, onDelete, onToggleActive, runAction]);

  const onValueChange = (next: string) => {
    setValue(next);
    clearFieldError('value');
    if (labelTouched) return;
    const parsed = parseFinancialInput(next);
    setLabel(parsed !== null && parsed > 0 ? faceLabel(parsed) : '');
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;

    await submit({
      validate: () => {
        try {
          const parsedValue = requireFinancialInput(value, 'Note value');
          if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
            return { value: 'Note value must be a whole number greater than zero.' };
          }
          return null;
        } catch (caught) {
          return {
            value: caught instanceof Error ? caught.message : 'Note value is required.',
          };
        }
      },
      request: async () => {
        const parsedValue = requireFinancialInput(value, 'Note value');
        await onCreate({
          value: parsedValue,
          label: label.trim() || faceLabel(parsedValue),
        });
      },
      successMessage: 'Denomination added.',
      onSuccess: () => {
        // Reset only after the API succeeds — never on error.
        setValue('');
        setLabel('');
        setLabelTouched(false);
        setShowAdd(false);
        clearErrors();
      },
    });
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
            Add, delete, or activate / deactivate notes. Only active notes show in cash counting.
          </p>
        </div>
        <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-gray-200 px-5 py-5 dark:border-gray-800">
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryActionClass}
                disabled={loadDefaultsPending}
                onClick={() => {
                  void runAction(() => onLoadDefaults(), {
                    successMessage: 'Loaded PKR defaults.',
                  });
                }}
              >
                Load PKR defaults
              </button>
              <button
                type="button"
                className={primaryActionClass}
                onClick={() => {
                  clearErrors();
                  setShowAdd((prev) => !prev);
                }}
              >
                {showAdd ? 'Cancel add' : 'Add denomination'}
              </button>
            </div>
          )}

          {canEdit && showAdd && (
            <form
              onSubmit={(event) => void onSubmit(event)}
              className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 dark:border-gray-700 dark:bg-gray-950/40"
              noValidate
            >
              <FormField
                id="manage-denom-value"
                label="Value (PKR)"
                required
                type="number"
                inputMode="numeric"
                placeholder="e.g. 5000"
                value={value}
                error={fieldError('value')}
                onChange={(event) => onValueChange(event.target.value)}
              />
              <FormField
                id="manage-denom-label"
                label="Label"
                placeholder="e.g. PKR 5,000"
                value={label}
                error={fieldError('label')}
                onChange={(event) => {
                  setLabelTouched(true);
                  clearFieldError('label');
                  setLabel(event.target.value);
                }}
              />
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className={primaryActionClass}
                  disabled={createPending || submitting}
                >
                  Save denomination
                </button>
              </div>
            </form>
          )}

          <div className="rounded-xl border border-gray-200 dark:border-gray-800">
            <DataTable
              columns={denominationColumns}
              rows={rows}
              getRowKey={(row) => row.id}
              emptyMessage="No denominations configured yet."
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.request?.title ?? ''}
        description={confirmDialog.request?.description ?? ''}
        confirmLabel={confirmDialog.request?.confirmLabel}
        cancelLabel={confirmDialog.request?.cancelLabel}
        tone={confirmDialog.request?.tone}
        pending={confirmDialog.pending || deletePending}
        onConfirm={() => void confirmDialog.confirm()}
        onCancel={confirmDialog.close}
      />
    </section>
  );
}
