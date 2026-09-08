import type { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export const pageEyebrowClass =
  'text-xs font-semibold uppercase tracking-[0.18em] text-orange-600';
export const pageTitleClass = 'mt-2 text-2xl font-semibold text-gray-900 dark:text-white';
export const pageSubClass = 'mt-1 text-sm text-gray-500 dark:text-gray-400';
export const surfaceClass =
  'rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900';
export const primaryActionClass =
  'inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryActionClass =
  'inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-orange-300 hover:bg-orange-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';

export function PageShell({ children }: PropsWithChildren) {
  return (
    <div className="-m-5 min-h-[calc(100vh-4rem)] space-y-6 bg-gray-50 p-5 pb-8 md:-m-8 md:min-h-[calc(100vh-5rem)] md:p-8 dark:bg-gray-950">
      {children}
    </div>
  );
}

export function LiveBadge({ label = 'Operations live' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
      <span className="h-2 w-2 rounded-full bg-emerald-500" /> {label}
    </div>
  );
}

export function PageHeader({
  eyebrow = 'Gilgit Station',
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className={pageEyebrowClass}>{eyebrow}</p>
        <h1 className={pageTitleClass}>{title}</h1>
        <p className={pageSubClass}>{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">{action ?? <LiveBadge />}</div>
    </header>
  );
}

export function Surface({
  children,
  className = '',
  padded = true,
}: PropsWithChildren<{ className?: string; padded?: boolean }>) {
  return (
    <section className={`${surfaceClass} ${padded ? 'p-5' : ''} ${className}`}>{children}</section>
  );
}

export function SurfaceHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  detail,
  tone = 'text-orange-600',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: string;
}) {
  return (
    <article className={`${surfaceClass} p-5`}>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
        {value}
      </p>
      <p className={`mt-2 text-xs font-medium ${tone}`}>{detail}</p>
    </article>
  );
}

export function QuickAction({
  label,
  description,
  href,
}: {
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-orange-700 dark:hover:bg-orange-950/20"
    >
      <span className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
        {label}
        <span className="text-lg text-orange-500 transition-transform group-hover:translate-x-1">
          →
        </span>
      </span>
      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{description}</span>
    </Link>
  );
}

export function Notice({
  tone,
  children,
}: PropsWithChildren<{ tone: 'error' | 'success' | 'warning' }>) {
  const styles = {
    error: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300',
    warning:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  };
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles[tone]}`}>{children}</div>;
}
