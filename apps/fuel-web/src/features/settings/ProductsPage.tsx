import { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { Badge, Input, Label, PageMeta } from '@companyio/platform-ui';
import {
  createProduct,
  listFuelTypes,
  updateProduct,
  type FuelType,
} from '../../api/masterApi';
import { canEditPath, roleOf } from '../auth/roles';
import {
  Notice,
  Surface,
  SurfaceHeader,
  primaryActionClass,
  secondaryActionClass,
  surfaceClass,
} from '../../ui/page';
import { SettingsChrome } from './SettingsChrome';

const emptyForm = () => ({
  name: '',
  code: '',
  sellingPrice: '',
  purchasePrice: '',
  minimumStock: '',
  reorderLevel: '',
});

export default function ProductsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const [products, setProducts] = useState<FuelType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = () =>
    listFuelTypes(true)
      .then(setProducts)
      .catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));

  useEffect(() => {
    void load();
  }, []);

  const update = (field: keyof ReturnType<typeof emptyForm>, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const startEdit = (product: FuelType) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      code: product.code,
      sellingPrice: String(product.sellingPrice ?? ''),
      purchasePrice: String(product.purchasePrice ?? ''),
      minimumStock: String(product.minimumStock ?? '0'),
      reorderLevel: String(product.reorderLevel ?? '0'),
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    setError('');
    setStatus('');
    setIsSaving(true);
    const payload = {
      name: form.name,
      code: form.code,
      sellingPrice: Number(form.sellingPrice),
      purchasePrice: Number(form.purchasePrice),
      minimumStock: Number(form.minimumStock || 0),
      reorderLevel: Number(form.reorderLevel || 0),
    };
    try {
      if (editingId) await updateProduct(editingId, payload);
      else await createProduct(payload);
      setStatus(editingId ? 'Product updated.' : 'Product added.');
      setEditingId(null);
      setForm(emptyForm());
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Products | Fuel Management"
        description="Petrol, diesel, and other fuels sold at the pump"
      />
      <SettingsChrome
        title="Products"
        description="Add Petrol/PMG, Diesel/HSD, or any later fuel. Each product can have tanks, meters, and selling rates."
        canEdit={canEdit}
      >
        <section className={surfaceClass}>
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Fuel products</h2>
              <p className="mt-1 text-sm text-gray-500">Active products appear on sales and receiving.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Selling</th>
                  <th className="px-5 py-3">Purchase</th>
                  <th className="px-5 py-3">Status</th>
                  {canEdit && <th className="px-5 py-3 text-end">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {products.map((product) => (
                  <tr key={product.id} className="text-gray-800 dark:text-gray-200">
                    <td className="px-5 py-4 font-medium">{product.name}</td>
                    <td className="px-5 py-4">{product.code}</td>
                    <td className="px-5 py-4">{String(product.sellingPrice)}</td>
                    <td className="px-5 py-4">{String(product.purchasePrice)}</td>
                    <td className="px-5 py-4">
                      <Badge variant={product.active === false ? 'error' : 'success'}>
                        {product.active === false ? 'Inactive' : 'Active'}
                      </Badge>
                    </td>
                    {canEdit && (
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className={`${secondaryActionClass} !px-3 !py-1.5 text-xs`}
                            onClick={() => startEdit(product)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`${secondaryActionClass} !px-3 !py-1.5 text-xs`}
                            onClick={() =>
                              void updateProduct(product.id, { active: product.active === false }).then(
                                load
                              )
                            }
                          >
                            {product.active === false ? 'Activate' : 'Deactivate'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-gray-500" colSpan={6}>
                      No products yet. Add Petrol (PMG) and Diesel (HSD) to start.
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
              title={editingId ? 'Edit product' : 'Add product'}
              description="Selling rate here is the current pump price. Dated history is on Selling rates."
              action={
                editingId ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-orange-600"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyForm());
                    }}
                  >
                    Cancel edit
                  </button>
                ) : null
              }
            />
            <form onSubmit={(event) => void submit(event)} className="grid gap-5 sm:grid-cols-2">
              {error && (
                <div className="sm:col-span-2">
                  <Notice tone="error">{error}</Notice>
                </div>
              )}
              {status && (
                <div className="sm:col-span-2">
                  <Notice tone="success">{status}</Notice>
                </div>
              )}
              <div>
                <Label htmlFor="product-name">
                  Product name <span className="text-orange-500">*</span>
                </Label>
                <Input
                  id="product-name"
                  placeholder="e.g. Petrol (PMG)"
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="product-code">
                  Code <span className="text-orange-500">*</span>
                </Label>
                <Input
                  id="product-code"
                  placeholder="e.g. PMG"
                  value={form.code}
                  onChange={(event) => update('code', event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="selling-price">
                  Selling price per litre <span className="text-orange-500">*</span>
                </Label>
                <Input
                  id="selling-price"
                  type="number"
                  placeholder="e.g. 272.50"
                  value={form.sellingPrice}
                  onChange={(event) => update('sellingPrice', event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="purchase-price">
                  Purchase price per litre <span className="text-orange-500">*</span>
                </Label>
                <Input
                  id="purchase-price"
                  type="number"
                  placeholder="e.g. 265.00"
                  value={form.purchasePrice}
                  onChange={(event) => update('purchasePrice', event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="minimum-stock">Minimum stock (litres)</Label>
                <Input
                  id="minimum-stock"
                  type="number"
                  placeholder="e.g. 2000"
                  value={form.minimumStock}
                  onChange={(event) => update('minimumStock', event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="reorder-level">Reorder level (litres)</Label>
                <Input
                  id="reorder-level"
                  type="number"
                  placeholder="e.g. 5000"
                  value={form.reorderLevel}
                  onChange={(event) => update('reorderLevel', event.target.value)}
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className={primaryActionClass} disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingId ? 'Save product' : 'Add product'}
                </button>
              </div>
            </form>
          </Surface>
        )}
      </SettingsChrome>
    </>
  );
}
