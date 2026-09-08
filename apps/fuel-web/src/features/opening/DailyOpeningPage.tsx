import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { Input, Label, PageMeta, Select } from '@companyio/platform-ui';
import { getStations, type Station } from '../../api/fuelApi';
import {
  openBusinessDay,
  previewOpening,
  type OpeningPreview,
} from '../../api/openingApi';
import { canEditPath, roleOf } from '../auth/roles';
import {
  KpiCard,
  LiveBadge,
  Notice,
  PageHeader,
  PageShell,
  Surface,
  SurfaceHeader,
  primaryActionClass,
  surfaceClass,
} from '../../ui/page';

const todayYmd = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());

const emptyMap = () => ({}) as Record<string, string>;

export default function DailyOpeningPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const isOwner = role === 'owner';
  const [stations, setStations] = useState<Station[]>([]);
  const [stationId, setStationId] = useState('');
  const [businessDate, setBusinessDate] = useState(todayYmd);
  const [preview, setPreview] = useState<OpeningPreview | null>(null);
  const [meters, setMeters] = useState<Record<string, string>>(emptyMap);
  const [tanks, setTanks] = useState<Record<string, string>>(emptyMap);
  const [bbfCash, setBbfCash] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getStations()
      .then((loaded) => {
        setStations(loaded);
        if (loaded.length === 1) setStationId(loaded[0].id);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, []);

  useEffect(() => {
    if (!stationId || !businessDate) {
      setPreview(null);
      return;
    }
    setIsLoading(true);
    setError('');
    previewOpening(stationId, businessDate)
      .then((loaded) => {
        setPreview(loaded);
        if (loaded.existing) {
          setBbfCash(String(loaded.existing.bbfCash));
          setMeters(
            Object.fromEntries(
              loaded.existing.meters.map((row) => [row.nozzleId, String(row.openingReading)])
            )
          );
          setTanks(
            Object.fromEntries(
              loaded.existing.tanks.map((row) => [row.tankId, String(row.openingStock)])
            )
          );
          return;
        }
        setBbfCash(loaded.previousDay ? String(loaded.bbfCashSuggested) : '');
        setOverrideReason('');
        setMeters(
          Object.fromEntries(
            loaded.meters.map((row) => [row.nozzleId, String(row.suggestedOpening)])
          )
        );
        setTanks(
          Object.fromEntries(loaded.tanks.map((row) => [row.tankId, String(row.suggestedOpening)]))
        );
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setIsLoading(false));
  }, [stationId, businessDate]);

  const metersByProduct = useMemo(() => {
    const rows = preview?.existing?.meters ?? preview?.meters ?? [];
    const groups = new Map<string, typeof rows>();
    rows.forEach((row) => {
      const key = row.productName;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    });
    return [...groups.entries()];
  }, [preview]);

  const alreadyOpened = Boolean(preview?.existing);
  const readOnly = alreadyOpened || !canEdit;
  const canSubmit =
    canEdit &&
    Boolean(preview?.canOpen) &&
    (!preview?.requiresOwnerOverride || (isOwner && overrideReason.trim().length >= 8));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!preview || !canSubmit) return;
    setError('');
    setStatus('');
    setIsSaving(true);
    try {
      await openBusinessDay({
        stationId,
        businessDate,
        bbfCash: Number(bbfCash || 0),
        ...(preview.requiresOwnerOverride ? { overrideReason: overrideReason.trim() } : {}),
        meters: preview.meters.map((row) => ({
          nozzleId: row.nozzleId,
          openingReading: Number(meters[row.nozzleId] || 0),
        })),
        tanks: preview.tanks.map((row) => ({
          tankId: row.tankId,
          openingStock: Number(tanks[row.tankId] || 0),
        })),
      });
      setStatus(`Business date ${businessDate} is open. BBF Cash is stored for closing later.`);
      const refreshed = await previewOpening(stationId, businessDate);
      setPreview(refreshed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsSaving(false);
    }
  };

  const sourceLabel =
    preview?.source === 'LAST_CLOSED_DAY'
      ? `Pulled from last closed day ${preview.previousDay?.businessDate}`
      : preview?.source === 'EXISTING_DAY'
        ? 'Already opened for this date'
        : 'Pulled from pump setup (no closed day yet)';

  return (
    <>
      <PageMeta
        title="Daily opening | Fuel Management"
        description="Open a business date and carry forward meters, tank stock, and BBF Cash"
      />
      <PageShell>
        <PageHeader
          title="Daily opening"
          description="Choose the working day (not the time you type this). Opening meters and tank stock come from the last closed day, then you confirm BBF Cash."
          action={
            <LiveBadge
              label={
                preview?.existing?.status === 'CLOSED'
                  ? 'Day closed'
                  : alreadyOpened
                    ? 'Day open'
                    : 'Ready to open'
              }
            />
          }
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Business date"
            value={businessDate || '--'}
            detail="Independent from system time"
            tone="text-sky-600"
          />
          <KpiCard
            label="Meters"
            value={String(preview?.meters.length ?? preview?.existing?.meters.length ?? '--')}
            detail={sourceLabel}
            tone="text-emerald-600"
          />
          <KpiCard
            label="BBF Cash"
            value={bbfCash === '' ? '--' : `PKR ${Number(bbfCash).toLocaleString('en-PK')}`}
            detail="Stored for the closing screen"
            tone="text-orange-600"
          />
        </section>

        {error && <Notice tone="error">{error}</Notice>}
        {status && <Notice tone="success">{status}</Notice>}
        {preview?.blockedReason && !alreadyOpened && (
          <Notice tone={preview.requiresOwnerOverride && isOwner ? 'warning' : 'error'}>
            {preview.blockedReason}
          </Notice>
        )}

        <form onSubmit={(event) => void submit(event)} className="space-y-6">
          <Surface>
            <SurfaceHeader
              title="Working day"
              description="Night or batch entry can use a date that is not today."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="opening-station">Station</Label>
                <Select
                  id="opening-station"
                  options={stations.map((station) => ({
                    value: station.id,
                    label: `${station.name} (${station.code})`,
                  }))}
                  placeholder={stations.length ? 'Select a station' : 'No stations yet — add one in Settings'}
                  value={stationId}
                  onChange={setStationId}
                  disabled={readOnly && alreadyOpened}
                />
              </div>
              <div>
                <Label htmlFor="opening-date">Business date</Label>
                <Input
                  id="opening-date"
                  type="date"
                  placeholder="Select a business date"
                  value={businessDate}
                  onChange={(event) => setBusinessDate(event.target.value)}
                  required
                  disabled={!canEdit}
                />
              </div>
            </div>
            {isLoading && <p className="mt-4 text-sm text-gray-500">Loading opening figures...</p>}
          </Surface>

          <Surface padded={false}>
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-white">Opening meter readings</h2>
              <p className="mt-1 text-sm text-gray-500">
                Auto-filled from yesterday’s closing. Edit only if a correction is needed.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Pump / nozzle</th>
                    <th className="px-5 py-3">Opening reading</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {metersByProduct.flatMap(([product, rows]) =>
                    rows.map((row) => (
                      <tr key={row.nozzleId}>
                        <td className="px-5 py-3 font-medium">{product}</td>
                        <td className="px-5 py-3 text-gray-600">
                          {row.pumpName} · Pump {row.pumpNumber} · Nozzle {row.nozzleNumber}
                        </td>
                        <td className="px-5 py-3">
                          <Input
                            type="number"
                            placeholder="e.g. 12450.300"
                            value={meters[row.nozzleId] ?? ''}
                            onChange={(event) =>
                              setMeters((current) => ({
                                ...current,
                                [row.nozzleId]: event.target.value,
                              }))
                            }
                            disabled={readOnly}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                  {metersByProduct.length === 0 && (
                    <tr>
                      <td className="px-5 py-8 text-gray-500" colSpan={3}>
                        No meters yet. Add pumps and nozzles in Settings → Tanks & meters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Surface>

          <Surface padded={false}>
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-white">Opening tank stock</h2>
              <p className="mt-1 text-sm text-gray-500">
                Auto-filled from yesterday’s closing stock for each tank.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Tank</th>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Opening stock (L)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(preview?.existing?.tanks ?? preview?.tanks ?? []).map((row) => (
                    <tr key={row.tankId}>
                      <td className="px-5 py-3 font-medium">{row.tankName}</td>
                      <td className="px-5 py-3 text-gray-600">{row.productName}</td>
                      <td className="px-5 py-3">
                        <Input
                          type="number"
                          placeholder="e.g. 12000"
                          value={tanks[row.tankId] ?? ''}
                          onChange={(event) =>
                            setTanks((current) => ({ ...current, [row.tankId]: event.target.value }))
                          }
                          disabled={readOnly}
                        />
                      </td>
                    </tr>
                  ))}
                  {(preview?.tanks.length ?? 0) === 0 && !preview?.existing && (
                    <tr>
                      <td className="px-5 py-8 text-gray-500" colSpan={3}>
                        No tanks yet. Add tanks in Settings → Tanks & meters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Surface>

          <Surface>
            <SurfaceHeader
              title="BBF Cash"
              description="Balance brought forward into this business date. Stored now and shown on the closing screen later. What it includes stays configurable until that cash question is answered."
            />
            <div className="max-w-sm">
              <Label htmlFor="bbf-cash">BBF Cash (PKR)</Label>
              <Input
                id="bbf-cash"
                type="number"
                placeholder="e.g. 85000"
                value={bbfCash}
                onChange={(event) => setBbfCash(event.target.value)}
                disabled={readOnly}
                required={!alreadyOpened && canEdit}
              />
            </div>
          </Surface>

          {preview?.requiresOwnerOverride && isOwner && !alreadyOpened && (
            <Surface>
              <SurfaceHeader
                title="Owner override"
                description="The previous day is still open. Opening this date requires a recorded reason."
              />
              <Label htmlFor="override-reason">Reason</Label>
              <Input
                id="override-reason"
                placeholder="Why this day is opening while the previous day is still open"
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                required
              />
            </Surface>
          )}

          {canEdit && !alreadyOpened && (
            <div className="flex justify-end">
              <button type="submit" className={primaryActionClass} disabled={!canSubmit || isSaving}>
                {isSaving ? 'Opening...' : 'Open business date'}
              </button>
            </div>
          )}
        </form>

        {alreadyOpened && preview?.existing && (
          <p className={`px-5 py-4 text-sm text-gray-500 ${surfaceClass}`}>
            Opened {new Date(preview.existing.openedAt).toLocaleString()} · System entry{' '}
            {new Date(preview.existing.enteredAt).toLocaleString()} · BBF Cash PKR{' '}
            {preview.existing.bbfCash.toLocaleString('en-PK')}
            {preview.existing.overrideReason
              ? ` · Override: ${preview.existing.overrideReason}`
              : ''}
          </p>
        )}
      </PageShell>
    </>
  );
}
