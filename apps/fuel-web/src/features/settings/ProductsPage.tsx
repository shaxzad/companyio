import { FormEvent, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import {
  ActionSpinner,
  Badge,
  DataTable,
  type DataTableColumn,
  Input,
  Label,
  Modal,
  Notice,
  PageMeta,
  primaryActionClass,
  secondaryActionClass,
  submitActionLabel,
  surfaceClass,
  toast,
} from '@companyio/platform-ui';
import { useFuelTypes, useProductMutations } from '../../hooks';
import type { FuelType } from '../../types';
import { parseFinancialInput, requireFinancialInput, toErrorMessage, toFinancialInput } from '../../utils';
import { canEditPath, roleOf } from '../auth/roles';
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
  const { data: products = [], error: productsError } = useFuelTypes(true);
  const { createProduct, updateProduct } = useProductMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const listError = productsError ? toErrorMessage(productsError) : '';
  const isSaving = createProduct.isPending || updateProduct.isPending;
  const editing = Boolean(editingId);

  const update = (field: keyof ReturnType<typeof emptyForm>, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const closeModal = () => {
    if (isSaving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
    setModalOpen(true);
  };

  const startEdit = (product: FuelType) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      code: product.code,
      sellingPrice: toFinancialInput(product.sellingPrice),
      purchasePrice: toFinancialInput(product.purchasePrice),
      minimumStock: toFinancialInput(product.minimumStock),
      reorderLevel: toFinancialInput(product.reorderLevel),
    });
    setFormError('');
    setModalOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    setFormError('');
    try {
      const payload = {
        name: form.name,
        code: form.code,
        sellingPrice: requireFinancialInput(form.sellingPrice, 'Selling price'),
        purchasePrice: requireFinancialInput(form.purchasePrice, 'Purchase price'),
        minimumStock: parseFinancialInput(form.minimumStock) ?? 0,
        reorderLevel: parseFinancialInput(form.reorderLevel) ?? 0,
      };
      if (editingId) await updateProduct.mutateAsync({ id: editingId, data: payload });
      else await createProduct.mutateAsync(payload);
      toast.success(editingId ? 'Product updated.' : 'Product added.');
      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      setFormError('');
    } catch (caught) {
      setFormError(toErrorMessage(caught));
    }
  };

  const toggleActive = async (product: FuelType) => {
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        data: { active: product.active === false },
      });
      toast.success(product.active === false ? 'Product activated.' : 'Product deactivated.');
    } catch (caught) {
      toast.error(toErrorMessage(caught));
    }
  };

  const productColumns = useMemo<DataTableColumn<FuelType>[]>(() => {
    const columns: DataTableColumn<FuelType>[] = [
      {
        id: 'name',
        header: 'Name',
        className: 'font-medium text-gray-800 dark:text-gray-200',
        cell: (product) => product.name,
      },
      {
        id: 'code',
        header: 'Code',
        className: 'text-gray-800 dark:text-gray-200',
        cell: (product) => product.code,
      },
      {
        id: 'selling',
        header: 'Selling',
        className: 'text-gray-800 dark:text-gray-200',
        cell: (product) => String(product.sellingPrice),
      },
      {
        id: 'purchase',
        header: 'Purchase',
        className: 'text-gray-800 dark:text-gray-200',
        cell: (product) => String(product.purchasePrice),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (product) => (
          <Badge variant={product.active === false ? 'error' : 'success'}>
            {product.active === false ? 'Inactive' : 'Active'}
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
        cell: (product) => (
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
              onClick={() => void toggleActive(product)}
            >
              {product.active === false ? 'Activate' : 'Deactivate'}
            </button>
          </div>
        ),
      });
    }

    return columns;
  }, [canEdit]);

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
        {listError ? <Notice tone="error">{listError}</Notice> : null}

        <section className={surfaceClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Fuel products</h2>
              <p className="mt-1 text-sm text-gray-500">Active products appear on sales and receiving.</p>
            </div>
            {canEdit ? (
              <button type="button" className={primaryActionClass} onClick={startCreate}>
                Add product
              </button>
            ) : null}
          </div>
          <DataTable
            columns={productColumns}
            rows={products}
            getRowKey={(product) => product.id}
            emptyMessage="No products yet. Add Petrol (PMG) and Diesel (HSD) to start."
          />
        </section>
      </SettingsChrome>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        className="mx-4 w-full max-w-xl p-6 sm:p-8"
        showCloseButton={!isSaving}
      >
        <h2 className="pr-10 text-lg font-semibold text-gray-900 dark:text-white">
          {editing ? 'Edit product' : 'Add product'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Selling rate here is the current pump price. Dated history is on Selling rates.
        </p>
        <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
          {formError ? (
            <div className="sm:col-span-2">
              <Notice tone="error">{formError}</Notice>
            </div>
          ) : null}
          <div>
            <Label htmlFor="product-name">
              Product name <span className="text-brand-500">*</span>
            </Label>
            <Input
              id="product-name"
              placeholder="e.g. Petrol (PMG)"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              required
              disabled={isSaving}
            />
          </div>
          <div>
            <Label htmlFor="product-code">
              Code <span className="text-brand-500">*</span>
            </Label>
            <Input
              id="product-code"
              placeholder="e.g. PMG"
              value={form.code}
              onChange={(event) => update('code', event.target.value)}
              required
              disabled={isSaving}
            />
          </div>
          <div>
            <Label htmlFor="selling-price">
              Selling price per litre <span className="text-brand-500">*</span>
            </Label>
            <Input
              id="selling-price"
              type="number"
              placeholder="e.g. 272.50"
              value={form.sellingPrice}
              onChange={(event) => update('sellingPrice', event.target.value)}
              required
              disabled={isSaving}
            />
          </div>
          <div>
            <Label htmlFor="purchase-price">
              Purchase price per litre <span className="text-brand-500">*</span>
            </Label>
            <Input
              id="purchase-price"
              type="number"
              placeholder="e.g. 265.00"
              value={form.purchasePrice}
              onChange={(event) => update('purchasePrice', event.target.value)}
              required
              disabled={isSaving}
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
              disabled={isSaving}
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
              disabled={isSaving}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className={secondaryActionClass} onClick={closeModal} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className={primaryActionClass} disabled={isSaving}>
              {isSaving ? <ActionSpinner /> : null}
              {submitActionLabel({
                pending: isSaving,
                editing,
                addLabel: 'Add product',
                updateLabel: 'Update product',
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
