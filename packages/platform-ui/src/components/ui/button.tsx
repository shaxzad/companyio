import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

/**
 * Product action button. Prefer `<Button variant="primary|secondary">` over raw
 * `<button className={primaryActionClass}>` in apps.
 * Variants match the shared brand action tokens used across fuel / platform apps.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** Brand fill — default product CTA / submit. */
        primary: 'bg-brand-500 px-4 py-2.5 text-white shadow-none hover:bg-brand-600',
        /** Alias of primary for older call sites. */
        default: 'bg-brand-500 px-4 py-2.5 text-white shadow-none hover:bg-brand-600',
        /** Outlined secondary action (Cancel, Refresh, Print). */
        secondary:
          'border border-gray-200 bg-white px-4 py-2.5 text-gray-700 hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200',
        outline:
          'border border-gray-200 bg-white px-4 py-2.5 text-gray-700 hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200',
        destructive: 'bg-error-600 px-4 py-2.5 text-white shadow-none hover:bg-error-700',
        ghost:
          'bg-transparent px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
        link: 'bg-transparent px-0 py-0 text-brand-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-auto min-h-10',
        sm: 'min-h-8 rounded-md px-3 py-1.5 text-xs',
        md: 'h-auto min-h-10 px-4 py-2.5',
        lg: 'min-h-11 rounded-lg px-6 py-3 text-base',
        icon: 'size-9 shrink-0 p-0',
        xs: 'min-h-8 rounded-md px-3 py-1.5 text-xs',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
