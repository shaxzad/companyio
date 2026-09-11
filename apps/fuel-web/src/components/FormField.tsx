import type { ComponentProps, ReactNode } from 'react';
import { Input, Label } from '@companyio/platform-ui';

type InputProps = ComponentProps<typeof Input>;

type FormFieldProps = {
  id: string;
  label: ReactNode;
  error?: string;
  required?: boolean;
  children?: ReactNode;
} & Omit<InputProps, 'id' | 'error' | 'hint'>;

/**
 * Label + Input with inline field error (platform-ui Input `error` + `hint`).
 */
export function FormField({
  id,
  label,
  error,
  required,
  children,
  ...inputProps
}: FormFieldProps) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-brand-500"> *</span> : null}
      </Label>
      {children ?? (
        <Input
          id={id}
          {...inputProps}
          error={Boolean(error)}
          hint={error}
          aria-invalid={Boolean(error)}
        />
      )}
      {children && error ? (
        <p className="mt-1.5 text-xs text-error-600 dark:text-error-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
