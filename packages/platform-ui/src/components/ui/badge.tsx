import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
        warning:
          'border-transparent bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
        error:
          'border-transparent bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
        info: 'border-transparent bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500',
      },
      size: {
        default: 'text-xs',
        sm: 'text-theme-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants> & {
    color?: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark';
  };

function Badge({ className, variant, size, color, ...props }: BadgeProps) {
  const resolvedVariant =
    variant ??
    (color === 'primary' || color === 'light' || color === 'dark' ? 'default' : color) ??
    'default';

  return (
    <div className={cn(badgeVariants({ variant: resolvedVariant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
