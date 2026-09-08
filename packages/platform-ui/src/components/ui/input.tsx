import * as React from 'react';

import { cn } from '../../lib/utils';

export type InputProps = React.ComponentProps<'input'> & {
  error?: boolean;
  success?: boolean;
  hint?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type = 'text', error = false, success = false, hint, onKeyDown, onWheel, ...props },
    ref
  ) => {
    const isNumber = type === 'number';

    const input = (
      <input
        ref={ref}
        {...props}
        type={isNumber ? 'text' : type}
        inputMode={isNumber ? 'decimal' : props.inputMode}
        autoComplete={props.autoComplete ?? (isNumber ? 'off' : undefined)}
        className={cn(
          'flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 placeholder:opacity-100 focus-visible:border-brand-300 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500',
          isNumber &&
            '[appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none',
          error &&
            'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
          success &&
            'border-success-500 focus-visible:border-success-300 focus-visible:ring-success-500/20',
          className
        )}
        onKeyDown={(event) => {
          if (isNumber && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            event.preventDefault();
          }
          onKeyDown?.(event);
        }}
        onWheel={(event) => {
          if (isNumber) event.currentTarget.blur();
          onWheel?.(event);
        }}
      />
    );

    if (!hint) {
      return input;
    }

    return (
      <div className="relative">
        {input}
        <p
          className={cn(
            'mt-1.5 text-xs',
            error ? 'text-destructive' : success ? 'text-success-500' : 'text-muted-foreground'
          )}
        >
          {hint}
        </p>
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
