import { useCallback, useState } from 'react';
import { presentError, toErrorMessage } from '../utils/errors';
import {
  toast,
} from '@companyio/platform-ui';

export type FieldErrors = Record<string, string>;

type SubmitOptions<TResult> = {
  /** Run the API / mutation. Throw on failure. */
  request: () => Promise<TResult>;
  /** Called only after a successful response. Reset form here. */
  onSuccess?: (result: TResult) => void;
  /** Optional success toast. */
  successMessage?: string;
  /**
   * Client-side validation before the request.
   * Return field errors to abort without calling the API (no form reset).
   */
  validate?: () => FieldErrors | null;
};

/**
 * Reusable form + mutation error handling.
 *
 * - Field errors → under inputs via `fieldError(name)`
 * - Global errors → top-right toast
 * - Form reset only inside `onSuccess` after the API succeeds
 */
export function useFormSubmission() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const clearErrors = useCallback(() => setFieldErrors({}), []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const fieldError = useCallback((field: string) => fieldErrors[field], [fieldErrors]);

  const applyCaughtError = useCallback((caught: unknown) => {
    const presented = presentError(caught);
    setFieldErrors(presented.fields);
    if (presented.showToast) {
      toast.error(presented.message);
    }
    return presented;
  }, []);

  /**
   * Submit helper: clear errors → optional validate → request → onSuccess (reset) or errors.
   * Never resets the form on error.
   */
  const submit = useCallback(
    async <TResult,>({
      request,
      onSuccess,
      successMessage,
      validate,
    }: SubmitOptions<TResult>): Promise<TResult | undefined> => {
      clearErrors();
      const clientFields = validate?.() ?? null;
      if (clientFields && Object.keys(clientFields).length > 0) {
        setFieldErrors(clientFields);
        return undefined;
      }

      setSubmitting(true);
      try {
        const result = await request();
        clearErrors();
        onSuccess?.(result);
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (caught) {
        applyCaughtError(caught);
        return undefined;
      } finally {
        setSubmitting(false);
      }
    },
    [applyCaughtError, clearErrors]
  );

  /** For non-form actions (toggle, load defaults) — always toast on failure. */
  const runAction = useCallback(
    async <TResult,>(
      request: () => Promise<TResult>,
      options?: { successMessage?: string; onSuccess?: (result: TResult) => void }
    ): Promise<TResult | undefined> => {
      try {
        const result = await request();
        options?.onSuccess?.(result);
        if (options?.successMessage) toast.success(options.successMessage);
        return result;
      } catch (caught) {
        toast.error(toErrorMessage(caught));
        return undefined;
      }
    },
    []
  );

  return {
    fieldErrors,
    fieldError,
    submitting,
    clearErrors,
    clearFieldError,
    setFieldError,
    applyCaughtError,
    submit,
    runAction,
  };
}
