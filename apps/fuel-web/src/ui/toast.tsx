import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

/** App-wide toast helpers (Sonner). Prefer these over importing sonner directly. */
export const toast = {
  error: (message: string, description?: string) =>
    sonnerToast.error(message, description ? { description } : undefined),
  success: (message: string, description?: string) =>
    sonnerToast.success(message, description ? { description } : undefined),
  info: (message: string, description?: string) =>
    sonnerToast.message(message, description ? { description } : undefined),
};

export function AppToaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'border border-gray-200 bg-white text-gray-900 shadow-lg',
          error: 'border-error-200',
          success: 'border-success-200',
          title: 'font-semibold',
          description: 'text-gray-600',
        },
      }}
    />
  );
}
