import { ApiError, isApiError, parseApiErrorBody, type ApiErrorBody } from '../types/apiError';

export type { ApiErrorBody };
export { ApiError, isApiError, parseApiErrorBody };

/** Normalize any thrown value into a displayable message. */
export const toErrorMessage = (caught: unknown, fallback = 'Something went wrong.'): string => {
  if (isApiError(caught)) return caught.message;
  if (caught instanceof Error && caught.message.trim()) return caught.message;
  if (typeof caught === 'string' && caught.trim()) return caught;
  if (caught && typeof caught === 'object' && 'message' in caught) {
    const message = (caught as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

/** Field → message map from an API / client error (empty if global-only). */
export const getFieldErrors = (caught: unknown): Record<string, string> => {
  if (isApiError(caught)) return { ...caught.fields };
  return {};
};

/**
 * Decide presentation:
 * - field errors → show under inputs (caller maps keys)
 * - otherwise → global toast
 */
export type PresentedError = {
  message: string;
  fields: Record<string, string>;
  showToast: boolean;
};

export const presentError = (caught: unknown): PresentedError => {
  const message = toErrorMessage(caught);
  const fields = getFieldErrors(caught);
  return {
    message,
    fields,
    showToast: Object.keys(fields).length === 0,
  };
};
