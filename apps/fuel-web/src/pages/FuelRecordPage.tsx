import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  ComponentCard,
  Input,
  Label,
  PageMeta,
  Select,
} from '@companyio/platform-ui';
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

type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
};
type Props = {
  title: string;
  description: string;
  endpoint: string;
  fields: Field[];
  defaults?: Record<string, string>;
};

export default function FuelRecordPage({
  title,
  description,
  endpoint,
  fields,
  defaults = {},
}: Props) {
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
        if (loadedStations[0])
          void getStationAssets(loadedStations[0].id)
            .then(setAssets)
            .catch(() => undefined);
        setValues((current) => ({
          ...current,
          stationId: current.stationId ?? loadedStations[0]?.id ?? '',
          fuelTypeId: current.fuelTypeId ?? loadedFuelTypes[0]?.id ?? '',
          organizationId: current.organizationId ?? loadedOrganizations[0]?.id ?? '',
        }));
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, []);

  useEffect(() => {
    if (values.stationId)
      void getStationAssets(values.stationId)
        .then(setAssets)
        .catch(() => undefined);
  }, [values.stationId]);

  const selectedFuel = useMemo(
    () => fuelTypes.find((fuel) => fuel.id === values.fuelTypeId),
    [fuelTypes, values.fuelTypeId]
  );
  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === values.organizationId),
    [organizations, values.organizationId]
  );
  const visibleFields = fields.map((field) => {
    if (field.name === 'stationId' && stations.length)
      return {
        ...field,
        options: stations.map((station) => ({
          value: station.id,
          label: `${station.name} (${station.code})`,
        })),
      };
    if (field.name === 'fuelTypeId' && fuelTypes.length)
      return { ...field, options: fuelTypes.map((fuel) => ({ value: fuel.id, label: fuel.name })) };
    if (field.name === 'organizationId' && organizations.length)
      return {
        ...field,
        options: organizations.map((organization) => ({
          value: organization.id,
          label: organization.name,
        })),
      };
    if (field.name === 'vehicleId' && selectedOrganization)
      return {
        ...field,
        options: selectedOrganization.vehicles.map((vehicle) => ({
          value: vehicle.id,
          label: vehicle.registration,
        })),
      };
    if (field.name === 'tankId' && assets)
      return {
        ...field,
        options: assets.tanks
          .filter((tank) => !values.fuelTypeId || tank.fuelTypeId === values.fuelTypeId)
          .map((tank) => ({ value: tank.id, label: tank.name })),
      };
    return field;
  });

  const update = (name: string, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
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
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
            Fuel operations
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </header>
        <ComponentCard
          title={title}
          desc="Enter the transaction details. Calculations and inventory updates are handled by the API."
        >
          <form onSubmit={submit}>
            {error && <Alert variant="error" title="Could not save" message={error} />}
            {status && <Alert variant="success" title="Saved" message={status} />}
            <div className="grid gap-5 sm:grid-cols-2">
              {visibleFields.map((field) => (
                <div key={field.name}>
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-orange-500"> *</span>}
                  </Label>
                  {field.options ? (
                    <Select
                      options={field.options}
                      placeholder={`Select ${field.label.toLowerCase()}`}
                      value={values[field.name] ?? ''}
                      onChange={(value) => update(field.name, value)}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      name={field.name}
                      type={field.type ?? 'text'}
                      value={values[field.name] ?? ''}
                      onChange={(event) => update(field.name, event.target.value)}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-7 flex justify-end">
              <Button type="submit">Save {title}</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
