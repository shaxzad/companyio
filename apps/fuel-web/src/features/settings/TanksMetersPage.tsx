import { FormEvent, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { Input, Label, PageMeta, Select } from '@companyio/platform-ui';
import {
  useAssetMutations,
  useFuelTypes,
  useSelectedStation,
  useStationAssets,
} from '../../hooks';
import { requireFinancialInput, toErrorMessage, toFinancialInput } from '../../utils';
import { canEditPath, roleOf } from '../auth/roles';
import {
  Notice,
  Surface,
  SurfaceHeader,
  primaryActionClass,
  surfaceClass,
} from '../../ui/page';
import { SettingsChrome } from './SettingsChrome';

const emptyTank = () => ({ name: '', fuelTypeId: '', capacity: '', openingStock: '' });
const emptyPump = () => ({ number: '', name: '' });
const emptyNozzle = () => ({
  pumpId: '',
  fuelTypeId: '',
  tankId: '',
  number: '',
  openingMeter: '',
});

export default function TanksMetersPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const { stations, stationId, setStationId, error: stationsError } = useSelectedStation();
  const { data: products = [], error: productsError } = useFuelTypes();
  const { data: assets = null, error: assetsError } = useStationAssets(stationId);
  const { createTank, updateTank, createPump, createNozzle } = useAssetMutations(stationId);
  const [tankForm, setTankForm] = useState(emptyTank);
  const [editingTankId, setEditingTankId] = useState<string | null>(null);
  const [pumpForm, setPumpForm] = useState(emptyPump);
  const [nozzleForm, setNozzleForm] = useState(emptyNozzle);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const queryError = stationsError || productsError || assetsError;
  const displayError = error || (queryError ? toErrorMessage(queryError) : '');

  const productOptions = useMemo(
    () => products.map((product) => ({ value: product.id, label: `${product.name} (${product.code})` })),
    [products]
  );
  const nozzleTankOptions = useMemo(
    () =>
      (assets?.tanks ?? [])
        .filter((tank) => !nozzleForm.fuelTypeId || tank.fuelTypeId === nozzleForm.fuelTypeId)
        .map((tank) => ({ value: tank.id, label: tank.name })),
    [assets, nozzleForm.fuelTypeId]
  );
  const pumpOptions = useMemo(
    () =>
      (assets?.pumps ?? []).map((pump) => ({
        value: pump.id,
        label: `${pump.name} · ${pump.number}`,
      })),
    [assets]
  );

  const run = async (work: () => Promise<unknown>, message: string) => {
    setError('');
    setStatus('');
    try {
      await work();
      setStatus(message);
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  };

  const submitTank = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const capacity = requireFinancialInput(tankForm.capacity, 'Tank capacity');
      const openingStock = requireFinancialInput(tankForm.openingStock, 'Opening stock');
      if (editingTankId) {
        await updateTank.mutateAsync({
          id: editingTankId,
          data: {
            name: tankForm.name,
            capacity,
            openingStock,
          },
        });
        setEditingTankId(null);
      } else {
        await createTank.mutateAsync({
          stationId,
          name: tankForm.name,
          fuelTypeId: tankForm.fuelTypeId,
          capacity,
          openingStock,
        });
      }
      setTankForm(emptyTank());
    }, editingTankId ? 'Tank updated.' : 'Tank added.');
  };

  const submitPump = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await createPump.mutateAsync({
        stationId,
        number: pumpForm.number,
        name: pumpForm.name,
      });
      setPumpForm(emptyPump());
    }, 'Meter / pump added.');
  };

  const submitNozzle = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await createNozzle.mutateAsync({
        pumpId: nozzleForm.pumpId,
        fuelTypeId: nozzleForm.fuelTypeId,
        tankId: nozzleForm.tankId || undefined,
        number: nozzleForm.number,
        openingMeter: requireFinancialInput(nozzleForm.openingMeter, 'Opening meter'),
      });
      setNozzleForm(emptyNozzle());
    }, 'Nozzle added.');
  };

  return (
    <>
      <PageMeta
        title="Tanks & meters | Fuel Management"
        description="Tanks linked to products and nozzles linked to tanks"
      />
      <SettingsChrome
        title="Tanks & meters"
        description="Link each tank to a product, then attach nozzles / meters so later shifts can record multiple readings per product."
        canEdit={canEdit}
      >
        {displayError && <Notice tone="error">{displayError}</Notice>}
        {status && <Notice tone="success">{status}</Notice>}

        <div>
          <Label>Station</Label>
          <Select
            options={stations.map((station) => ({
              value: station.id,
              label: `${station.name} (${station.code})`,
            }))}
            placeholder="Select a station"
            value={stationId}
            onChange={setStationId}
          />
        </div>

        <section className={surfaceClass}>
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Tanks</h2>
            <p className="mt-1 text-sm text-gray-500">Opening stock is the starting figure for setup.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Tank</th>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Capacity</th>
                  <th className="px-5 py-3">Opening</th>
                  <th className="px-5 py-3">Current</th>
                  {canEdit && <th className="px-5 py-3 text-end">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(assets?.tanks ?? []).map((tank) => (
                  <tr key={tank.id}>
                    <td className="px-5 py-4 font-medium">{tank.name}</td>
                    <td className="px-5 py-4">{tank.fuelType?.name ?? '—'}</td>
                    <td className="px-5 py-4">{String(tank.capacity)}</td>
                    <td className="px-5 py-4">{String(tank.openingStock)}</td>
                    <td className="px-5 py-4">{String(tank.currentStock)}</td>
                    {canEdit && (
                      <td className="px-5 py-4 text-end">
                        <button
                          type="button"
                          className="text-xs font-semibold text-orange-600"
                          onClick={() => {
                            setEditingTankId(tank.id);
                            setTankForm({
                              name: tank.name,
                              fuelTypeId: tank.fuelTypeId,
                              capacity: toFinancialInput(tank.capacity, { allowZero: true }),
                              openingStock: toFinancialInput(tank.openingStock, { allowZero: true }),
                            });
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {(assets?.tanks ?? []).length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-gray-500" colSpan={canEdit ? 6 : 5}>
                      No tanks yet. Add PMG Tank 1, HSD Tank 1, and so on.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={surfaceClass}>
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Meters / nozzles</h2>
            <p className="mt-1 text-sm text-gray-500">
              Each nozzle belongs to a pump and should point at the tank that feeds it.
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {(assets?.pumps ?? []).map((pump) => (
              <div key={pump.id} className="px-5 py-4">
                <p className="font-medium text-gray-900 dark:text-white">
                  {pump.name}{' '}
                  <span className="font-normal text-gray-400">· Pump {pump.number}</span>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  {pump.nozzles.map((nozzle) => (
                    <li key={nozzle.id}>
                      Nozzle {nozzle.number} · {nozzle.fuelType?.name} · Tank{' '}
                      {nozzle.tank?.name ?? 'not linked'} · Opening meter {String(nozzle.openingMeter)}
                    </li>
                  ))}
                  {pump.nozzles.length === 0 && (
                    <li className="text-gray-400">No nozzles on this pump yet.</li>
                  )}
                </ul>
              </div>
            ))}
            {(assets?.pumps ?? []).length === 0 && (
              <p className="px-5 py-8 text-sm text-gray-500">No meters yet. Add a pump, then a nozzle.</p>
            )}
          </div>
        </section>

        {canEdit && stationId && (
          <div className="grid gap-6 xl:grid-cols-3">
            <Surface>
              <SurfaceHeader
                title={editingTankId ? 'Edit tank' : 'Add tank'}
                description="Link the tank to a product."
                action={
                  editingTankId ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-orange-600"
                      onClick={() => {
                        setEditingTankId(null);
                        setTankForm(emptyTank());
                      }}
                    >
                      Cancel edit
                    </button>
                  ) : null
                }
              />
              <form onSubmit={submitTank} className="space-y-4">
                <div>
                  <Label>Tank name</Label>
                  <Input
                    placeholder="e.g. PMG Tank 1"
                    value={tankForm.name}
                    onChange={(event) => setTankForm((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Product</Label>
                  <Select
                    options={productOptions}
                    placeholder="Select a product"
                    value={tankForm.fuelTypeId}
                    onChange={(value) => setTankForm((current) => ({ ...current, fuelTypeId: value }))}
                  />
                </div>
                <div>
                  <Label>Capacity (litres)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 25000"
                    value={tankForm.capacity}
                    onChange={(event) =>
                      setTankForm((current) => ({ ...current, capacity: event.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Opening stock (litres)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 12000"
                    value={tankForm.openingStock}
                    onChange={(event) =>
                      setTankForm((current) => ({ ...current, openingStock: event.target.value }))
                    }
                  />
                </div>
                <button type="submit" className={primaryActionClass}>
                  {editingTankId ? 'Save tank' : 'Add tank'}
                </button>
              </form>
            </Surface>

            <Surface>
              <SurfaceHeader title="Add meter / pump" description="A physical dispenser unit." />
              <form onSubmit={submitPump} className="space-y-4">
                <div>
                  <Label>Pump number</Label>
                  <Input
                    placeholder="e.g. 1"
                    value={pumpForm.number}
                    onChange={(event) =>
                      setPumpForm((current) => ({ ...current, number: event.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Pump name</Label>
                  <Input
                    placeholder="e.g. Island A"
                    value={pumpForm.name}
                    onChange={(event) =>
                      setPumpForm((current) => ({ ...current, name: event.target.value }))
                    }
                    required
                  />
                </div>
                <button type="submit" className={primaryActionClass}>
                  Add pump
                </button>
              </form>
            </Surface>

            <Surface>
              <SurfaceHeader title="Add nozzle" description="Link a nozzle to a tank and product." />
              <form onSubmit={submitNozzle} className="space-y-4">
                <div>
                  <Label>Pump</Label>
                  <Select
                    options={pumpOptions}
                    placeholder="Select a pump"
                    value={nozzleForm.pumpId}
                    onChange={(value) => setNozzleForm((current) => ({ ...current, pumpId: value }))}
                  />
                </div>
                <div>
                  <Label>Nozzle number</Label>
                  <Input
                    placeholder="e.g. 1"
                    value={nozzleForm.number}
                    onChange={(event) =>
                      setNozzleForm((current) => ({ ...current, number: event.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Product</Label>
                  <Select
                    options={productOptions}
                    placeholder="Select a product"
                    value={nozzleForm.fuelTypeId}
                    onChange={(value) => {
                      const tanks = (assets?.tanks ?? []).filter((tank) => tank.fuelTypeId === value);
                      setNozzleForm((current) => ({
                        ...current,
                        fuelTypeId: value,
                        tankId: tanks.length === 1 ? tanks[0].id : '',
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label>Tank</Label>
                  <Select
                    options={nozzleTankOptions}
                    placeholder={
                      nozzleForm.fuelTypeId
                        ? nozzleTankOptions.length
                          ? 'Select a tank'
                          : 'No tanks for this product'
                        : 'Select a product first'
                    }
                    value={nozzleForm.tankId}
                    onChange={(value) => setNozzleForm((current) => ({ ...current, tankId: value }))}
                    disabled={!nozzleForm.fuelTypeId}
                  />
                </div>
                <div>
                  <Label>Opening meter</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 0"
                    value={nozzleForm.openingMeter}
                    onChange={(event) =>
                      setNozzleForm((current) => ({ ...current, openingMeter: event.target.value }))
                    }
                  />
                </div>
                <button type="submit" className={primaryActionClass}>
                  Add nozzle
                </button>
              </form>
            </Surface>
          </div>
        )}
      </SettingsChrome>
    </>
  );
}
