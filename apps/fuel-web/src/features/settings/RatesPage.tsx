import { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { Input, Label, PageMeta, Select } from '@companyio/platform-ui';
import {
  createRate,
  listFuelTypes,
  listRates,
  type FuelType,
  type SellingRate,
} from '../../api/masterApi';
import { canEditPath, roleOf } from '../auth/roles';
import { Notice, Surface, SurfaceHeader, primaryActionClass, surfaceClass } from '../../ui/page';
import { SettingsChrome } from './SettingsChrome';

export default function RatesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const [products, setProducts] = useState<FuelType[]>([]);
  const [rates, setRates] = useState<SellingRate[]>([]);
  const [fuelTypeId, setFuelTypeId] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const load = (productId?: string) =>
    Promise.all([listFuelTypes(), listRates(productId || undefined)])
      .then(([loadedProducts, loadedRates]) => {
        setProducts(loadedProducts);
        setRates(loadedRates);
        if (!productId && loadedProducts[0] && !fuelTypeId) setFuelTypeId(loadedProducts[0].id);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (fuelTypeId) void listRates(fuelTypeId).then(setRates).catch(() => undefined);
  }, [fuelTypeId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    setError('');
    setStatus('');
    try {
      await createRate({
        fuelTypeId,
        sellingPrice: Number(sellingPrice),
        ...(effectiveFrom ? { effectiveFrom: new Date(effectiveFrom).toISOString() } : {}),
      });
      setSellingPrice('');
      setEffectiveFrom('');
      setStatus('Selling rate posted. Current product price was updated.');
      await load(fuelTypeId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const selected = products.find((product) => product.id === fuelTypeId);

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
        {error && <Notice tone="error">{error}</Notice>}
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
            <p className="mt-1 text-xs text-orange-600">Per litre at the pump</p>
          </div>
        </div>

        <section className={surfaceClass}>
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Rate history</h2>
            <p className="mt-1 text-sm text-gray-500">Newest first. Earlier rates stay on file.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Effective from</th>
                  <th className="px-5 py-3">Selling price</th>
                  <th className="px-5 py-3">Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rates.map((rate) => (
                  <tr key={rate.id}>
                    <td className="px-5 py-4">{new Date(rate.effectiveFrom).toLocaleString()}</td>
                    <td className="px-5 py-4 font-medium">{String(rate.sellingPrice)}</td>
                    <td className="px-5 py-4 text-gray-500">
                      {new Date(rate.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {rates.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-gray-500" colSpan={3}>
                      No dated rates yet. Post the first selling price for this product.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
                  Selling price per litre <span className="text-orange-500">*</span>
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
                <Label htmlFor="rate-from">Effective from</Label>
                <Input
                  id="rate-from"
                  type="datetime-local"
                  placeholder="Select date and time"
                  value={effectiveFrom}
                  onChange={(event) => setEffectiveFrom(event.target.value)}
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className={primaryActionClass} disabled={!fuelTypeId}>
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
