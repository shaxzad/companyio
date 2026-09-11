import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@companyio/auth-react';
import { Input, Label, PageMeta, Select } from '@companyio/platform-ui';
import { useMeterSaleSheet, usePostMeterSales, useSelectedStation } from '../../hooks';
import type { MeterSaleRow } from '../../types';
import {
  emptyRecord,
  formatMoney,
  parseFinancialInput,
  requireFinancialInput,
  roundTo,
  toErrorMessage,
  toFinancialInput,
} from '../../utils';
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

const money = (value: number) =>
  formatMoney(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const litresOf = (closing: string, opening: number) => {
  if (closing === '') return 0;
  const parsed = parseFinancialInput(closing);
  if (parsed === null) return 0;
  return roundTo(parsed - opening, 3);
};

const rateForRow = (raw: string | undefined, suggestedRate: number) => {
  const entered = parseFinancialInput(raw ?? '');
  if (entered !== null) return entered;
  return suggestedRate > 0 ? suggestedRate : null;
};

export default function MeterSalesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));
  const { stations, stationId, setStationId, error: stationsError } = useSelectedStation();
  const {
    data: sheet = null,
    isLoading,
    error: sheetError,
    refetch,
  } = useMeterSaleSheet(stationId);
  const postMeterSales = usePostMeterSales();
  const [closings, setClosings] = useState<Record<string, string>>(emptyRecord);
  const [rates, setRates] = useState<Record<string, string>>(emptyRecord);
  const [reasons, setReasons] = useState<Record<string, string>>(emptyRecord);
  const [soldAt, setSoldAt] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!sheet) return;
    setClosings(
      Object.fromEntries(
        sheet.rows.map((row) => [
          row.nozzleId,
          row.closingReading === null
            ? ''
            : toFinancialInput(row.closingReading, { allowZero: true }),
        ])
      )
    );
    setRates(
      Object.fromEntries(
        sheet.rows.map((row) => [
          row.nozzleId,
          // Suggested/posted rate: hide bare 0 so staff must confirm a real selling rate.
          toFinancialInput(row.unitPrice, { allowZero: Boolean(sheet.alreadyPosted) }),
        ])
      )
    );
    setReasons(
      Object.fromEntries(sheet.rows.map((row) => [row.nozzleId, row.rateOverrideReason ?? '']))
    );
  }, [sheet]);

  const sheetErrorMessage = sheetError ? toErrorMessage(sheetError) : '';
  const needsOpening = sheetErrorMessage.toLowerCase().includes('open a business date');
  const displayError =
    error ||
    (stationsError ? toErrorMessage(stationsError) : '') ||
    (sheetErrorMessage && !needsOpening ? sheetErrorMessage : '');

  const groups = useMemo(() => {
    const rows = sheet?.rows ?? [];
    const map = new Map<string, MeterSaleRow[]>();
    rows.forEach((row) => {
      map.set(row.productCode, [...(map.get(row.productCode) ?? []), row]);
    });
    return [...map.entries()];
  }, [sheet]);

  const liveTotals = useMemo(() => {
    const byProduct = groups.map(([code, rows]) => {
      const lines = rows.map((row) => {
        const litres = litresOf(closings[row.nozzleId] ?? '', row.openingReading);
        const rate = rateForRow(rates[row.nozzleId], row.suggestedRate) ?? 0;
        return {
          litres,
          amount: roundTo(litres * rate, 2),
          productName: row.productName,
          productCode: code,
        };
      });
      return {
        productCode: code,
        productName: rows[0]?.productName ?? code,
        litres: roundTo(
          lines.reduce((sum, line) => sum + line.litres, 0),
          3
        ),
        amount: roundTo(
          lines.reduce((sum, line) => sum + line.amount, 0),
          2
        ),
      };
    });
    return {
      byProduct,
      litres: roundTo(
        byProduct.reduce((sum, item) => sum + item.litres, 0),
        3
      ),
      amount: roundTo(
        byProduct.reduce((sum, item) => sum + item.amount, 0),
        2
      ),
    };
  }, [groups, closings, rates]);

  const readOnly = Boolean(sheet?.alreadyPosted) || !canEdit;
  const allClosed =
    (sheet?.rows.length ?? 0) > 0 &&
    (sheet?.rows ?? []).every((row) => {
      const closing = parseFinancialInput(closings[row.nozzleId] ?? '');
      return closing !== null && closing >= row.openingReading;
    });
  const overrideOk = (sheet?.rows ?? []).every((row) => {
    const rate = rateForRow(rates[row.nozzleId], row.suggestedRate);
    if (rate === null) return false;
    if (rate.toFixed(2) === row.suggestedRate.toFixed(2)) return true;
    return Boolean(reasons[row.nozzleId]?.trim());
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sheet || !canEdit || sheet.alreadyPosted) return;
    setError('');
    setStatus('');
    try {
      const lines = sheet.rows.map((row) => {
        const closingMeter = requireFinancialInput(
          closings[row.nozzleId] ?? '',
          `Closing meter for ${row.pumpName} nozzle ${row.nozzleNumber}`
        );
        const rate = rateForRow(rates[row.nozzleId], row.suggestedRate);
        if (rate === null) {
          throw new Error(
            `Selling rate for ${row.pumpName} nozzle ${row.nozzleNumber} is required.`
          );
        }
        const overridden = rate.toFixed(2) !== row.suggestedRate.toFixed(2);
        return {
          nozzleId: row.nozzleId,
          closingMeter,
          unitPrice: rate,
          ...(overridden ? { rateOverrideReason: reasons[row.nozzleId]?.trim() } : {}),
        };
      });

      const saved = await postMeterSales.mutateAsync({
        stationId,
        businessDayId: sheet.businessDay.id,
        ...(soldAt ? { soldAt: new Date(soldAt).toISOString() } : {}),
        lines,
      });
      setStatus(
        `${saved.saleNumber} posted. Totals: ${saved.productTotals
          .map((item) => `Total Sale ${item.productCode} ${money(item.amount)}`)
          .join(' · ')}.`
      );
      void refetch();
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  };

  return (
    <>
      <PageMeta
        title="Fuel sales | Fuel Management"
        description="Enter closing meter readings. Litres and amount calculate automatically."
      />
      <PageShell>
        <PageHeader
          title="Fuel sales"
          description="One row per meter, grouped by product — the same sheet as the paper form. Litres = closing − opening. Amount = litres × rate."
          action={
            <LiveBadge
              label={
                sheet?.alreadyPosted
                  ? 'Sheet posted'
                  : sheet
                    ? 'Open day — enter closings'
                    : 'Select a station'
              }
            />
          }
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(liveTotals.byProduct.length
            ? liveTotals.byProduct
            : [{ productCode: '—', productName: 'Product total', litres: 0, amount: 0 }]
          ).map((item) => (
            <KpiCard
              key={item.productCode}
              label={`Total Sale ${item.productCode}`}
              value={money(item.amount)}
              detail={`${item.litres.toLocaleString()} L · ${item.productName}`}
              tone="text-emerald-600"
            />
          ))}
          <KpiCard
            label="All meters"
            value={money(liveTotals.amount)}
            detail={`${liveTotals.litres.toLocaleString()} L sold`}
            tone="text-orange-600"
          />
        </section>

        {displayError && <Notice tone="error">{displayError}</Notice>}
        {status && <Notice tone="success">{status}</Notice>}
        {needsOpening && (
          <Notice tone="warning">
            Open today’s business date first, then come back to enter meter closings.{' '}
            <Link to="/opening" className="font-semibold text-orange-700 underline">
              Daily opening
            </Link>
          </Notice>
        )}

        <form onSubmit={(event) => void submit(event)} className="space-y-6">
          <Surface>
            <SurfaceHeader
              title="Working day"
              description="Meter openings come from Daily opening. Sale date/time can differ from when this is typed."
            />
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <Label htmlFor="sales-station">Station</Label>
                <Select
                  id="sales-station"
                  options={stations.map((station) => ({
                    value: station.id,
                    label: `${station.name} (${station.code})`,
                  }))}
                  placeholder={stations.length ? 'Select a station' : 'No stations yet'}
                  value={stationId}
                  onChange={setStationId}
                />
              </div>
              <div>
                <Label htmlFor="sales-business-date">Business date</Label>
                <Input
                  id="sales-business-date"
                  value={sheet?.businessDay.businessDate ?? ''}
                  placeholder="Opens after Daily opening"
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="sales-sold-at">Sale date / time</Label>
                <Input
                  id="sales-sold-at"
                  type="datetime-local"
                  placeholder="Leave blank to use now"
                  value={soldAt}
                  onChange={(event) => setSoldAt(event.target.value)}
                  disabled={readOnly}
                />
              </div>
            </div>
            {isLoading && <p className="mt-4 text-sm text-gray-500">Loading meters...</p>}
            {sheet?.postedSale && (
              <p className="mt-4 text-sm text-gray-500">
                {sheet.postedSale.saleNumber} · sold {new Date(sheet.postedSale.soldAt).toLocaleString()} ·
                entered {new Date(sheet.postedSale.enteredAt).toLocaleString()}
              </p>
            )}
          </Surface>

          {groups.map(([code, rows]) => {
            const total = liveTotals.byProduct.find((item) => item.productCode === code);
            return (
              <section key={code} className={surfaceClass}>
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      {rows[0]?.productName} ({code})
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">Every meter selling this product</p>
                  </div>
                  <p className="text-sm font-semibold text-orange-600">
                    Total Sale {code} {money(total?.amount ?? 0)}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Meter</th>
                        <th className="px-4 py-3">Opening</th>
                        <th className="px-4 py-3">Closing</th>
                        <th className="px-4 py-3">Litres</th>
                        <th className="px-4 py-3">Rate</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Rate reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((row) => {
                        const closing = closings[row.nozzleId] ?? '';
                        const rate = Number(rates[row.nozzleId] || row.suggestedRate);
                        const litres = litresOf(closing, row.openingReading);
                        const amount = roundTo(litres * rate, 2);
                        const overridden = rate.toFixed(2) !== row.suggestedRate.toFixed(2);
                        return (
                          <tr key={row.nozzleId}>
                            <td className="px-4 py-3">
                              <p className="font-medium">
                                {row.pumpName} · Pump {row.pumpNumber}
                              </p>
                              <p className="text-xs text-gray-500">
                                Nozzle {row.nozzleNumber}
                                {row.tankName ? ` · ${row.tankName}` : ' · tank not linked'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{row.openingReading}</td>
                            <td className="min-w-36 px-4 py-3">
                              <Input
                                type="number"
                                placeholder="Enter closing"
                                value={closing}
                                onChange={(event) =>
                                  setClosings((current) => ({
                                    ...current,
                                    [row.nozzleId]: event.target.value,
                                  }))
                                }
                                disabled={readOnly}
                                required={!readOnly}
                              />
                            </td>
                            <td className="px-4 py-3 font-medium">{closing === '' ? '—' : litres}</td>
                            <td className="min-w-32 px-4 py-3">
                              <Input
                                type="number"
                                placeholder={String(row.suggestedRate)}
                                value={rates[row.nozzleId] ?? ''}
                                onChange={(event) =>
                                  setRates((current) => ({
                                    ...current,
                                    [row.nozzleId]: event.target.value,
                                  }))
                                }
                                disabled={readOnly}
                              />
                            </td>
                            <td className="px-4 py-3 font-semibold">
                              {closing === '' ? '—' : money(amount)}
                            </td>
                            <td className="min-w-48 px-4 py-3">
                              <Input
                                placeholder={
                                  overridden ? 'Why was the rate changed?' : 'Needed only if rate changes'
                                }
                                value={reasons[row.nozzleId] ?? ''}
                                onChange={(event) =>
                                  setReasons((current) => ({
                                    ...current,
                                    [row.nozzleId]: event.target.value,
                                  }))
                                }
                                disabled={readOnly || !overridden}
                                required={overridden && !readOnly}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}

          {sheet && sheet.rows.length === 0 && (
            <p className={`px-5 py-8 text-sm text-gray-500 ${surfaceClass}`}>
              This open day has no meters. Add nozzles in Settings, then open the day again.
            </p>
          )}

          {canEdit && sheet && !sheet.alreadyPosted && (
            <div className="flex justify-end">
              <button
                type="submit"
                className={primaryActionClass}
                disabled={!allClosed || !overrideOk || postMeterSales.isPending}
              >
                {postMeterSales.isPending ? 'Posting...' : 'Post meter sales'}
              </button>
            </div>
          )}
        </form>
      </PageShell>
    </>
  );
}
