import { Modal } from './modal/index';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions use error styling on the confirm button. */
  tone?: 'danger' | 'default';
  pending?: boolean;
  pendingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V2C5.373 2 2 5.373 2 12h2zm2 5.291A7.962 7.962 0 014 12H2c0 3.042 1.135 5.824 3 7.938l1-1.647z"
      />
    </svg>
  );
}

/**
 * Shared confirm popup — use instead of `window.confirm`.
 * Pair with app toasts for success/error after the dialog closes.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  pending = false,
  pendingLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = tone === 'danger';
  const busyLabel = pendingLabel ?? (isDanger ? 'Deleting…' : 'Please wait…');

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (!pending) onCancel();
      }}
      showCloseButton={!pending}
      overlayClassName="fixed inset-0 h-full w-full bg-black/20 backdrop-blur-[1px]"
      className="mx-4 max-w-[26rem] overflow-hidden rounded-2xl border border-gray-200/80 shadow-[0_24px_64px_-16px_rgba(15,23,42,0.28)] dark:border-gray-700"
    >
      <div className="px-6 pb-6 pt-7 sm:px-7">
        <div className="flex gap-4 pr-6">
          <div
            className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              isDanger
                ? 'bg-error-50 text-error-600 ring-1 ring-error-100 dark:bg-error-500/10 dark:text-error-400 dark:ring-error-500/20'
                : 'bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20'
            }`}
          >
            {isDanger ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            aria-busy={pending}
            className={`inline-flex h-10 min-w-[7.5rem] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${
              isDanger
                ? 'bg-error-600 hover:bg-error-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error-600'
                : 'bg-brand-500 hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
            }`}
          >
            {pending ? (
              <>
                <Spinner className="text-white" />
                <span>{busyLabel}</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
