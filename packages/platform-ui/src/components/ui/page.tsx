import type { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Shared page layout tokens (brand via app theme — fuel remaps brand-* to #fb6514). */
export const pageEyebrowClass =
  'text-xs font-semibold uppercase tracking-[0.18em] text-brand-600';
export const pageTitleClass = 'mt-2 text-2xl font-semibold text-gray-900 dark:text-white';
export const pageSubClass = 'mt-1 text-sm text-gray-500 dark:text-gray-400';
export const surfaceClass =
  'rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900';
export const primaryActionClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryActionClass =
  'inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';

/** Primary submit button copy: Add / Update + loading variants. */
export function submitActionLabel({
  pending,
  editing,
  addLabel = 'Add',
  updateLabel = 'Update',
  addingLabel = 'Adding…',
  updatingLabel = 'Updating…',
}: {
  pending: boolean;
  editing: boolean;
  addLabel?: string;
  updateLabel?: string;
  addingLabel?: string;
  updatingLabel?: string;
}) {
  if (pending) return editing ? updatingLabel : addingLabel;
  return editing ? updateLabel : addLabel;
}

export function ActionSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V2C5.373 2 2 5.373 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.042 1.135 5.824 3 7.938l1-1.647z"
      />
    </svg>
  );
}

export function PageShell({ children }: PropsWithChildren) {
  return (
    <div className="-m-5 min-h-[calc(100vh-4rem)] space-y-6 bg-gray-50 p-5 pb-8 md:-m-8 md:min-h-[calc(100vh-5rem)] md:p-8 dark:bg-gray-950">
      {children}
    </div>
  );
}

export function LiveBadge({ label = 'Operations live' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-success-200 bg-success-50 px-3 py-2 text-xs font-medium text-success-700 dark:border-success-800 dark:bg-success-500/10 dark:text-success-400">
      <span className="h-2 w-2 rounded-full bg-success-500" /> {label}
    </div>
  );
}

export function PageHeader({
  eyebrow = 'Operations',
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
  tone = 'text-brand-600',
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
      className="group rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/20"
    >
      <span className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
        {label}
        <span className="text-lg text-brand-500 transition-transform group-hover:translate-x-1">
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
    error:
      'border-error-200 bg-error-50 text-error-800 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300',
    success:
      'border-success-200 bg-success-50 text-success-800 dark:border-success-800 dark:bg-success-500/10 dark:text-success-300',
    warning:
      'border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-800 dark:bg-warning-500/10 dark:text-warning-300',
  };
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles[tone]}`}>{children}</div>;
}
