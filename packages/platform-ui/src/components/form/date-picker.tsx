import { useEffect, useId, useRef, type ReactNode } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import { CalenderIcon } from '../../icons';
import { cn } from '../../lib/utils';
import { Label } from '../ui/label';

export type DatePickerProps = {
  id?: string;
  /** When true, shows time selection (value format `YYYY-MM-DDTHH:mm`). */
  enableTime?: boolean;
  /** Controlled value: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` when `enableTime`. */
  value?: string;
  onChange?: (value: string) => void;
  label?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  minDate?: string | Date;
  maxDate?: string | Date;
  className?: string;
  /** Omit outer label when wrapping with `FormField`. */
  hideLabel?: boolean;
};

/**
 * Shared date / date-time picker (flatpickr). Prefer this over native `type="date"` /
 * `type="datetime-local"` so all product apps look and behave the same.
 */
export default function DatePicker({
  id,
  enableTime = false,
  value = '',
  onChange,
  label,
  placeholder,
  disabled = false,
  required = false,
  error,
  hint,
  minDate,
  maxDate,
  className,
  hideLabel = false,
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const dateFormat = enableTime ? 'Y-m-d\\TH:i' : 'Y-m-d';
  const defaultPlaceholder = enableTime ? 'Select date and time' : 'Select a date';
  const message = error ?? hint;

  useEffect(() => {
    if (!inputRef.current) return;

    const instance = flatpickr(inputRef.current, {
      enableTime,
      time_24hr: true,
      allowInput: false,
      monthSelectorType: 'static',
      dateFormat,
      defaultDate: value || undefined,
      minDate: minDate || undefined,
      maxDate: maxDate || undefined,
      disableMobile: true,
      onChange: (_dates, dateStr) => {
        onChangeRef.current?.(dateStr);
      },
      onClose: (_dates, dateStr) => {
        // Clear → empty string so forms treat blank as “use now” / unset.
        if (!dateStr) onChangeRef.current?.('');
      },
    });

    pickerRef.current = instance;

    return () => {
      instance.destroy();
      pickerRef.current = null;
    };
    // Re-init when mode / bounds / id change; value synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- controlled value via setDate
  }, [enableTime, dateFormat, minDate, maxDate, inputId]);

  useEffect(() => {
    const instance = pickerRef.current;
    if (!instance) return;
    const current = instance.input.value;
    if ((value || '') === current) return;
    if (value) instance.setDate(value, false);
    else instance.clear(false);
  }, [value]);

  useEffect(() => {
    const instance = pickerRef.current;
    if (!instance) return;
    if (disabled) instance.close();
    instance.input.disabled = disabled;
  }, [disabled]);

  return (
    <div className={cn(className)}>
      {label && !hideLabel ? (
        <Label htmlFor={inputId}>
          {label}
          {required ? <span className="text-brand-500"> *</span> : null}
        </Label>
      ) : null}

      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          readOnly
          disabled={disabled}
          required={required}
          placeholder={placeholder ?? defaultPlaceholder}
          aria-invalid={Boolean(error)}
          className={cn(
            'h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800',
            error &&
              'border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:border-error-700'
          )}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 dark:text-gray-400">
          <CalenderIcon className="size-5" />
        </span>
      </div>

      {message ? (
        <p
          className={cn(
            'mt-1.5 text-xs',
            error ? 'text-error-600 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'
          )}
          role={error ? 'alert' : undefined}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
