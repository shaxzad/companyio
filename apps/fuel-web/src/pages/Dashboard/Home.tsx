import {
  KpiCard,
  LiveBadge,
  Notice,
  PageHeader,
  PageMeta,
  PageShell,
  primaryActionClass,
  QuickAction,
  surfaceClass,
} from '@companyio/platform-ui';
import { useAuth } from '@companyio/auth-react';
import { useDashboard } from '../../hooks';
import { formatMoney, toErrorMessage } from '../../utils';
import { canAccessPath, ROLE_LABELS, roleOf } from '../../features/auth/roles';
const activity = [
  {
    label: 'Fleet sale',
    reference: 'ABC Construction · GLT-1234',
    amount: 'PKR 42,000',
    time: '10:42 AM',
    tone: 'bg-brand-100 text-brand-700',
  },
  {
    label: 'Fuel received',
    reference: 'Northern Fuels · Tanker GB-09',
    amount: '+8,000 L',
    time: '09:15 AM',
    tone: 'bg-brand-100 text-brand-700',
  },
  {
    label: 'Payment received',
    reference: 'Mountain Contractors',
    amount: 'PKR 85,000',
    time: '08:30 AM',
    tone: 'bg-success-100 text-success-700',
  },
];

export default function Home() {
  const { user } = useAuth();
  const role = roleOf(user);
  const { data: dashboard, error: dashboardError } = useDashboard();
  const error = dashboardError ? toErrorMessage(dashboardError) : '';

  const kpis = dashboard
    ? [
        {
          label: "Today's sales",
          value: formatMoney(dashboard.today.sales),
          detail: 'Confirmed station sales',
          tone: 'text-success-600',
        },
        {
          label: 'Litres sold',
          value: `${dashboard.today.litres.toLocaleString()} L`,
          detail: 'Across all active nozzles',
          tone: 'text-brand-600',
        },
        {
          label: 'Fuel received',
          value: formatMoney(dashboard.today.receivedCost),
          detail: 'Confirmed receipts today',
          tone: 'text-brand-600',
        },
        {
          label: 'Credit outstanding',
          value: formatMoney(dashboard.today.creditOutstanding),
          detail: 'Organization balances',
          tone: 'text-error-600',
        },
      ]
    : [];

  return (
    <>
      <PageMeta title="Fuel Management Dashboard" description="Station operations overview" />
      <PageShell>
        <PageHeader
          title={`Good morning${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
          description={`Signed in as ${role ? ROLE_LABELS[role] : 'user'} · Shift is open`}
          action={<LiveBadge />}
        />

        {error && <Notice tone="warning">{error}</Notice>}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
          {!dashboard && !error && (
            <div className={`col-span-full p-5 text-sm text-gray-500 ${surfaceClass}`}>
              Loading station figures...
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <article className={`${surfaceClass} p-5`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Tank stock health</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Current stock against tank capacity
                </p>
              </div>
              <a
                href="/inventory"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                View ledger
              </a>
            </div>
            <div className="mt-6 space-y-5">
              {(dashboard?.tanks ?? []).map((tank, index) => {
                const percent = tank.capacity
                  ? Math.min(100, (tank.currentStock / tank.capacity) * 100)
                  : 0;
                const colors = ['bg-brand-500', 'bg-brand-500', 'bg-amber-500'];
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

          <article className={`${surfaceClass} bg-gray-950 p-5 text-white dark:bg-gray-950`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">
                  Shift control
                </p>
                <h2 className="mt-2 text-xl font-semibold">Morning shift</h2>
              </div>
              <span className="rounded-full bg-success-500/15 px-2.5 py-1 text-xs font-medium text-success-300">
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
            <a href="/sales" className={`mt-5 w-full ${primaryActionClass}`}>
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
            {[
              {
                label: 'Open the day',
                description: 'Business date, opening meters, tank stock, and BBF Cash',
                href: '/opening',
              },
              {
                label: 'Record fuel sale',
                description: 'Closing meters, litres, and product totals',
                href: '/sales',
              },
              {
                label: 'Fleet / credit sale',
                description: 'Issue fuel to an organization vehicle',
                href: '/fleet-sales',
              },
              {
                label: 'Receive fuel',
                description: 'Tanker delivery, dips, Access, and tank stock',
                href: '/receiving',
              },
              {
                label: 'Customer payment',
                description: 'Post a payment against a balance',
                href: '/organizations',
              },
            ]
              .filter((action) => !role || canAccessPath(role, action.href))
              .map((action) => (
                <QuickAction key={action.href} {...action} />
              ))}
          </div>
        </section>

        <section className={surfaceClass}>
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Recent activity</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Today at Gilgit Station
              </p>
            </div>
            <button className="text-xs font-semibold text-brand-600 hover:text-brand-700">
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
      </PageShell>
    </>
  );
}
