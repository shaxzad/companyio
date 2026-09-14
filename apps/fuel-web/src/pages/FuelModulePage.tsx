import { Link, useLocation } from 'react-router-dom';
import {
  KpiCard,
  LiveBadge,
  PageHeader,
  PageMeta,
  PageShell,
  primaryActionClass,
  QuickAction,
  Surface,
  SurfaceHeader,
} from '@companyio/platform-ui';
import { useAuth } from '@companyio/auth-react';
import { canEditPath, roleOf } from '../features/auth/roles';
type FuelModulePageProps = {
  title: string;
  description: string;
  actionLabel?: string;
};

export default function FuelModulePage({
  title,
  description,
  actionLabel = 'Add record',
}: FuelModulePageProps) {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleOf(user);
  const canEdit = Boolean(role && canEditPath(role, location.pathname));

  return (
    <>
      <PageMeta title={`${title} | Fuel Management`} description={description} />
      <PageShell>
        <PageHeader
          title={title}
          description={description}
          action={
            canEdit ? (
              <button type="button" className={primaryActionClass}>
                {actionLabel}
              </button>
            ) : (
              <LiveBadge label="View only" />
            )
          }
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Records today" value="--" detail="Confirmed for this shift" tone="text-success-600" />
          <KpiCard label="Pending review" value="--" detail="Waiting on approval" tone="text-brand-600" />
          <KpiCard label="This month" value="--" detail="Station total" tone="text-brand-600" />
        </section>

        <Surface>
          <SurfaceHeader
            title={`${title} workspace`}
            description="This page is connected to the fuel application structure and ready for its API-backed workflow."
            action={
              <Link to="/" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                Back to overview
              </Link>
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {['Open items', 'Last updated', 'Owner'].map((label) => (
              <div key={label} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">--</p>
              </div>
            ))}
          </div>
        </Surface>

        <section>
          <div className="mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">Quick actions</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Jump to a related station workflow
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <QuickAction
              label="Record fuel sale"
              description="Meters, nozzles, litres, and cash/card sale"
              href="/sales"
            />
            <QuickAction
              label="Receive fuel"
              description="Add a tanker delivery to inventory"
              href="/fuel-purchases"
            />
            <QuickAction
              label="Dashboard"
              description="Return to the station overview"
              href="/"
            />
          </div>
        </section>
      </PageShell>
    </>
  );
}
