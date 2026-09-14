import { FormEvent, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { DataTable, type DataTableColumn, DatePicker, Input, Label, PageMeta, Select } from '@companyio/platform-ui';
import {
  useCreateReceiving,
  useFuelTypes,
  useReceipts,
  useSelectedStation,
  useStationAssets,
} from '../../hooks';
import type { FuelReceipt } from '../../types';
import { formatMoney, roundTo, toErrorMessage } from '../../utils';
import { canEditPath, roleOf } from '../auth/roles';
import {
  KpiCard,
  LiveBadge,
  Notice,
  PageHeader,
  PageShell,
  Surface,
  SurfaceHeader,
  primaryActionClass,
  surfaceClass,
} from '../../ui/page';

const money = (value: number) =>
  formatMoney(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const emptyForm = () => ({
  supplier: '',
  tankerNumber: '',
  invoiceNumber: '',
  fuelTypeId: '',
  tankId: '',
  expectedLitres: '',
  actualLitres: '',
  totalDip: '',
  receivedDip: '',
  purchaseRate: '',
  accessRateMode: 'PURCHASE' as 'PURCHASE' | 'SELLING',
  tankerTip: '',
  otherReceivingCost: '',
  receivedAt: '',
  notes: '',
});

export default function ReceivingPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const { stations, stationId, setStationId, error: stationsError } = useSelectedStation();
  const { data: fuelTypes = [], error: fuelTypesError } = useFuelTypes();
  const { data: assets = null, error: assetsError } = useStationAssets(stationId);
  const [historyTankId, setHistoryTankId] = useState('');
  const { data: history = [], error: historyError } = useReceipts(stationId, historyTankId || undefined);
  const createReceiving = useCreateReceiving();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const queryError = stationsError || fuelTypesError || assetsError || historyError;
  const displayError = error || (queryError ? toErrorMessage(queryError) : '');

  const tanksForProduct = useMemo(
    () =>
      (assets?.tanks ?? []).filter(
        (tank) => !form.fuelTypeId || tank.fuelTypeId === form.fuelTypeId
      ),
    [assets, form.fuelTypeId]
  );

  const selectedFuel = fuelTypes.find((fuel) => fuel.id === form.fuelTypeId);
  const expected = Number(form.expectedLitres || 0);
  const actual = Number(form.actualLitres || 0);
  const purchaseRate = Number(form.purchaseRate || 0);
  const delta = form.expectedLitres && form.actualLitres ? roundTo(actual - expected, 3) : 0;
  const accessLitres = delta > 0 ? delta : 0;
  const shortageLitres = delta < 0 ? roundTo(Math.abs(delta), 3) : 0;
  const accessRate =
    form.accessRateMode === 'SELLING' && selectedFuel
      ? Number(selectedFuel.sellingPrice)
      : purchaseRate;
  const fuelCost = form.actualLitres && form.purchaseRate ? roundTo(actual * purchaseRate, 2) : 0;
  const tankerTip = Number(form.tankerTip || 0);
  const otherCost = Number(form.otherReceivingCost || 0);
  const totalCost = roundTo(fuelCost + tankerTip + otherCost, 2);

  const update = <K extends keyof ReturnType<typeof emptyForm>>(
    field: K,
    value: ReturnType<typeof emptyForm>[K]
  ) => setForm((current) => ({ ...current, [field]: value }));

  const historyColumns = useMemo<DataTableColumn<FuelReceipt>[]>(
    () => [
      {
        id: 'when',
        header: 'When',
        cell: (row) => (
          <>
            <p className="font-medium">{new Date(row.receivedAt).toLocaleString()}</p>
            <p className="text-xs text-gray-500">
              {row.supplier}
              {row.tankerNumber ? ` · ${row.tankerNumber}` : ''}
            </p>
          </>
        ),
      },
      {
        id: 'tank',
        header: 'Tank / product',
        cell: (row) => `${row.tankName ?? '—'} · ${row.fuelTypeName ?? '—'}`,
      },
      {
        id: 'expected',
        header: 'Expected',
        cell: (row) => row.expectedLitres,
      },
      {
        id: 'actual',
        header: 'Actual',
        className: 'font-medium',
        cell: (row) => row.actualLitres,
      },
      {
        id: 'access',
        header: 'Access',
        cell: (row) =>
          row.accessLitres > 0
            ? `+${row.accessLitres}`
            : row.shortageLitres > 0
              ? `−${row.shortageLitres}`
              : '0',
      },
      {
        id: 'fuelCost',
        header: 'Fuel cost',
        cell: (row) => money(row.fuelCost),
      },
    ],
    []
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit || !stationId) return;
    setError('');
    setStatus('');
    try {
      const saved = await createReceiving.mutateAsync({
        stationId,
        supplier: form.supplier,
        fuelTypeId: form.fuelTypeId,
        tankId: form.tankId,
        expectedLitres: expected,
        actualLitres: actual,
        purchaseRate,
        accessRateMode: form.accessRateMode,
        ...(form.tankerNumber ? { tankerNumber: form.tankerNumber } : {}),
        ...(form.invoiceNumber ? { invoiceNumber: form.invoiceNumber } : {}),
        ...(form.totalDip ? { totalDip: Number(form.totalDip) } : {}),
        ...(form.receivedDip ? { receivedDip: Number(form.receivedDip) } : {}),
        ...(form.tankerTip ? { tankerTip } : {}),
        ...(form.otherReceivingCost ? { otherReceivingCost: otherCost } : {}),
        ...(form.receivedAt ? { receivedAt: new Date(form.receivedAt).toISOString() } : {}),
        ...(form.notes ? { notes: form.notes } : {}),
      });
      setStatus(
        `Tanker saved. Access ${saved.accessLitres} L${
          saved.shortageLitres ? ` · Shortage ${saved.shortageLitres} L` : ''
        }. Tank stock updated by ${saved.actualLitres} L.`
      );
      setForm(emptyForm());
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  };

  return (
    <>
      <PageMeta
        title="Tanker receiving | Fuel Management"
        description="Record tanker deliveries with dips, Access, and tank stock updates"
      />
      <PageShell>
        <PageHeader
          title="Tanker receiving"
          description="Enter the delivery note and dip figures. Access = actual − expected when positive; a shortage is flagged when actual is lower. Fuel cost uses actual litres × purchase rate until costing is confirmed."
          action={<LiveBadge label={canEdit ? 'Ready to receive' : 'View only'} />}
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Access (L)"
            value={form.expectedLitres && form.actualLitres ? String(accessLitres) : '--'}
            detail={shortageLitres > 0 ? `Shortage ${shortageLitres} L` : 'Gain when actual > expected'}
            tone={shortageLitres > 0 ? 'text-error-600' : 'text-success-600'}
          />
          <KpiCard
            label="Fuel cost"
            value={fuelCost ? money(fuelCost) : '--'}
            detail="Actual litres × purchase rate"
            tone="text-brand-600"
          />
          <KpiCard
            label="Access rate"
            value={accessRate ? String(accessRate) : '--'}
            detail={form.accessRateMode === 'SELLING' ? 'Selling rate (configurable)' : 'Purchase rate (default)'}
            tone="text-brand-600"
          />
          <KpiCard
            label="Landed total"
            value={fuelCost ? money(totalCost) : '--'}
            detail="Fuel + tip + other cost"
            tone="text-brand-600"
          />
        </section>

        {displayError && <Notice tone="error">{displayError}</Notice>}
        {status && <Notice tone="success">{status}</Notice>}

        <form onSubmit={(event) => void submit(event)} className="space-y-6">
          <Surface>
            <SurfaceHeader
              title="Tanker entry"
              description="Link the delivery to a product tank. Stock increases by actual / received litres."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="recv-station">Station</Label>
                <Select
                  id="recv-station"
                  options={stations.map((station) => ({
                    value: station.id,
                    label: `${station.name} (${station.code})`,
                  }))}
                  placeholder={stations.length ? 'Select a station' : 'No stations yet'}
                  value={stationId}
                  onChange={setStationId}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <DatePicker
                  id="recv-at"
                  label="Date / time"
                  enableTime
                  value={form.receivedAt}
                  onChange={(value) => update('receivedAt', value)}
                  disabled={!canEdit}
                  hint="Leave blank to use now"
                />
              </div>
              <div>
                <Label htmlFor="recv-supplier">
                  Supplier <span className="text-brand-500">*</span>
                </Label>
                <Input
                  id="recv-supplier"
                  placeholder="e.g. Northern Fuels"
                  value={form.supplier}
                  onChange={(event) => update('supplier', event.target.value)}
                  required
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="recv-tanker">Tanker number</Label>
                <Input
                  id="recv-tanker"
                  placeholder="e.g. GB-09"
                  value={form.tankerNumber}
                  onChange={(event) => update('tankerNumber', event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="recv-product">
                  Product <span className="text-brand-500">*</span>
                </Label>
                <Select
                  id="recv-product"
                  options={fuelTypes.map((fuel) => ({
                    value: fuel.id,
                    label: `${fuel.name} (${fuel.code})`,
                  }))}
                  placeholder={fuelTypes.length ? 'Select a product' : 'Add products in Settings'}
                  value={form.fuelTypeId}
                  onChange={(value) => {
                    const tanks = (assets?.tanks ?? []).filter((tank) => tank.fuelTypeId === value);
                    setForm((current) => ({
                      ...current,
                      fuelTypeId: value,
                      tankId: tanks.length === 1 ? tanks[0].id : '',
                      purchaseRate:
                        current.purchaseRate ||
                        String(fuelTypes.find((fuel) => fuel.id === value)?.purchasePrice ?? ''),
                    }));
                  }}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="recv-tank">
                  Tank <span className="text-brand-500">*</span>
                </Label>
                <Select
                  id="recv-tank"
                  options={tanksForProduct.map((tank) => ({ value: tank.id, label: tank.name }))}
                  placeholder={
                    !form.fuelTypeId
                      ? 'Select a product first'
                      : tanksForProduct.length
                        ? 'Select a tank'
                        : 'No tanks for this product'
                  }
                  value={form.tankId}
                  onChange={(value) => update('tankId', value)}
                  disabled={!canEdit || !form.fuelTypeId}
                />
              </div>
              <div>
                <Label htmlFor="recv-expected">
                  Expected litres (delivery note) <span className="text-brand-500">*</span>
                </Label>
                <Input
                  id="recv-expected"
                  type="number"
                  placeholder="e.g. 8000"
                  value={form.expectedLitres}
                  onChange={(event) => update('expectedLitres', event.target.value)}
                  required
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="recv-actual">
                  Actual / received litres <span className="text-brand-500">*</span>
                </Label>
                <Input
                  id="recv-actual"
                  type="number"
                  placeholder="e.g. 8050"
                  value={form.actualLitres}
                  onChange={(event) => update('actualLitres', event.target.value)}
                  required
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="recv-total-dip">Total dip</Label>
                <Input
                  id="recv-total-dip"
                  type="number"
                  placeholder="e.g. 182.5"
                  value={form.totalDip}
                  onChange={(event) => update('totalDip', event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="recv-received-dip">Received-dip</Label>
                <Input
                  id="recv-received-dip"
                  type="number"
                  placeholder="e.g. 180.0"
                  value={form.receivedDip}
                  onChange={(event) => update('receivedDip', event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="recv-rate">
                  Purchase rate per litre <span className="text-brand-500">*</span>
                </Label>
                <Input
                  id="recv-rate"
                  type="number"
                  placeholder="e.g. 265.00"
                  value={form.purchaseRate}
                  onChange={(event) => update('purchaseRate', event.target.value)}
                  required
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="recv-access-mode">Access valued at</Label>
                <Select
                  id="recv-access-mode"
                  options={[
                    { value: 'PURCHASE', label: 'Purchase rate (default)' },
                    { value: 'SELLING', label: 'Current selling rate' },
                  ]}
                  placeholder="Select access rate mode"
                  value={form.accessRateMode}
                  onChange={(value) =>
                    update('accessRateMode', value === 'SELLING' ? 'SELLING' : 'PURCHASE')
                  }
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="recv-tip">Tanker tip</Label>
                <Input
                  id="recv-tip"
                  type="number"
                  placeholder="e.g. 2000"
                  value={form.tankerTip}
                  onChange={(event) => update('tankerTip', event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="recv-other">Other receiving cost</Label>
                <Input
                  id="recv-other"
                  type="number"
                  placeholder="e.g. 500"
                  value={form.otherReceivingCost}
                  onChange={(event) => update('otherReceivingCost', event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="recv-invoice">Invoice number</Label>
                <Input
                  id="recv-invoice"
                  placeholder="e.g. INV-1042"
                  value={form.invoiceNumber}
                  onChange={(event) => update('invoiceNumber', event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="recv-notes">Notes</Label>
                <Input
                  id="recv-notes"
                  placeholder="Optional note"
                  value={form.notes}
                  onChange={(event) => update('notes', event.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>

            {(accessLitres > 0 || shortageLitres > 0) && (
              <div className="mt-5">
                <Notice tone={shortageLitres > 0 ? 'warning' : 'success'}>
                  {shortageLitres > 0
                    ? `Shortage ${shortageLitres} L (expected higher than actual). Stock still increases by actual litres only.`
                    : `Access / gain ${accessLitres} L valued at ${accessRate} (${form.accessRateMode === 'SELLING' ? 'selling' : 'purchase'} rate).`}
                </Notice>
              </div>
            )}

            {canEdit ? (
              <div className="mt-7 flex justify-end">
                <button
                  type="submit"
                  className={primaryActionClass}
                  disabled={createReceiving.isPending || !stationId}
                >
                  {createReceiving.isPending ? 'Saving...' : 'Save tanker receipt'}
                </button>
              </div>
            ) : (
              <p className="mt-5 text-sm text-gray-500">View only for your role.</p>
            )}
          </Surface>
        </form>

        <section className={surfaceClass}>
          <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Receiving history</h2>
              <p className="mt-1 text-sm text-gray-500">Recent tanker entries for this station</p>
            </div>
            <div className="w-full sm:w-64">
              <Select
                options={[
                  { value: 'all', label: 'All tanks' },
                  ...(assets?.tanks ?? []).map((tank) => ({ value: tank.id, label: tank.name })),
                ]}
                placeholder="Filter by tank"
                value={historyTankId || 'all'}
                onChange={(value) => setHistoryTankId(value === 'all' ? '' : value)}
              />
            </div>
          </div>
          <DataTable
            columns={historyColumns}
            rows={history}
            getRowKey={(row) => row.id}
            emptyMessage={
              <>
                No receipts yet.{' '}
                <Link to="/opening" className="font-semibold text-brand-600">
                  Open the day
                </Link>{' '}
                if you have not, then save the first tanker.
              </>
            }
          />
        </section>
      </PageShell>
    </>
  );
}
