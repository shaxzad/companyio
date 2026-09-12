import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { Badge, DataTable, type DataTableColumn, FormField, Modal, PageMeta, Select } from '@companyio/platform-ui';
import {
  useFormSubmission,
  useOrganizationMutations,
  useOrganizations,
  useVehicles,
} from '../../hooks';
import type { Vehicle } from '../../types';
import { toErrorMessage } from '../../utils';
import { toast } from '../../ui/toast';
import { canEditPath, roleOf } from '../auth/roles';
import {
  ActionSpinner,
  LiveBadge,
  PageHeader,
  PageShell,
  primaryActionClass,
  secondaryActionClass,
  submitActionLabel,
  surfaceClass,
} from '../../ui/page';

const emptyForm = () => ({
  organizationId: '',
  registration: '',
  driver: '',
  type: '',
  makeModel: '',
  notes: '',
});

export default function VehiclesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const presetOrg = searchParams.get('organizationId') ?? '';

  const { data: companies = [], error: companiesError } = useOrganizations({
    includeInactive: true,
  });
  const { data: vehicles = [], error: vehiclesError, isLoading } = useVehicles({
    includeInactive: true,
  });
  const { createVehicle, updateVehicle } = useOrganizationMutations();
  const { fieldError, clearFieldError, clearErrors, submit, runAction, submitting } =
    useFormSubmission();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(Boolean(presetOrg));
  const [form, setForm] = useState(() => ({ ...emptyForm(), organizationId: presetOrg }));
  const [filterOrgId, setFilterOrgId] = useState(presetOrg);

  useEffect(() => {
    if (companiesError) toast.error(toErrorMessage(companiesError));
  }, [companiesError]);

  useEffect(() => {
    if (vehiclesError) toast.error(toErrorMessage(vehiclesError));
  }, [vehiclesError]);

  useEffect(() => {
    if (presetOrg) {
      setFilterOrgId(presetOrg);
      setForm((current) => ({ ...current, organizationId: presetOrg }));
      setShowForm(true);
    }
  }, [presetOrg]);

  const companyOptions = useMemo(
    () =>
      companies
        .filter((company) => company.active || company.id === form.organizationId)
        .map((company) => ({ value: company.id, label: company.name })),
    [companies, form.organizationId]
  );

  const filterOptions = useMemo(
    () => [
      { value: '', label: 'All companies' },
      ...companies.map((company) => ({ value: company.id, label: company.name })),
    ],
    [companies]
  );

  const visibleVehicles = useMemo(
    () =>
      filterOrgId
        ? vehicles.filter((vehicle) => vehicle.organizationId === filterOrgId)
        : vehicles,
    [filterOrgId, vehicles]
  );

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), organizationId: filterOrgId || presetOrg });
    clearErrors();
    setShowForm(true);
  };

  const startEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setForm({
      organizationId: vehicle.organizationId,
      registration: vehicle.registration,
      driver: vehicle.driver ?? '',
      type: vehicle.type ?? '',
      makeModel: vehicle.makeModel ?? '',
      notes: vehicle.notes ?? '',
    });
    clearErrors();
    setShowForm(true);
  };

  const vehicleColumns = useMemo<DataTableColumn<Vehicle>[]>(() => {
    const columns: DataTableColumn<Vehicle>[] = [
      {
        id: 'vehicle',
        header: 'Vehicle',
        cell: (vehicle) => (
          <>
            <p className="font-semibold tabular-nums text-gray-900 dark:text-white">
              {vehicle.registration}
            </p>
            <p className="text-xs text-gray-500">
              {[vehicle.type, vehicle.makeModel].filter(Boolean).join(' · ') || '—'}
            </p>
          </>
        ),
      },
      {
        id: 'company',
        header: 'Company',
        className: 'text-gray-700 dark:text-gray-300',
        cell: (vehicle) =>
          vehicle.organization?.name ??
          companies.find((c) => c.id === vehicle.organizationId)?.name ??
          '—',
      },
      {
        id: 'driver',
        header: 'Driver',
        className: 'text-gray-700 dark:text-gray-300',
        cell: (vehicle) => vehicle.driver || '—',
      },
      {
        id: 'status',
        header: 'Status',
        cell: (vehicle) => (
          <Badge variant={vehicle.active ? 'success' : 'error'}>
            {vehicle.active ? 'Active' : 'Inactive'}
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
        cell: (vehicle) => (
          <div className="inline-flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={`${secondaryActionClass} px-3! py-1.5! text-xs`}
              onClick={() => startEdit(vehicle)}
            >
              Edit
            </button>
            <button
              type="button"
              className={`${secondaryActionClass} px-3! py-1.5! text-xs`}
              onClick={() => {
                void runAction(
                  () =>
                    updateVehicle.mutateAsync({
                      id: vehicle.id,
                      data: { active: !vehicle.active },
                    }),
                  {
                    successMessage: vehicle.active
                      ? 'Vehicle deactivated.'
                      : 'Vehicle activated.',
                  }
                );
              }}
            >
              {vehicle.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ),
      });
    }

    return columns;
  }, [canEdit, companies, runAction, updateVehicle]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;

    await submit({
      validate: () => {
        const fields: Record<string, string> = {};
        if (!editingId && !form.organizationId) {
          fields.organizationId = 'Select a company.';
        }
        if (!form.registration.trim()) {
          fields.registration = 'Vehicle number is required.';
        }
        return Object.keys(fields).length ? fields : null;
      },
      request: async () => {
        const payload = {
          registration: form.registration.trim(),
          driver: form.driver.trim() || undefined,
          type: form.type.trim() || undefined,
          makeModel: form.makeModel.trim() || undefined,
          notes: form.notes.trim() || undefined,
        };
        if (editingId) {
          await updateVehicle.mutateAsync({ id: editingId, data: payload });
        } else {
          await createVehicle.mutateAsync({
            organizationId: form.organizationId,
            data: payload,
          });
        }
      },
      successMessage: editingId ? 'Vehicle updated.' : 'Vehicle added.',
      onSuccess: () => {
        setEditingId(null);
        setForm({ ...emptyForm(), organizationId: filterOrgId || '' });
        setShowForm(false);
        clearErrors();
      },
    });
  };

  const isSaving = submitting || createVehicle.isPending || updateVehicle.isPending;
  const editing = Boolean(editingId);

  const closeForm = () => {
    if (isSaving) return;
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm(), organizationId: filterOrgId || '' });
    clearErrors();
  };

  return (
    <>
      <PageMeta title="Vehicles | Fuel Management" description="Company vehicles for credit fuel" />
      <PageShell>
        <PageHeader
          title="Vehicles"
          description="Link each vehicle to a company. Active vehicles appear in credit entry dropdowns."
          action={<LiveBadge label={canEdit ? 'Can edit' : 'View only'} />}
        />

        <div className="flex flex-wrap gap-2">
          <Link to="/organizations" className={secondaryActionClass}>
            Companies
          </Link>
          <Link to="/vehicles" className={`${primaryActionClass} pointer-events-none opacity-90`}>
            Vehicles
          </Link>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[14rem]">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by company
            </label>
            <Select
              options={filterOptions}
              value={filterOrgId}
              onChange={(value) => setFilterOrgId(value)}
            />
          </div>
          {canEdit ? (
            <button type="button" className={primaryActionClass} onClick={startCreate}>
              Add vehicle
            </button>
          ) : null}
        </div>

        <section className={surfaceClass}>
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Vehicle list</h2>
            <p className="text-xs text-gray-500">
              {filterOrgId
                ? `Showing vehicles for ${companies.find((c) => c.id === filterOrgId)?.name ?? 'company'}`
                : 'Showing all vehicles'}
            </p>
          </div>
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-gray-500">Loading vehicles…</p>
          ) : (
            <DataTable
              dense
              columns={vehicleColumns}
              rows={visibleVehicles}
              getRowKey={(vehicle) => vehicle.id}
              emptyMessage="No vehicles yet. Add a company first, then register at least one vehicle."
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
          {editing ? 'Edit vehicle' : 'Add vehicle'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">Vehicle number must be unique within the company.</p>
        <form onSubmit={(event) => void onSubmit(event)} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
          {!editing ? (
            <div className="sm:col-span-2">
              <label
                htmlFor="vehicle-company"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Company <span className="text-brand-500">*</span>
              </label>
              <Select
                id="vehicle-company"
                options={companyOptions}
                placeholder="Select company"
                value={form.organizationId}
                onChange={(value) => {
                  clearFieldError('organizationId');
                  setForm((current) => ({ ...current, organizationId: value }));
                }}
              />
              {fieldError('organizationId') ? (
                <p className="mt-1.5 text-xs text-error-600" role="alert">
                  {fieldError('organizationId')}
                </p>
              ) : null}
            </div>
          ) : null}
          <FormField
            id="vehicle-registration"
            label="Vehicle number"
            required
            placeholder="e.g. GLT-1234"
            value={form.registration}
            error={fieldError('registration')}
            disabled={isSaving}
            onChange={(event) => {
              clearFieldError('registration');
              setForm((current) => ({ ...current, registration: event.target.value }));
            }}
          />
          <FormField
            id="vehicle-driver"
            label="Driver name"
            value={form.driver}
            disabled={isSaving}
            onChange={(event) => setForm((current) => ({ ...current, driver: event.target.value }))}
          />
          <FormField
            id="vehicle-type"
            label="Vehicle type"
            placeholder="e.g. Tanker, Pickup"
            value={form.type}
            disabled={isSaving}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
          />
          <FormField
            id="vehicle-model"
            label="Make / model"
            value={form.makeModel}
            disabled={isSaving}
            onChange={(event) => setForm((current) => ({ ...current, makeModel: event.target.value }))}
          />
          <div className="sm:col-span-2">
            <FormField
              id="vehicle-notes"
              label="Notes / history"
              placeholder="Optional history notes for this vehicle"
              value={form.notes}
              disabled={isSaving}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
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
                addLabel: 'Add vehicle',
                updateLabel: 'Update vehicle',
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
