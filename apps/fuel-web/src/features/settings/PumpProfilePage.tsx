import { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { Input, Label, PageMeta } from '@companyio/platform-ui';
import { createStation, listStations, updateStation, type Station } from '../../api/masterApi';
import { canEditPath, roleOf } from '../auth/roles';
import { Notice, Surface, SurfaceHeader, primaryActionClass } from '../../ui/page';
import { SettingsChrome } from './SettingsChrome';

export default function PumpProfilePage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const [station, setStation] = useState<Station | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = () =>
    listStations()
      .then((stations) => {
        const current = stations[0] ?? null;
        setStation(current);
        setName(current?.name ?? '');
        setCode(current?.code ?? '');
        setAddress(current?.address ?? '');
        setCity(current?.city ?? '');
        setLogoUrl(current?.logoUrl ?? '');
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    setError('');
    setStatus('');
    setIsSaving(true);
    try {
      if (station) {
        await updateStation(station.id, { name, address, city, logoUrl });
        setStatus('Pump profile saved.');
      } else {
        await createStation({ name, code, address, city });
        setStatus('Pump created.');
      }
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
        title="Pump profile | Fuel Management"
        description="Station name, address, and logo URL for invoices"
      />
      <SettingsChrome
        title="Pump profile"
        description="Name, address, and logo URL used on invoices. Logo is a URL, not a file upload."
        canEdit={canEdit}
      >
        <Surface>
          <SurfaceHeader
            title={station ? 'Edit station' : 'Create the first station'}
            description="This is the pump later features attach tanks, meters, sales, and closings to."
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
              <Label htmlFor="pump-name">
                Pump / station name <span className="text-orange-500">*</span>
              </Label>
              <Input
                id="pump-name"
                placeholder="e.g. Gilgit Station"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="pump-code">
                Station code <span className="text-orange-500">*</span>
              </Label>
              <Input
                id="pump-code"
                placeholder="e.g. GLT-01"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required={!station}
                disabled={!canEdit || Boolean(station)}
              />
            </div>
            <div>
              <Label htmlFor="pump-city">City</Label>
              <Input
                id="pump-city"
                placeholder="e.g. Gilgit"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="pump-address">Address</Label>
              <Input
                id="pump-address"
                placeholder="e.g. Airport Road, Gilgit"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="pump-logo">Logo URL (invoices)</Label>
              <Input
                id="pump-logo"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                disabled={!canEdit || !station}
              />
            </div>
            {canEdit ? (
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className={primaryActionClass} disabled={isSaving}>
                  {isSaving ? 'Saving...' : station ? 'Save pump profile' : 'Create station'}
                </button>
              </div>
            ) : (
              <p className="sm:col-span-2 text-sm text-gray-500">View only for your role.</p>
            )}
          </form>
        </Surface>
      </SettingsChrome>
    </>
  );
}
