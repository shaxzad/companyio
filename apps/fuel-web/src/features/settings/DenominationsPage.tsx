import { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { Badge, Input, Label, PageMeta } from '@companyio/platform-ui';
import {
  createDenomination,
  listDenominations,
  loadDefaultDenominations,
  updateDenomination,
  type CashDenomination,
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

export default function DenominationsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const [rows, setRows] = useState<CashDenomination[]>([]);
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const load = () =>
    listDenominations()
      .then(setRows)
      .catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    setError('');
    setStatus('');
    try {
      await createDenomination({
        value: Number(value),
        ...(label ? { label } : {}),
      });
      setValue('');
      setLabel('');
      setStatus('Denomination added.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  return (
    <>
      <PageMeta
        title="Denominations | Fuel Management"
        description="Configurable cash note values for closing"
      />
      <SettingsChrome
        title="Denominations"
        description="Editable cash note list used later at closing. PKR defaults are a starting point, not hard-coded forever."
        canEdit={canEdit}
      >
        {error && <Notice tone="error">{error}</Notice>}
        {status && <Notice tone="success">{status}</Notice>}

        <section className={surfaceClass}>
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Cash notes</h2>
              <p className="mt-1 text-sm text-gray-500">
                Typical PKR set is 5000, 1000, 500, 100, 50, 20, 10.
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                className={secondaryActionClass}
                onClick={() =>
                  void loadDefaultDenominations()
                    .then(() => {
                      setStatus('Loaded PKR defaults.');
                      return load();
                    })
                    .catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)))
                }
              >
                Load PKR defaults
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Value</th>
                  <th className="px-5 py-3">Label</th>
                  <th className="px-5 py-3">Status</th>
                  {canEdit && <th className="px-5 py-3 text-end">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-4 font-medium">{row.value.toLocaleString()}</td>
                    <td className="px-5 py-4">{row.label ?? `Rs ${row.value}`}</td>
                    <td className="px-5 py-4">
                      <Badge variant={row.active ? 'success' : 'error'}>
                        {row.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    {canEdit && (
                      <td className="px-5 py-4 text-end">
                        <button
                          type="button"
                          className={`${secondaryActionClass} !px-3 !py-1.5 text-xs`}
                          onClick={() =>
                            void updateDenomination(row.id, { active: !row.active }).then(load)
                          }
                        >
                          {row.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-gray-500" colSpan={4}>
                      No denominations yet. Load PKR defaults or add a note value.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {canEdit && (
          <Surface>
            <SurfaceHeader title="Add denomination" description="Use the note face value in PKR." />
            <form onSubmit={(event) => void submit(event)} className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="denom-value">
                  Value <span className="text-orange-500">*</span>
                </Label>
                <Input
                  id="denom-value"
                  type="number"
                  placeholder="e.g. 5000"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="denom-label">Label</Label>
                <Input
                  id="denom-label"
                  placeholder="e.g. Rs 5000"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className={primaryActionClass}>
                  Add denomination
                </button>
              </div>
            </form>
          </Surface>
        )}
      </SettingsChrome>
    </>
  );
}
