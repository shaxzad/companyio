import { FormEvent, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import {
  ActionSpinner,
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  Input,
  Label,
  Modal,
  Notice,
  PageMeta,
  primaryActionClass,
  secondaryActionClass,
  Select,
  submitActionLabel,
  surfaceClass,
  toast,
  useConfirmDialog,
} from '@companyio/platform-ui';
import {
  useAssetMutations,
  useFuelTypes,
  useSelectedStation,
  useStationAssets,
} from '../../hooks';
import type { StationAssets } from '../../types';
import { requireFinancialInput, toErrorMessage, toFinancialInput } from '../../utils';
import { canEditPath, roleOf } from '../auth/roles';
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

type TankModal = 'closed' | 'create' | 'edit';
type PumpModal = 'closed' | 'create';
type NozzleModal = 'closed' | 'create';

type TankRow = StationAssets['tanks'][number];

const formatLitresCell = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric)) return String(numeric);
  return String(value);
};

export default function TanksMetersPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const { stations, stationId, setStationId, error: stationsError } = useSelectedStation();
  const { data: products = [], error: productsError } = useFuelTypes();
  const { data: assets = null, error: assetsError } = useStationAssets(stationId);
  const { createTank, updateTank, createPump, createNozzle } = useAssetMutations(stationId);
  const confirmDialog = useConfirmDialog();

  const [tankModal, setTankModal] = useState<TankModal>('closed');
  const [editingTankId, setEditingTankId] = useState<string | null>(null);
  const [tankForm, setTankForm] = useState(emptyTank);

  const [pumpModal, setPumpModal] = useState<PumpModal>('closed');
  const [pumpForm, setPumpForm] = useState(emptyPump);

  const [nozzleModal, setNozzleModal] = useState<NozzleModal>('closed');
  const [nozzleForm, setNozzleForm] = useState(emptyNozzle);

  const [formError, setFormError] = useState('');

  const queryError = stationsError || productsError || assetsError;
  const listError = queryError ? toErrorMessage(queryError) : '';

  const productOptions = useMemo(
    () => products.map((product) => ({ value: product.id, label: `${product.name} (${product.code})` })),
    [products]
  );
  const nozzleTankOptions = useMemo(
    () =>
      (assets?.tanks ?? [])
        .filter((tank) => tank.active !== false)
        .filter((tank) => !nozzleForm.fuelTypeId || tank.fuelTypeId === nozzleForm.fuelTypeId)
        .map((tank) => ({ value: tank.id, label: tank.name })),
    [assets, nozzleForm.fuelTypeId]
  );
  const pumpOptions = useMemo(
    () =>
      (assets?.pumps ?? [])
        .filter((pump) => pump.active !== false)
        .map((pump) => ({
          value: pump.id,
          label: `${pump.name} · ${pump.number}`,
        })),
    [assets]
  );

  const tankSaving = createTank.isPending || updateTank.isPending;
  const pumpSaving = createPump.isPending;
  const nozzleSaving = createNozzle.isPending;
  const editingTank = tankModal === 'edit';

  const closeTankModal = () => {
    if (tankSaving) return;
    setTankModal('closed');
    setEditingTankId(null);
    setTankForm(emptyTank());
    setFormError('');
  };

  const openCreateTank = () => {
    setEditingTankId(null);
    setTankForm(emptyTank());
    setFormError('');
    setTankModal('create');
  };

  const openEditTank = (tank: TankRow) => {
    setEditingTankId(tank.id);
    setTankForm({
      name: tank.name,
      fuelTypeId: tank.fuelTypeId,
      capacity: toFinancialInput(tank.capacity, { allowZero: true }),
      openingStock: toFinancialInput(tank.openingStock, { allowZero: true }),
    });
    setFormError('');
    setTankModal('edit');
  };

  const closePumpModal = () => {
    if (pumpSaving) return;
    setPumpModal('closed');
    setPumpForm(emptyPump());
    setFormError('');
  };

  const closeNozzleModal = () => {
    if (nozzleSaving) return;
    setNozzleModal('closed');
    setNozzleForm(emptyNozzle());
    setFormError('');
  };

  const tankColumns = useMemo<DataTableColumn<TankRow>[]>(() => {
    const columns: DataTableColumn<TankRow>[] = [
      {
        id: 'tank',
        header: 'Tank',
        className: 'font-medium text-gray-900 dark:text-white',
        cell: (tank) => (
          <>
            <span>{tank.name || '—'}</span>
            {tank.active === false ? (
              <span className="ml-2 text-xs font-normal text-gray-400">Inactive</span>
            ) : null}
          </>
        ),
      },
      {
        id: 'product',
        header: 'Product',
        className: 'text-gray-800 dark:text-gray-200',
        cell: (tank) => tank.fuelType?.name ?? '—',
      },
      {
        id: 'capacity',
        header: 'Capacity',
        className: 'tabular-nums text-gray-800 dark:text-gray-200',
        cell: (tank) => formatLitresCell(tank.capacity),
      },
      {
        id: 'opening',
        header: 'Opening',
        className: 'tabular-nums text-gray-800 dark:text-gray-200',
        cell: (tank) => formatLitresCell(tank.openingStock),
      },
      {
        id: 'current',
        header: 'Current',
        className: 'tabular-nums text-gray-800 dark:text-gray-200',
        cell: (tank) => formatLitresCell(tank.currentStock),
      },
    ];

    if (canEdit) {
      columns.push({
        id: 'actions',
        header: 'Actions',
        className: 'text-end',
        headerClassName: 'text-end',
        cell: (tank) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={`${secondaryActionClass} !px-3 !py-1.5 text-xs`}
              onClick={() => openEditTank(tank)}
            >
              Edit
            </button>
            <button
              type="button"
              className={`${secondaryActionClass} !px-3 !py-1.5 text-xs`}
              onClick={() =>
                confirmDialog.askConfirm({
                  title: tank.active === false ? 'Activate tank?' : 'Deactivate tank?',
                  description:
                    tank.active === false
                      ? `${tank.name} will appear again for receiving and nozzles.`
                      : `${tank.name} will be hidden from new receiving and nozzle links. Stock history stays.`,
                  confirmLabel: tank.active === false ? 'Activate' : 'Deactivate',
                  tone: tank.active === false ? 'default' : 'danger',
                  onConfirm: async () => {
                    try {
                      await updateTank.mutateAsync({
                        id: tank.id,
                        data: { active: tank.active === false },
                      });
                      toast.success(tank.active === false ? 'Tank activated.' : 'Tank deactivated.');
                    } catch (caught) {
                      toast.error(toErrorMessage(caught));
                      throw caught;
                    }
                  },
                })
              }
            >
              {tank.active === false ? 'Activate' : 'Deactivate'}
            </button>
          </div>
        ),
      });
    }

    return columns;
  }, [canEdit, confirmDialog, updateTank]);

  const submitTank = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    void (async () => {
      try {
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
          toast.success('Tank updated.');
        } else {
          if (!tankForm.fuelTypeId) {
            setFormError('Select a product for this tank.');
            return;
          }
          await createTank.mutateAsync({
            stationId,
            name: tankForm.name,
            fuelTypeId: tankForm.fuelTypeId,
            capacity,
            openingStock,
          });
          toast.success('Tank added.');
        }
        setTankModal('closed');
        setEditingTankId(null);
        setTankForm(emptyTank());
      } catch (caught) {
        setFormError(toErrorMessage(caught));
      }
    })();
  };

  const submitPump = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    void (async () => {
      try {
        await createPump.mutateAsync({
          stationId,
          number: pumpForm.number,
          name: pumpForm.name,
        });
        toast.success('Meter / pump added.');
        setPumpModal('closed');
        setPumpForm(emptyPump());
      } catch (caught) {
        setFormError(toErrorMessage(caught));
      }
    })();
  };

  const submitNozzle = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    void (async () => {
      try {
        if (!nozzleForm.pumpId || !nozzleForm.fuelTypeId) {
          setFormError('Select a pump and product.');
          return;
        }
        await createNozzle.mutateAsync({
          pumpId: nozzleForm.pumpId,
          fuelTypeId: nozzleForm.fuelTypeId,
          tankId: nozzleForm.tankId || undefined,
          number: nozzleForm.number,
          openingMeter: requireFinancialInput(nozzleForm.openingMeter, 'Opening meter'),
        });
        toast.success('Nozzle added.');
        setNozzleModal('closed');
        setNozzleForm(emptyNozzle());
      } catch (caught) {
        setFormError(toErrorMessage(caught));
      }
    })();
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
        {listError ? <Notice tone="error">{listError}</Notice> : null}

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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Tanks</h2>
              <p className="mt-1 text-sm text-gray-500">Opening stock is the starting figure for setup.</p>
            </div>
            {canEdit && stationId ? (
              <button type="button" className={primaryActionClass} onClick={openCreateTank}>
                Add tank
              </button>
            ) : null}
          </div>
          <DataTable
            columns={tankColumns}
            rows={assets?.tanks ?? []}
            getRowKey={(tank) => tank.id}
            emptyMessage="No tanks yet. Add PMG Tank 1, HSD Tank 1, and so on."
          />
        </section>

        <section className={surfaceClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Meters / nozzles</h2>
              <p className="mt-1 text-sm text-gray-500">
                Each nozzle belongs to a pump and should point at the tank that feeds it.
              </p>
            </div>
            {canEdit && stationId ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={secondaryActionClass}
                  onClick={() => {
                    setPumpForm(emptyPump());
                    setFormError('');
                    setPumpModal('create');
                  }}
                >
                  Add pump
                </button>
                <button
                  type="button"
                  className={primaryActionClass}
                  onClick={() => {
                    setNozzleForm(emptyNozzle());
                    setFormError('');
                    setNozzleModal('create');
                  }}
                >
                  Add nozzle
                </button>
              </div>
            ) : null}
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {(assets?.pumps ?? []).map((pump) => (
              <div key={pump.id} className="px-5 py-4">
                <p className="font-medium text-gray-900 dark:text-white">
                  {pump.name}{' '}
                  <span className="font-normal text-gray-400">· Pump {pump.number}</span>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
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
      </SettingsChrome>

      <Modal
        isOpen={tankModal !== 'closed'}
        onClose={closeTankModal}
        className="mx-4 w-full max-w-lg p-6 sm:p-8"
        showCloseButton={!tankSaving}
      >
        <h2 className="pr-10 text-lg font-semibold text-gray-900 dark:text-white">
          {editingTank ? 'Edit tank' : 'Add tank'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {editingTank ? 'Update capacity or opening stock.' : 'Link the tank to a product.'}
        </p>
        <form onSubmit={submitTank} className="mt-5 space-y-4">
          {formError ? <Notice tone="error">{formError}</Notice> : null}
          <div>
            <Label>Tank name</Label>
            <Input
              placeholder="e.g. PMG Tank 1"
              value={tankForm.name}
              onChange={(event) => setTankForm((current) => ({ ...current, name: event.target.value }))}
              required
              disabled={tankSaving}
            />
          </div>
          <div>
            <Label>Product</Label>
            <Select
              options={productOptions}
              placeholder="Select a product"
              value={tankForm.fuelTypeId}
              onChange={(value) => setTankForm((current) => ({ ...current, fuelTypeId: value }))}
              disabled={editingTank || tankSaving}
            />
            {editingTank ? (
              <p className="mt-1 text-xs text-gray-500">Product cannot change after the tank is created.</p>
            ) : null}
          </div>
          <div>
            <Label>Capacity (litres)</Label>
            <Input
              type="number"
              placeholder="e.g. 25000"
              value={tankForm.capacity}
              onChange={(event) => setTankForm((current) => ({ ...current, capacity: event.target.value }))}
              required
              disabled={tankSaving}
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
              disabled={tankSaving}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={secondaryActionClass} onClick={closeTankModal} disabled={tankSaving}>
              Cancel
            </button>
            <button type="submit" className={primaryActionClass} disabled={tankSaving}>
              {tankSaving ? <ActionSpinner /> : null}
              {submitActionLabel({
                pending: tankSaving,
                editing: editingTank,
                addLabel: 'Add tank',
                updateLabel: 'Update tank',
                addingLabel: 'Adding…',
                updatingLabel: 'Updating…',
              })}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={pumpModal !== 'closed'}
        onClose={closePumpModal}
        className="mx-4 w-full max-w-md p-6 sm:p-8"
        showCloseButton={!pumpSaving}
      >
        <h2 className="pr-10 text-lg font-semibold text-gray-900 dark:text-white">Add meter / pump</h2>
        <p className="mt-1 text-sm text-gray-500">A physical dispenser unit.</p>
        <form onSubmit={submitPump} className="mt-5 space-y-4">
          {formError ? <Notice tone="error">{formError}</Notice> : null}
          <div>
            <Label>Pump number</Label>
            <Input
              placeholder="e.g. 1"
              value={pumpForm.number}
              onChange={(event) => setPumpForm((current) => ({ ...current, number: event.target.value }))}
              required
              disabled={pumpSaving}
            />
          </div>
          <div>
            <Label>Pump name</Label>
            <Input
              placeholder="e.g. Island A"
              value={pumpForm.name}
              onChange={(event) => setPumpForm((current) => ({ ...current, name: event.target.value }))}
              required
              disabled={pumpSaving}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={secondaryActionClass} onClick={closePumpModal} disabled={pumpSaving}>
              Cancel
            </button>
            <button type="submit" className={primaryActionClass} disabled={pumpSaving}>
              {pumpSaving ? <ActionSpinner /> : null}
              {submitActionLabel({
                pending: pumpSaving,
                editing: false,
                addLabel: 'Add pump',
                addingLabel: 'Adding…',
              })}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={nozzleModal !== 'closed'}
        onClose={closeNozzleModal}
        className="mx-4 w-full max-w-lg p-6 sm:p-8"
        showCloseButton={!nozzleSaving}
      >
        <h2 className="pr-10 text-lg font-semibold text-gray-900 dark:text-white">Add nozzle</h2>
        <p className="mt-1 text-sm text-gray-500">Link a nozzle to a tank and product.</p>
        <form onSubmit={submitNozzle} className="mt-5 space-y-4">
          {formError ? <Notice tone="error">{formError}</Notice> : null}
          <div>
            <Label>Pump</Label>
            <Select
              options={pumpOptions}
              placeholder="Select a pump"
              value={nozzleForm.pumpId}
              onChange={(value) => setNozzleForm((current) => ({ ...current, pumpId: value }))}
              disabled={nozzleSaving}
            />
          </div>
          <div>
            <Label>Nozzle number</Label>
            <Input
              placeholder="e.g. 1"
              value={nozzleForm.number}
              onChange={(event) => setNozzleForm((current) => ({ ...current, number: event.target.value }))}
              required
              disabled={nozzleSaving}
            />
          </div>
          <div>
            <Label>Product</Label>
            <Select
              options={productOptions}
              placeholder="Select a product"
              value={nozzleForm.fuelTypeId}
              onChange={(value) => {
                const tanks = (assets?.tanks ?? []).filter(
                  (tank) => tank.active !== false && tank.fuelTypeId === value
                );
                setNozzleForm((current) => ({
                  ...current,
                  fuelTypeId: value,
                  tankId: tanks.length === 1 ? tanks[0].id : '',
                }));
              }}
              disabled={nozzleSaving}
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
              disabled={!nozzleForm.fuelTypeId || nozzleSaving}
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
              disabled={nozzleSaving}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className={secondaryActionClass}
              onClick={closeNozzleModal}
              disabled={nozzleSaving}
            >
              Cancel
            </button>
            <button type="submit" className={primaryActionClass} disabled={nozzleSaving}>
              {nozzleSaving ? <ActionSpinner /> : null}
              {submitActionLabel({
                pending: nozzleSaving,
                editing: false,
                addLabel: 'Add nozzle',
                addingLabel: 'Adding…',
              })}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.request?.title ?? ''}
        description={confirmDialog.request?.description ?? ''}
        confirmLabel={confirmDialog.request?.confirmLabel}
        cancelLabel={confirmDialog.request?.cancelLabel}
        tone={confirmDialog.request?.tone}
        pending={confirmDialog.pending || updateTank.isPending}
        pendingLabel={
          confirmDialog.request?.confirmLabel === 'Activate' ? 'Activating…' : 'Deactivating…'
        }
        onConfirm={() => void confirmDialog.confirm()}
        onCancel={confirmDialog.close}
      />
    </>
  );
}
