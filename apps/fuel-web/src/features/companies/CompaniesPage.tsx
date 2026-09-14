import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import {
  ActionSpinner,
  Badge,
  DataTable,
  type DataTableColumn,
  FormField,
  LiveBadge,
  Modal,
  PageHeader,
  PageMeta,
  PageShell,
  primaryActionClass,
  secondaryActionClass,
  Select,
  submitActionLabel,
  surfaceClass,
  toast,
} from '@companyio/platform-ui';
import { useFormSubmission, useOrganizationMutations, useOrganizations } from '../../hooks';
import type { CreditType, Organization } from '../../types';
import { parseFinancialInput, toFinancialInput, toErrorMessage } from '../../utils';
import { canEditPath, roleOf } from '../auth/roles';
const CREDIT_OPTIONS: Array<{ value: CreditType; label: string }> = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'BOTH', label: 'Daily & monthly' },
];

const emptyForm = () => ({
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  paymentTerms: '',
  creditLimit: '',
  creditType: 'BOTH' as CreditType,
});

export default function CompaniesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const { data: companies = [], error: listError, isLoading } = useOrganizations({
    includeInactive: true,
  });
  const { createOrganization, updateOrganization } = useOrganizationMutations();
  const { fieldError, clearFieldError, clearErrors, submit, runAction, submitting } =
    useFormSubmission();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (listError) toast.error(toErrorMessage(listError));
  }, [listError]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    clearErrors();
    setShowForm(true);
  };

  const startEdit = (company: Organization) => {
    setEditingId(company.id);
    setForm({
      name: company.name,
      contactName: company.contactName ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
      address: company.address ?? '',
      paymentTerms: company.paymentTerms ?? '',
      creditLimit: toFinancialInput(company.creditLimit, { allowZero: true }),
      creditType: company.creditType ?? 'BOTH',
    });
    clearErrors();
    setShowForm(true);
  };

  const companyColumns = useMemo<DataTableColumn<Organization>[]>(() => {
    const columns: DataTableColumn<Organization>[] = [
      {
        id: 'company',
        header: 'Company',
        cell: (company) => (
          <>
            <p className="font-medium text-gray-900 dark:text-white">{company.name}</p>
            <p className="text-xs text-gray-500">
              {[company.contactName, company.phone, company.email].filter(Boolean).join(' · ') ||
                'No contact details'}
            </p>
          </>
        ),
      },
      {
        id: 'credit',
        header: 'Credit',
        className: 'text-xs text-gray-600 dark:text-gray-300',
        cell: (company) =>
          CREDIT_OPTIONS.find((option) => option.value === company.creditType)?.label ??
          company.creditType,
      },
      {
        id: 'vehicles',
        header: 'Vehicles',
        className: 'tabular-nums text-gray-700 dark:text-gray-300',
        cell: (company) => company.vehicles?.length ?? 0,
      },
      {
        id: 'status',
        header: 'Status',
        cell: (company) => (
          <Badge variant={company.active ? 'success' : 'error'}>
            {company.active ? 'Active' : 'Inactive'}
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
        cell: (company) => (
          <div className="inline-flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={`${secondaryActionClass} px-3! py-1.5! text-xs`}
              onClick={() => startEdit(company)}
            >
              Edit
            </button>
            <button
              type="button"
              className={`${secondaryActionClass} px-3! py-1.5! text-xs`}
              onClick={() => {
                void runAction(
                  () =>
                    updateOrganization.mutateAsync({
                      id: company.id,
                      data: { active: !company.active },
                    }),
                  {
                    successMessage: company.active
                      ? 'Company deactivated.'
                      : 'Company activated.',
                  }
                );
              }}
            >
              {company.active ? 'Deactivate' : 'Activate'}
            </button>
            <Link
              to={`/vehicles?organizationId=${company.id}`}
              className={`${secondaryActionClass} px-3! py-1.5! text-xs`}
            >
              Vehicles
            </Link>
          </div>
        ),
      });
    }

    return columns;
  }, [canEdit, runAction, updateOrganization]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;

    await submit({
      validate: () => {
        const fields: Record<string, string> = {};
        if (!form.name.trim()) fields.name = 'Company name is required.';
        if (form.email.trim()) {
          const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
          if (!ok) fields.email = 'Enter a valid email address.';
        }
        const limit = parseFinancialInput(form.creditLimit);
        if (form.creditLimit.trim() && (limit === null || limit < 0)) {
          fields.creditLimit = 'Credit limit must be a valid number.';
        }
        return Object.keys(fields).length ? fields : null;
      },
      request: async () => {
        const payload = {
          name: form.name.trim(),
          contactName: form.contactName.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          paymentTerms: form.paymentTerms.trim() || undefined,
          creditLimit: parseFinancialInput(form.creditLimit) ?? 0,
          creditType: form.creditType,
        };
        if (editingId) {
          await updateOrganization.mutateAsync({ id: editingId, data: payload });
        } else {
          await createOrganization.mutateAsync(payload);
        }
      },
      successMessage: editingId ? 'Company updated.' : 'Company created.',
      onSuccess: () => {
        setEditingId(null);
        setForm(emptyForm());
        setShowForm(false);
        clearErrors();
      },
    });
  };

  const closeForm = () => {
    if (submitting || createOrganization.isPending || updateOrganization.isPending) return;
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    clearErrors();
  };

  const isSaving = submitting || createOrganization.isPending || updateOrganization.isPending;
  const editing = Boolean(editingId);

  return (
    <>
      <PageMeta title="Companies | Fuel Management" description="Credit customer companies" />
      <PageShell>
        <PageHeader
          title="Companies"
          description="Credit customers (Concept A). Add companies and vehicles before recording credit fuel."
          action={<LiveBadge label={canEdit ? 'Can edit' : 'View only'} />}
        />

        <div className="flex flex-wrap gap-2">
          <Link to="/organizations" className={`${primaryActionClass} pointer-events-none opacity-90`}>
            Companies
          </Link>
          <Link to="/vehicles" className={secondaryActionClass}>
            Vehicles
          </Link>
        </div>

        <section className={surfaceClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Company list</h2>
              <p className="text-xs text-gray-500">Active companies appear in credit dropdowns.</p>
            </div>
            {canEdit ? (
              <button type="button" className={primaryActionClass} onClick={startCreate}>
                Add company
              </button>
            ) : null}
          </div>
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-gray-500">Loading companies…</p>
          ) : (
            <DataTable
              dense
              columns={companyColumns}
              rows={companies}
              getRowKey={(company) => company.id}
              emptyMessage="No companies yet. Add a credit customer to continue."
            />
          )}
        </section>
      </PageShell>

      <Modal
        isOpen={canEdit && showForm}
        onClose={closeForm}
        className="mx-4 w-full max-w-xl p-6 sm:p-8"
        showCloseButton={!isSaving}
      >
        <h2 className="pr-10 text-lg font-semibold text-gray-900 dark:text-white">
          {editing ? 'Edit company' : 'Add company'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Credit type controls how this customer settles.
        </p>
        <form onSubmit={(event) => void onSubmit(event)} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
          <FormField
            id="company-name"
            label="Company name"
            required
            value={form.name}
            error={fieldError('name')}
            disabled={isSaving}
            onChange={(event) => {
              clearFieldError('name');
              setForm((current) => ({ ...current, name: event.target.value }));
            }}
          />
          <FormField
            id="company-contact"
            label="Contact person"
            value={form.contactName}
            disabled={isSaving}
            onChange={(event) =>
              setForm((current) => ({ ...current, contactName: event.target.value }))
            }
          />
          <FormField
            id="company-phone"
            label="Phone"
            value={form.phone}
            disabled={isSaving}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
          <FormField
            id="company-email"
            label="Email"
            type="email"
            value={form.email}
            error={fieldError('email')}
            disabled={isSaving}
            onChange={(event) => {
              clearFieldError('email');
              setForm((current) => ({ ...current, email: event.target.value }));
            }}
          />
          <FormField
            id="company-address"
            label="Address"
            value={form.address}
            disabled={isSaving}
            onChange={(event) =>
              setForm((current) => ({ ...current, address: event.target.value }))
            }
          />
          <FormField
            id="company-terms"
            label="Payment terms"
            placeholder="e.g. Net 30"
            value={form.paymentTerms}
            disabled={isSaving}
            onChange={(event) =>
              setForm((current) => ({ ...current, paymentTerms: event.target.value }))
            }
          />
          <FormField
            id="company-limit"
            label="Credit limit (PKR)"
            type="number"
            value={form.creditLimit}
            error={fieldError('creditLimit')}
            disabled={isSaving}
            onChange={(event) => {
              clearFieldError('creditLimit');
              setForm((current) => ({ ...current, creditLimit: event.target.value }));
            }}
          />
          <div>
            <label
              htmlFor="company-credit-type"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Credit type
            </label>
            <Select
              id="company-credit-type"
              options={CREDIT_OPTIONS}
              value={form.creditType}
              onChange={(value) =>
                setForm((current) => ({ ...current, creditType: value as CreditType }))
              }
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" className={secondaryActionClass} onClick={closeForm} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className={primaryActionClass} disabled={isSaving}>
              {isSaving ? <ActionSpinner /> : null}
              {submitActionLabel({
                pending: isSaving,
                editing,
                addLabel: 'Add company',
                updateLabel: 'Update company',
                addingLabel: 'Adding…',
                updatingLabel: 'Updating…',
              })}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
