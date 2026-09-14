import { useCallback, useState } from 'react';

export type ConfirmRequest = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  onConfirm: () => void | Promise<void>;
};

/**
 * Reusable confirm-dialog state for any product app.
 * Never use `window.confirm`.
 */
export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [pending, setPending] = useState(false);

  const askConfirm = useCallback((next: ConfirmRequest) => {
    setRequest(next);
  }, []);

  const close = useCallback(() => {
    if (pending) return;
    setRequest(null);
  }, [pending]);

  const confirm = useCallback(async () => {
    if (!request) return;
    setPending(true);
    try {
      await request.onConfirm();
      setRequest(null);
    } catch {
      // Keep dialog open on failure; caller should toast the error.
    } finally {
      setPending(false);
    }
  }, [request]);

  return {
    request,
    open: Boolean(request),
    pending,
    askConfirm,
    close,
    confirm,
  };
}
