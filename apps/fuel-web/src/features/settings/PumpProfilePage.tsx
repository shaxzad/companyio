import { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import {
  Input,
  Label,
  Notice,
  PageMeta,
  primaryActionClass,
  Surface,
  SurfaceHeader,
} from '@companyio/platform-ui';
import { useStationMutations, useStations } from '../../hooks';
import { toErrorMessage } from '../../utils';
import { canEditPath, roleOf } from '../auth/roles';
import { SettingsChrome } from './SettingsChrome';

export default function PumpProfilePage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const { data: stations = [], error: stationsError, isLoading } = useStations();
  const { createStation, updateStation } = useStationMutations();
  const station = stations[0] ?? null;
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setName(station?.name ?? '');
    setCode(station?.code ?? '');
    setAddress(station?.address ?? '');
    setCity(station?.city ?? '');
    setLogoUrl(station?.logoUrl ?? '');
  }, [station]);

  const displayError = error || (stationsError ? toErrorMessage(stationsError) : '');
  const isSaving = createStation.isPending || updateStation.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    setError('');
    setStatus('');
    try {
      if (station) {
        await updateStation.mutateAsync({
          id: station.id,
          data: { name, address, city, logoUrl },
        });
        setStatus('Pump profile saved.');
      } else {
        await createStation.mutateAsync({ name, code, address, city });
        setStatus('Pump created.');
      }
    } catch (caught) {
      setError(toErrorMessage(caught));
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
            {displayError && (
              <div className="sm:col-span-2">
                <Notice tone="error">{displayError}</Notice>
              </div>
            )}
            {status && (
              <div className="sm:col-span-2">
                <Notice tone="success">{status}</Notice>
              </div>
            )}
            {isLoading && (
              <p className="sm:col-span-2 text-sm text-gray-500">Loading pump profile...</p>
            )}
            <div>
              <Label htmlFor="pump-name">
                Pump / station name <span className="text-brand-500">*</span>
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
                Station code <span className="text-brand-500">*</span>
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
