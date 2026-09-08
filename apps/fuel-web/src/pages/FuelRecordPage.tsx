import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { Input, Label, PageMeta, Select } from '@companyio/platform-ui';
import {
  createFuelRecord,
  getFuelTypes,
  getOrganizations,
  getStations,
  getStationAssets,
  type FuelType,
  type Organization,
  type Station,
  type StationAssets,
} from '../api/fuelApi';
import { canEditPath, roleOf } from '../features/auth/roles';
import {
  KpiCard,
  LiveBadge,
  Notice,
  PageHeader,
  PageShell,
  Surface,
  SurfaceHeader,
  primaryActionClass,
} from '../ui/page';

type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
};
type Props = {
  title: string;
  description: string;
  endpoint: string;
  fields: Field[];
  defaults?: Record<string, string>;
};

const LOOKUP_FIELDS = new Set(['stationId', 'fuelTypeId', 'tankId', 'organizationId', 'vehicleId']);

export default function FuelRecordPage({
  title,
  description,
  endpoint,
  fields,
  defaults = {},
}: Props) {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [stations, setStations] = useState<Station[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [assets, setAssets] = useState<StationAssets | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getStations(), getFuelTypes(), getOrganizations()])
      .then(([loadedStations, loadedFuelTypes, loadedOrganizations]) => {
        setStations(loadedStations);
        setFuelTypes(loadedFuelTypes);
        setOrganizations(loadedOrganizations);
        if (loadedStations.length === 1)
          setValues((current) =>
            current.stationId ? current : { ...current, stationId: loadedStations[0].id }
          );
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, []);

  useEffect(() => {
    if (!values.stationId) {
      setAssets(null);
      return;
    }
    void getStationAssets(values.stationId)
      .then(setAssets)
      .catch(() => setAssets(null));
  }, [values.stationId]);

  const selectedFuel = useMemo(
    () => fuelTypes.find((fuel) => fuel.id === values.fuelTypeId),
    [fuelTypes, values.fuelTypeId]
  );
  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === values.organizationId),
    [organizations, values.organizationId]
  );
  const matchingTanks = useMemo(
    () =>
      (assets?.tanks ?? []).filter(
        (tank) => !values.fuelTypeId || tank.fuelTypeId === values.fuelTypeId
      ),
    [assets, values.fuelTypeId]
  );
  const matchingVehicles = useMemo(
    () => selectedOrganization?.vehicles ?? [],
    [selectedOrganization]
  );

  useEffect(() => {
    if (!values.fuelTypeId) return;
    setValues((current) => {
      const stillValid = matchingTanks.some((tank) => tank.id === current.tankId);
      if (stillValid) return current;
      if (matchingTanks.length === 1) return { ...current, tankId: matchingTanks[0].id };
      if (!current.tankId) return current;
      return { ...current, tankId: '' };
    });
  }, [values.fuelTypeId, matchingTanks]);

  useEffect(() => {
    setValues((current) => {
      if (!current.organizationId)
        return current.vehicleId ? { ...current, vehicleId: '' } : current;
      const stillValid = matchingVehicles.some((vehicle) => vehicle.id === current.vehicleId);
      if (stillValid) return current;
      if (matchingVehicles.length === 1) return { ...current, vehicleId: matchingVehicles[0].id };
      if (!current.vehicleId) return current;
      return { ...current, vehicleId: '' };
    });
  }, [values.organizationId, matchingVehicles]);

  const visibleFields = fields.map((field) => {
    if (field.name === 'stationId')
      return {
        ...field,
        options: stations.map((station) => ({
          value: station.id,
          label: `${station.name} (${station.code})`,
        })),
        placeholder: stations.length ? 'Select station' : 'No stations yet — add one in Settings',
      };
    if (field.name === 'fuelTypeId')
      return {
        ...field,
        options: fuelTypes.map((fuel) => ({ value: fuel.id, label: fuel.name })),
        placeholder: fuelTypes.length ? 'Select fuel type' : 'No products yet — add one in Settings',
      };
    if (field.name === 'organizationId')
      return {
        ...field,
        options: organizations.map((organization) => ({
          value: organization.id,
          label: organization.name,
        })),
        placeholder: organizations.length
          ? 'Select organization'
          : 'No organizations yet',
      };
    if (field.name === 'vehicleId')
      return {
        ...field,
        options: matchingVehicles.map((vehicle) => ({
          value: vehicle.id,
          label: vehicle.registration,
        })),
        disabled: !values.organizationId,
        placeholder: !values.organizationId
          ? 'Select an organization first'
          : matchingVehicles.length
            ? 'Select vehicle'
            : 'No vehicles for this organization',
      };
    if (field.name === 'tankId')
      return {
        ...field,
        options: matchingTanks.map((tank) => ({ value: tank.id, label: tank.name })),
        disabled: !values.stationId || !values.fuelTypeId,
        placeholder: !values.stationId
          ? 'Select a station first'
          : !values.fuelTypeId
            ? 'Select a fuel type first'
            : matchingTanks.length
              ? 'Select tank'
              : 'No tanks for this fuel — add one in Settings',
      };
    return field;
  });

  const update = (name: string, value: string) =>
    setValues((current) => {
      const next = { ...current, [name]: value };
      if (name === 'stationId' || name === 'fuelTypeId') next.tankId = '';
      if (name === 'organizationId') next.vehicleId = '';
      return next;
    });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    setStatus('');
    setError('');
    try {
      const payload: Record<string, unknown> = {};
      visibleFields.forEach((field) => {
        const value = values[field.name];
        if (value !== undefined && value !== '')
          payload[field.name] = field.type === 'number' ? Number(value) : value;
      });
      if (title === 'Daily sales' && !payload.unitPrice && selectedFuel)
        payload.unitPrice = Number(selectedFuel.sellingPrice);
      const resolvedEndpoint = endpoint.replace(
        '${organizationId}',
        String(payload.organizationId ?? '')
      );
      await createFuelRecord(resolvedEndpoint, payload);
      setStatus(`${title} saved successfully.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  return (
    <>
      <PageMeta title={`${title} | Fuel Management`} description={description} />
      <PageShell>
        <PageHeader
          title={title}
          description={description}
          action={<LiveBadge label={canEdit ? 'Ready to record' : 'View only'} />}
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Station" value={stations[0]?.name ?? '--'} detail="Active pump" tone="text-emerald-600" />
          <KpiCard
            label="Fuel types"
            value={String(fuelTypes.length || '--')}
            detail="Available products"
            tone="text-sky-600"
          />
          <KpiCard
            label="Organizations"
            value={String(organizations.length || '--')}
            detail="Credit accounts on file"
            tone="text-orange-600"
          />
        </section>

        <Surface>
          <SurfaceHeader
            title={`${title} entry`}
            description={
              canEdit
                ? 'Enter the transaction details. Calculations and inventory updates are handled by the API.'
                : 'You can view this screen. Saving is limited to roles that can edit this record.'
            }
          />
          <form onSubmit={submit}>
            {error && (
              <div className="mb-5">
                <Notice tone="error">{error}</Notice>
              </div>
            )}
            {status && (
              <div className="mb-5">
                <Notice tone="success">{status}</Notice>
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              {visibleFields.map((field) => (
                <div key={field.name}>
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-orange-500"> *</span>}
                  </Label>
                  {field.options || LOOKUP_FIELDS.has(field.name) ? (
                    <Select
                      id={field.name}
                      options={field.options ?? []}
                      placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`}
                      value={values[field.name] ?? ''}
                      onChange={(value) => update(field.name, value)}
                      disabled={!canEdit || field.disabled}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      name={field.name}
                      type={field.type ?? 'text'}
                      placeholder={
                        field.type === 'number'
                          ? `Enter ${field.label.toLowerCase()}`
                          : `Enter ${field.label.toLowerCase()}`
                      }
                      value={values[field.name] ?? ''}
                      onChange={(event) => update(field.name, event.target.value)}
                      required={field.required}
                      disabled={!canEdit}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-7 flex justify-end">
              {canEdit ? (
                <button type="submit" className={primaryActionClass}>
                  Save {title}
                </button>
              ) : (
                <p className="text-sm text-gray-500">View only for your role.</p>
              )}
            </div>
          </form>
        </Surface>
      </PageShell>
    </>
  );
}
