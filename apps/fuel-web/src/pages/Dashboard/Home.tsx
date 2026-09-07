import { useEffect, useState } from 'react';
import { PageMeta } from '@companyio/platform-ui';
import { getFuelDashboard, type FuelDashboard } from '../../api/fuelApi';

const formatMoney = (value: number) =>
  `PKR ${value.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

const activity = [
  {
    label: 'Fleet sale',
    reference: 'ABC Construction · GLT-1234',
    amount: 'PKR 42,000',
    time: '10:42 AM',
    tone: 'bg-orange-100 text-orange-700',
  },
  {
    label: 'Fuel received',
    reference: 'Northern Fuels · Tanker GB-09',
    amount: '+8,000 L',
    time: '09:15 AM',
    tone: 'bg-sky-100 text-sky-700',
  },
  {
    label: 'Payment received',
    reference: 'Mountain Contractors',
    amount: 'PKR 85,000',
    time: '08:30 AM',
    tone: 'bg-emerald-100 text-emerald-700',
  },
];

function QuickAction({
  label,
  description,
  href,
}: {
  label: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-orange-700 dark:hover:bg-orange-950/20"
    >
      <span className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
        {label}
        <span className="text-lg text-orange-500 transition-transform group-hover:translate-x-1">
          →
        </span>
      </span>
      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{description}</span>
    </a>
  );
}

export default function Home() {
  const [dashboard, setDashboard] = useState<FuelDashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getFuelDashboard()
      .then(setDashboard)
      .catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
  }, []);

  const kpis = dashboard
    ? [
        {
          label: "Today's sales",
          value: formatMoney(dashboard.today.sales),
          detail: 'Confirmed station sales',
          tone: 'text-emerald-600',
        },
        {
          label: 'Litres sold',
          value: `${dashboard.today.litres.toLocaleString()} L`,
          detail: 'Across all active nozzles',
          tone: 'text-sky-600',
        },
        {
          label: 'Fuel received',
          value: formatMoney(dashboard.today.receivedCost),
          detail: 'Confirmed receipts today',
          tone: 'text-orange-600',
        },
        {
          label: 'Credit outstanding',
          value: formatMoney(dashboard.today.creditOutstanding),
          detail: 'Organization balances',
          tone: 'text-rose-600',
        },
      ]
    : [];

  return (
    <>
      <PageMeta title="Fuel Management Dashboard" description="Station operations overview" />
      <div className="space-y-6 pb-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
              Gilgit Station
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              Good morning, manager
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Today · Shift is open</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Operations live
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <article
              key={kpi.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                {kpi.value}
              </p>
              <p className={`mt-2 text-xs font-medium ${kpi.tone}`}>{kpi.detail}</p>
            </article>
          ))}
          {!dashboard && !error && (
            <div className="col-span-full rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
              Loading station figures...
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <article className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Tank stock health</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Current stock against tank capacity
                </p>
              </div>
              <a
                href="/inventory"
                className="text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                View ledger
              </a>
            </div>
            <div className="mt-6 space-y-5">
              {(dashboard?.tanks ?? []).map((tank, index) => {
                const percent = tank.capacity
                  ? Math.min(100, (tank.currentStock / tank.capacity) * 100)
                  : 0;
                const colors = ['bg-orange-500', 'bg-sky-500', 'bg-amber-500'];
                return (
                  <div key={tank.id}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {tank.fuelType.name}{' '}
                        <span className="font-normal text-gray-400">· {tank.name}</span>
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {tank.currentStock.toLocaleString()} L
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-2 rounded-full ${colors[index % colors.length]}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs text-gray-400">
                      {Math.round(percent)}% capacity
                    </p>
                  </div>
                );
              })}
              {dashboard && dashboard.tanks.length === 0 && (
                <p className="text-sm text-gray-500">No tanks configured for this station yet.</p>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-gray-950 p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">
                  Shift control
                </p>
                <h2 className="mt-2 text-xl font-semibold">Morning shift</h2>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                Open
              </span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-white/10 py-4">
              <div>
                <p className="text-xs text-gray-400">Meter progress</p>
                <p className="mt-1 text-lg font-semibold">62%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Cash expected</p>
                <p className="mt-1 text-lg font-semibold">PKR 312K</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-gray-300">
              Complete closing after entering final meter readings, cash count, and stock
              reconciliation.
            </p>
            <a
              href="/sales"
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-400"
            >
              Continue shift
            </a>
          </article>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Quick actions</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Record what happened at the station
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickAction
              label="Record fuel sale"
              description="Meters, nozzles, litres, and cash/card sale"
              href="/sales"
            />
            <QuickAction
              label="Fleet / credit sale"
              description="Issue fuel to an organization vehicle"
              href="/fleet-sales"
            />
            <QuickAction
              label="Receive fuel"
              description="Add a tanker delivery to inventory"
              href="/receiving"
            />
            <QuickAction
              label="Customer payment"
              description="Post a payment against a balance"
              href="/organizations"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Recent activity</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Today at Gilgit Station
              </p>
            </div>
            <button className="text-xs font-semibold text-orange-600 hover:text-orange-700">
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activity.map((item) => (
              <div
                key={item.reference}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${item.tone}`}>
                    {item.label}
                  </span>
                  <span className="truncate text-sm text-gray-700 dark:text-gray-300">
                    {item.reference}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.amount}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
