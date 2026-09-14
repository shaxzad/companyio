import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import {
  DataTable,
  type DataTableColumn,
  DatePicker,
  FormField,
  Modal,
  PageMeta,
  Select,
} from '@companyio/platform-ui';
import {
  useFormSubmission,
  useOrganizations,
  usePaymentAccounts,
  usePaymentMutations,
  usePaymentsSummary,
  useSelectedStation,
} from '../../hooks';
import type { PaymentMethodKind, PaymentRow } from '../../types';
import {
  businessDateTimeIso,
  formatMoney,
  requireFinancialInput,
  toErrorMessage,
  todayYmd,
} from '../../utils';
import { toast } from '../../ui/toast';
import { canEditPath, roleOf } from '../auth/roles';
import {
  ActionSpinner,
  KpiCard,
  LiveBadge,
  Notice,
  PageHeader,
  PageShell,
  primaryActionClass,
  secondaryActionClass,
  submitActionLabel,
  surfaceClass,
} from '../../ui/page';

const emptyPayment = () => ({
  paymentAccountId: '',
  organizationId: '',
  amount: '',
  quantity: '1',
  reference: '',
  paidAt: '',
  notes: '',
});

const emptyAccount = () => ({
  name: '',
  code: '',
  kind: 'BANK' as PaymentMethodKind,
});

const KIND_OPTIONS: Array<{ value: PaymentMethodKind; label: string }> = [
  { value: 'BANK', label: 'Bank' },
  { value: 'CARD', label: 'Card / POS' },
  { value: 'TRANSFER', label: 'Online transfer' },
];

export default function PaymentsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const isOwner = role === 'owner';
  const { stations, stationId, setStationId, error: stationsError } = useSelectedStation();
  const [businessDate, setBusinessDate] = useState(todayYmd);
  const { data: companies = [] } = useOrganizations();
  const { data: accounts = [], error: accountsError } = usePaymentAccounts({ onlineOnly: true });
  const {
    data: summary,
    error: summaryError,
    isLoading,
  } = usePaymentsSummary(stationId || undefined, businessDate);
  const { createPayment, createPaymentAccount, loadDefaults } = usePaymentMutations(
    stationId || undefined,
    businessDate
  );
  const { fieldError, clearFieldError, clearErrors, submit, submitting } = useFormSubmission();

  const [form, setForm] = useState(emptyPayment);
  const [accountModal, setAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState(emptyAccount);
  const [accountError, setAccountError] = useState('');

  useEffect(() => {
    if (stationsError) toast.error(toErrorMessage(stationsError));
  }, [stationsError]);
  useEffect(() => {
    if (accountsError) toast.error(toErrorMessage(accountsError));
  }, [accountsError]);
  useEffect(() => {
    if (summaryError) toast.error(toErrorMessage(summaryError));
  }, [summaryError]);

  const accountOptions = useMemo(
    () => accounts.map((account) => ({ value: account.id, label: `${account.name} (${account.code})` })),
    [accounts]
  );
  const companyOptions = useMemo(
    () => [
      { value: '', label: 'No company (general receipt)' },
      ...companies
        .filter((company) => company.active !== false)
        .map((company) => ({ value: company.id, label: company.name })),
    ],
    [companies]
  );

  const paymentColumns = useMemo<DataTableColumn<PaymentRow>[]>(
    () => [
      {
        id: 'account',
        header: 'Account',
        className: 'font-medium text-gray-900 dark:text-white',
        cell: (row) => row.paymentAccount?.name ?? row.method,
      },
      {
        id: 'qty',
        header: 'Qty',
        className: 'tabular-nums text-gray-800 dark:text-gray-200',
        cell: (row) => String(row.quantity),
      },
      {
        id: 'amount',
        header: 'Amount',
        className: 'tabular-nums text-gray-800 dark:text-gray-200',
        cell: (row) => formatMoney(row.amount, { minimumFractionDigits: 2 }),
      },
      {
        id: 'company',
        header: 'Company',
        cell: (row) => row.organization?.name ?? '—',
      },
      {
        id: 'reference',
        header: 'Reference',
        cell: (row) => row.reference || '—',
      },
      {
        id: 'when',
        header: 'Date / time',
        cell: (row) => new Date(row.paidAt).toLocaleString(),
      },
    ],
    []
  );

  const onSubmitPayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit || !stationId) return;

    await submit({
      validate: () => {
        const fields: Record<string, string> = {};
        if (!form.paymentAccountId) fields.paymentAccountId = 'Select an account.';
        try {
          requireFinancialInput(form.amount, 'Amount');
        } catch (caught) {
          fields.amount = toErrorMessage(caught);
        }
        try {
          requireFinancialInput(form.quantity, 'Quantity');
        } catch (caught) {
          fields.quantity = toErrorMessage(caught);
        }
        return Object.keys(fields).length ? fields : null;
      },
      request: async () => {
        await createPayment.mutateAsync({
          stationId,
          paymentAccountId: form.paymentAccountId,
          amount: requireFinancialInput(form.amount, 'Amount'),
          quantity: requireFinancialInput(form.quantity, 'Quantity'),
          ...(form.organizationId ? { organizationId: form.organizationId } : {}),
          ...(form.reference.trim() ? { reference: form.reference.trim() } : {}),
          ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
          paidAt: form.paidAt
            ? new Date(form.paidAt).toISOString()
            : businessDateTimeIso(businessDate),
        });
      },
      successMessage: 'Payment recorded.',
      onSuccess: () => {
        setForm(emptyPayment());
        clearErrors();
      },
    });
  };

  const onSubmitAccount = (event: FormEvent) => {
    event.preventDefault();
    setAccountError('');
    void (async () => {
      try {
        if (!accountForm.name.trim() || !accountForm.code.trim()) {
          setAccountError('Name and code are required.');
          return;
        }
        await createPaymentAccount.mutateAsync({
          name: accountForm.name.trim(),
          code: accountForm.code.trim(),
          kind: accountForm.kind,
        });
        toast.success('Payment account added.');
        setAccountModal(false);
        setAccountForm(emptyAccount());
      } catch (caught) {
        setAccountError(toErrorMessage(caught));
      }
    })();
  };

  const isSaving = submitting || createPayment.isPending;
  const accountSaving = createPaymentAccount.isPending;

  return (
    <>
      <PageMeta
        title="Online payments | Fuel Management"
        description="Bank and online payments separate from physical cash"
      />
      <PageShell>
        <PageHeader
          title="Online payments"
          description="Record bank / card / online receipts. These stay separate from cash denomination counting."
          action={<LiveBadge label={canEdit ? 'Can edit' : 'View only'} />}
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Daily total"
            value={formatMoney(summary?.dailyTotal ?? 0, { minimumFractionDigits: 2 })}
            detail={`${summary?.dailyCount ?? 0} payment(s) · ${businessDate}`}
            tone="text-brand-600"
          />
          <KpiCard
            label="Monthly total"
            value={formatMoney(summary?.monthlyTotal ?? 0, { minimumFractionDigits: 2 })}
            detail={`${summary?.monthlyCount ?? 0} this month (feeds Feature 13)`}
            tone="text-success-600"
          />
          <KpiCard
            label="Accounts"
            value={String(accounts.length)}
            detail="Configurable — not hard-coded"
          />
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Station
            </label>
            <Select
              options={stations.map((station) => ({
                value: station.id,
                label: `${station.name} (${station.code})`,
              }))}
              placeholder="Select station"
              value={stationId}
              onChange={setStationId}
            />
          </div>
          <DatePicker
            id="payments-business-date"
            label="Business date"
            value={businessDate}
            onChange={setBusinessDate}
            required
          />
        </div>

        {canEdit && stationId ? (
          <section className={`${surfaceClass} p-5`}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Record payment</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Paper-style row: account, qty, amount. Company / invoice link is optional.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isOwner && accounts.length === 0 ? (
                  <button
                    type="button"
                    className={secondaryActionClass}
                    disabled={loadDefaults.isPending}
                    onClick={() => {
                      void loadDefaults.mutateAsync().then((result) => {
                        toast.success(
                          result.created
                            ? `Loaded ${result.created} default account(s).`
                            : 'Default accounts already present.'
                        );
                      });
                    }}
                  >
                    {loadDefaults.isPending ? 'Loading…' : 'Load default accounts'}
                  </button>
                ) : null}
                {isOwner ? (
                  <button
                    type="button"
                    className={secondaryActionClass}
                    onClick={() => {
                      setAccountForm(emptyAccount());
                      setAccountError('');
                      setAccountModal(true);
                    }}
                  >
                    Add account
                  </button>
                ) : null}
              </div>
            </div>

            {accounts.length === 0 ? (
              <Notice tone="error">
                No payment accounts yet. Owner can load defaults or add an account first.
              </Notice>
            ) : (
              <form
                onSubmit={(event) => void onSubmitPayment(event)}
                className="grid gap-4 sm:grid-cols-2"
                noValidate
              >
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account / method <span className="text-brand-500">*</span>
                  </label>
                  <Select
                    options={accountOptions}
                    placeholder="Select account"
                    value={form.paymentAccountId}
                    onChange={(value) => {
                      clearFieldError('paymentAccountId');
                      setForm((current) => ({ ...current, paymentAccountId: value }));
                    }}
                  />
                  {fieldError('paymentAccountId') ? (
                    <p className="mt-1.5 text-xs text-error-600" role="alert">
                      {fieldError('paymentAccountId')}
                    </p>
                  ) : null}
                </div>
                <FormField
                  id="pay-qty"
                  label="Qty"
                  type="number"
                  required
                  value={form.quantity}
                  error={fieldError('quantity')}
                  onChange={(event) => {
                    clearFieldError('quantity');
                    setForm((current) => ({ ...current, quantity: event.target.value }));
                  }}
                />
                <FormField
                  id="pay-amount"
                  label="Amount (PKR)"
                  type="number"
                  required
                  value={form.amount}
                  error={fieldError('amount')}
                  onChange={(event) => {
                    clearFieldError('amount');
                    setForm((current) => ({ ...current, amount: event.target.value }));
                  }}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Related company (optional)
                  </label>
                  <Select
                    options={companyOptions}
                    value={form.organizationId}
                    onChange={(value) => setForm((current) => ({ ...current, organizationId: value }))}
                  />
                </div>
                <FormField
                  id="pay-ref"
                  label="Reference"
                  placeholder="Txn / slip number"
                  value={form.reference}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, reference: event.target.value }))
                  }
                />
                <DatePicker
                  id="pay-at"
                  label="Date / time"
                  enableTime
                  value={form.paidAt}
                  onChange={(value) => setForm((current) => ({ ...current, paidAt: value }))}
                  hint="Blank = use business date above (with current time)"
                />
                <div className="sm:col-span-2">
                  <FormField
                    id="pay-notes"
                    label="Notes"
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button type="submit" className={primaryActionClass} disabled={isSaving}>
                    {isSaving ? <ActionSpinner /> : null}
                    {submitActionLabel({
                      pending: isSaving,
                      editing: false,
                      addLabel: 'Record payment',
                      addingLabel: 'Recording…',
                    })}
                  </button>
                </div>
              </form>
            )}
          </section>
        ) : null}

        <section className={surfaceClass}>
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Payments for {businessDate}</h2>
            <p className="mt-1 text-sm text-gray-500">Online / bank / card only — not physical cash.</p>
          </div>
          {isLoading ? (
            <p className="px-5 py-6 text-sm text-gray-500">Loading payments…</p>
          ) : (
            <DataTable
              columns={paymentColumns}
              rows={summary?.payments ?? []}
              getRowKey={(row) => row.id}
              emptyMessage="No online payments for this date yet."
            />
          )}
        </section>
      </PageShell>

      <Modal
        isOpen={accountModal}
        onClose={() => {
          if (!accountSaving) setAccountModal(false);
        }}
        className="mx-4 w-full max-w-md p-6 sm:p-8"
        showCloseButton={!accountSaving}
      >
        <h2 className="pr-10 text-lg font-semibold text-gray-900 dark:text-white">Add payment account</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configurable list (Section 5). Add JazzCash, bank name, etc. as needed.
        </p>
        <form onSubmit={onSubmitAccount} className="mt-5 space-y-4">
          {accountError ? <Notice tone="error">{accountError}</Notice> : null}
          <FormField
            id="acct-name"
            label="Account name"
            required
            placeholder="e.g. JazzCash"
            value={accountForm.name}
            disabled={accountSaving}
            onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))}
          />
          <FormField
            id="acct-code"
            label="Code"
            required
            placeholder="e.g. JAZZ"
            value={accountForm.code}
            disabled={accountSaving}
            onChange={(event) => setAccountForm((current) => ({ ...current, code: event.target.value }))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Kind
            </label>
            <Select
              options={KIND_OPTIONS}
              value={accountForm.kind}
              onChange={(value) =>
                setAccountForm((current) => ({ ...current, kind: value as PaymentMethodKind }))
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className={secondaryActionClass}
              disabled={accountSaving}
              onClick={() => setAccountModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className={primaryActionClass} disabled={accountSaving}>
              {accountSaving ? <ActionSpinner /> : null}
              {submitActionLabel({
                pending: accountSaving,
                editing: false,
                addLabel: 'Add account',
                addingLabel: 'Adding…',
              })}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
