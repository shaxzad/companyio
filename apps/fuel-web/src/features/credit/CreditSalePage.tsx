import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import {
  DatePicker,
  FormField,
  KpiCard,
  LiveBadge,
  PageHeader,
  PageMeta,
  PageShell,
  primaryActionClass,
  secondaryActionClass,
  Select,
  Surface,
  SurfaceHeader,
  toast,
} from '@companyio/platform-ui';
import {
  useCreditSaleMutations,
  useFormSubmission,
  useFuelTypes,
  useOrganizations,
  useSelectedStation,
  useStationAssets,
} from '../../hooks';
import {
  formatMoney,
  parseFinancialInput,
  requireFinancialInput,
  roundTo,
  toErrorMessage,
} from '../../utils';
import { canEditPath, roleOf } from '../auth/roles';
const emptyForm = () => ({
  organizationId: '',
  vehicleId: '',
  fuelTypeId: '',
  tankId: '',
  litres: '',
  unitPrice: '',
  driverName: '',
  soldAt: '',
  notes: '',
});

export default function CreditSalePage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const { stations, stationId, setStationId, error: stationsError } = useSelectedStation();
  const { data: companies = [] } = useOrganizations();
  const { data: fuelTypes = [] } = useFuelTypes();
  const { data: assets } = useStationAssets(stationId);
  const { createCreditSale } = useCreditSaleMutations();
  const { fieldError, clearFieldError, clearErrors, submit, submitting } = useFormSubmission();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (stationsError) toast.error(toErrorMessage(stationsError));
  }, [stationsError]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === form.organizationId),
    [companies, form.organizationId]
  );
  const vehicles = useMemo(
    () => (selectedCompany?.vehicles ?? []).filter((vehicle) => vehicle.active !== false),
    [selectedCompany]
  );
  const tanks = useMemo(
    () =>
      (assets?.tanks ?? []).filter(
        (tank) => tank.active && (!form.fuelTypeId || tank.fuelTypeId === form.fuelTypeId)
      ),
    [assets, form.fuelTypeId]
  );

  useEffect(() => {
    if (vehicles.length === 1 && !form.vehicleId) {
      setForm((current) => ({
        ...current,
        vehicleId: vehicles[0].id,
        driverName: vehicles[0].driver ?? current.driverName,
      }));
    }
  }, [vehicles, form.vehicleId]);

  useEffect(() => {
    if (tanks.length === 1 && !form.tankId) {
      setForm((current) => ({ ...current, tankId: tanks[0].id }));
    }
  }, [tanks, form.tankId]);

  useEffect(() => {
    const product = fuelTypes.find((item) => item.id === form.fuelTypeId);
    if (!product || form.unitPrice.trim()) return;
    const suggested = Number(product.sellingPrice);
    if (Number.isFinite(suggested) && suggested > 0) {
      setForm((current) => ({ ...current, unitPrice: String(suggested) }));
    }
  }, [form.fuelTypeId, form.unitPrice, fuelTypes]);

  const litres = parseFinancialInput(form.litres);
  const rate = parseFinancialInput(form.unitPrice);
  const amount =
    litres !== null && rate !== null && litres > 0 && rate > 0 ? roundTo(litres * rate, 2) : null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;

    await submit({
      validate: () => {
        const fields: Record<string, string> = {};
        if (!stationId) fields.stationId = 'Select a station.';
        if (!form.organizationId) fields.organizationId = 'Select a company.';
        if (!form.vehicleId) fields.vehicleId = 'Select a vehicle.';
        if (!form.fuelTypeId) fields.fuelTypeId = 'Select a product.';
        if (!form.tankId) fields.tankId = 'Select a tank.';
        try {
          requireFinancialInput(form.litres, 'Litres');
        } catch (caught) {
          fields.litres = caught instanceof Error ? caught.message : 'Litres is required.';
        }
        try {
          requireFinancialInput(form.unitPrice, 'Rate');
        } catch (caught) {
          fields.unitPrice = caught instanceof Error ? caught.message : 'Rate is required.';
        }
        return Object.keys(fields).length ? fields : null;
      },
      request: async () => {
        const sale = await createCreditSale.mutateAsync({
          stationId,
          organizationId: form.organizationId,
          vehicleId: form.vehicleId,
          fuelTypeId: form.fuelTypeId,
          tankId: form.tankId,
          litres: requireFinancialInput(form.litres, 'Litres'),
          unitPrice: requireFinancialInput(form.unitPrice, 'Rate'),
          driverName: form.driverName.trim() || undefined,
          notes: form.notes.trim() || undefined,
          ...(form.soldAt ? { soldAt: new Date(form.soldAt).toISOString() } : {}),
        });
        return sale;
      },
      successMessage: 'Credit sale posted.',
      onSuccess: (sale) => {
        clearErrors();
        setForm(emptyForm());
        navigate(`/credit-sales/${sale.id}/invoice`);
      },
    });
  };

  return (
    <>
      <PageMeta
        title="Credit sale | Fuel Management"
        description="Issue fuel to a company vehicle on credit (Concept A)"
      />
      <PageShell>
        <PageHeader
          title="Credit sale (Udhaar)"
          description="Record fuel given without immediate payment. Amount = litres × rate. Invoice number is generated automatically."
          action={<LiveBadge label={canEdit ? 'Can post' : 'View only'} />}
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Litres"
            value={litres !== null ? `${litres.toLocaleString()} L` : '—'}
            detail="Entered quantity"
          />
          <KpiCard
            label="Rate"
            value={rate !== null ? formatMoney(rate, { minimumFractionDigits: 2 }) : '—'}
            detail="Per litre (editable)"
          />
          <KpiCard
            label="Amount"
            value={amount !== null ? formatMoney(amount, { minimumFractionDigits: 2 }) : '—'}
            detail="Litres × rate"
            tone="text-brand-600"
          />
        </section>

        <Surface>
          <SurfaceHeader
            title="Credit transaction"
            description="Company and vehicle come from master data. This is Concept A — not cash paid out."
            action={
              <Link to="/credit-accounts" className={secondaryActionClass}>
                Company ledgers
              </Link>
            }
          />
          <form onSubmit={(event) => void onSubmit(event)} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Station <span className="text-brand-500">*</span>
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
              {fieldError('stationId') ? (
                <p className="mt-1.5 text-xs text-error-600">{fieldError('stationId')}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Company <span className="text-brand-500">*</span>
              </label>
              <Select
                options={companies.map((company) => ({ value: company.id, label: company.name }))}
                placeholder="Select company"
                value={form.organizationId}
                onChange={(value) => {
                  clearFieldError('organizationId');
                  clearFieldError('vehicleId');
                  setForm((current) => ({
                    ...current,
                    organizationId: value,
                    vehicleId: '',
                    driverName: '',
                  }));
                }}
              />
              {fieldError('organizationId') ? (
                <p className="mt-1.5 text-xs text-error-600">{fieldError('organizationId')}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Vehicle <span className="text-brand-500">*</span>
              </label>
              <Select
                options={vehicles.map((vehicle) => ({
                  value: vehicle.id,
                  label: vehicle.registration,
                }))}
                placeholder={form.organizationId ? 'Select vehicle' : 'Select a company first'}
                value={form.vehicleId}
                disabled={!form.organizationId}
                onChange={(value) => {
                  clearFieldError('vehicleId');
                  const vehicle = vehicles.find((item) => item.id === value);
                  setForm((current) => ({
                    ...current,
                    vehicleId: value,
                    driverName: vehicle?.driver ?? current.driverName,
                  }));
                }}
              />
              {fieldError('vehicleId') ? (
                <p className="mt-1.5 text-xs text-error-600">{fieldError('vehicleId')}</p>
              ) : null}
            </div>

            <FormField
              id="credit-driver"
              label="Driver"
              value={form.driverName}
              onChange={(event) => setForm((current) => ({ ...current, driverName: event.target.value }))}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Product <span className="text-brand-500">*</span>
              </label>
              <Select
                options={fuelTypes.map((fuel) => ({
                  value: fuel.id,
                  label: `${fuel.name} (${fuel.code})`,
                }))}
                placeholder="Select product"
                value={form.fuelTypeId}
                onChange={(value) => {
                  clearFieldError('fuelTypeId');
                  clearFieldError('tankId');
                  setForm((current) => ({
                    ...current,
                    fuelTypeId: value,
                    tankId: '',
                    unitPrice: '',
                  }));
                }}
              />
              {fieldError('fuelTypeId') ? (
                <p className="mt-1.5 text-xs text-error-600">{fieldError('fuelTypeId')}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tank <span className="text-brand-500">*</span>
              </label>
              <Select
                options={tanks.map((tank) => ({
                  value: tank.id,
                  label: `${tank.name} (${Number(tank.currentStock).toLocaleString()} L)`,
                }))}
                placeholder={form.fuelTypeId ? 'Select tank' : 'Select a product first'}
                value={form.tankId}
                disabled={!form.fuelTypeId}
                onChange={(value) => {
                  clearFieldError('tankId');
                  setForm((current) => ({ ...current, tankId: value }));
                }}
              />
              {fieldError('tankId') ? (
                <p className="mt-1.5 text-xs text-error-600">{fieldError('tankId')}</p>
              ) : null}
            </div>

            <FormField
              id="credit-litres"
              label="Litres"
              required
              type="number"
              value={form.litres}
              error={fieldError('litres')}
              onChange={(event) => {
                clearFieldError('litres');
                setForm((current) => ({ ...current, litres: event.target.value }));
              }}
            />
            <FormField
              id="credit-rate"
              label="Rate (PKR / L)"
              required
              type="number"
              value={form.unitPrice}
              error={fieldError('unitPrice')}
              onChange={(event) => {
                clearFieldError('unitPrice');
                setForm((current) => ({ ...current, unitPrice: event.target.value }));
              }}
            />
            <DatePicker
              id="credit-sold-at"
              label="Date / time"
              enableTime
              value={form.soldAt}
              onChange={(value) => setForm((current) => ({ ...current, soldAt: value }))}
              hint="Leave blank to use now"
            />
            <FormField
              id="credit-notes"
              label="Notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />

            {canEdit && (
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className={primaryActionClass}
                  disabled={submitting || createCreditSale.isPending}
                >
                  {createCreditSale.isPending ? 'Posting…' : 'Post credit sale & open invoice'}
                </button>
              </div>
            )}
          </form>
        </Surface>
      </PageShell>
    </>
  );
}
