import * as React from 'react';

import { cn } from '../../lib/utils';

export type InputProps = React.ComponentProps<'input'> & {
  error?: boolean;
  success?: boolean;
  hint?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error = false, success = false, hint, ...props }, ref) => {
    const input = (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          error &&
            'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
          success &&
            'border-success-500 focus-visible:border-success-300 focus-visible:ring-success-500/20',
          className
        )}
        ref={ref}
        {...props}
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
