import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { DataTable, type DataTableColumn, DatePicker, Input, Label, PageMeta, Select } from '@companyio/platform-ui';
import { useFuelTypes, useRateMutations, useRates } from '../../hooks';
import type { SellingRate } from '../../types';
import { toErrorMessage } from '../../utils';
import { canEditPath, roleOf } from '../auth/roles';
import { Notice, Surface, SurfaceHeader, primaryActionClass, surfaceClass } from '../../ui/page';
import { SettingsChrome } from './SettingsChrome';

export default function RatesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const { data: products = [], error: productsError } = useFuelTypes();
  const [fuelTypeId, setFuelTypeId] = useState('');
  const { data: rates = [], error: ratesError } = useRates(fuelTypeId || undefined);
  const { createRate } = useRateMutations();
  const [sellingPrice, setSellingPrice] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!fuelTypeId && products[0]) setFuelTypeId(products[0].id);
  }, [products, fuelTypeId]);

  const displayError =
    error ||
    (productsError ? toErrorMessage(productsError) : '') ||
    (ratesError ? toErrorMessage(ratesError) : '');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    setError('');
    setStatus('');
    try {
      await createRate.mutateAsync({
        fuelTypeId,
        sellingPrice: Number(sellingPrice),
        ...(effectiveFrom ? { effectiveFrom: new Date(effectiveFrom).toISOString() } : {}),
      });
      setSellingPrice('');
      setEffectiveFrom('');
      setStatus('Selling rate posted. Current product price was updated.');
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  };

  const selected = products.find((product) => product.id === fuelTypeId);

  const rateColumns = useMemo<DataTableColumn<SellingRate>[]>(
    () => [
      {
        id: 'effectiveFrom',
        header: 'Effective from',
        cell: (rate) => new Date(rate.effectiveFrom).toLocaleString(),
      },
      {
        id: 'sellingPrice',
        header: 'Selling price',
        className: 'font-medium',
        cell: (rate) => String(rate.sellingPrice),
      },
      {
        id: 'recorded',
        header: 'Recorded',
        className: 'text-gray-500',
        cell: (rate) => new Date(rate.createdAt).toLocaleString(),
      },
    ],
    []
  );

  return (
    <>
      <PageMeta
        title="Selling rates | Fuel Management"
        description="Effective-dated selling prices per product"
      />
      <SettingsChrome
        title="Selling rates"
        description="Post a new rate when the pump price changes. The latest rate becomes the current selling price."
        canEdit={canEdit}
      >
        {displayError && <Notice tone="error">{displayError}</Notice>}
        {status && <Notice tone="success">{status}</Notice>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Product</Label>
            <Select
              options={products.map((product) => ({
                value: product.id,
                label: `${product.name} (${product.code})`,
              }))}
              placeholder="Select a product"
              value={fuelTypeId}
              onChange={setFuelTypeId}
            />
          </div>
          <div className={`${surfaceClass} p-5`}>
            <p className="text-sm text-gray-500">Current selling price</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {selected ? String(selected.sellingPrice) : '—'}
            </p>
            <p className="mt-1 text-xs text-brand-600">Per litre at the pump</p>
          </div>
        </div>

        <section className={surfaceClass}>
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Rate history</h2>
            <p className="mt-1 text-sm text-gray-500">Newest first. Earlier rates stay on file.</p>
          </div>
          <DataTable
            columns={rateColumns}
            rows={rates}
            getRowKey={(rate) => rate.id}
            emptyMessage="No dated rates yet. Post the first selling price for this product."
          />
        </section>

        {canEdit && (
          <Surface>
            <SurfaceHeader
              title="Post a new rate"
              description="Leave the date blank to use now. This also updates the product’s current selling price."
            />
            <form onSubmit={(event) => void submit(event)} className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="rate-price">
                  Selling price per litre <span className="text-brand-500">*</span>
                </Label>
                <Input
                  id="rate-price"
                  type="number"
                  placeholder="e.g. 274.80"
                  value={sellingPrice}
                  onChange={(event) => setSellingPrice(event.target.value)}
                  required
                />
              </div>
              <div>
                <DatePicker
                  id="rate-from"
                  label="Effective from"
                  enableTime
                  value={effectiveFrom}
                  onChange={setEffectiveFrom}
                  hint="Leave blank to use now"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className={primaryActionClass}
                  disabled={!fuelTypeId || createRate.isPending}
                >
                  Post selling rate
                </button>
              </div>
            </form>
          </Surface>
        )}
      </SettingsChrome>
    </>
  );
}
