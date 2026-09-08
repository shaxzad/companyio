import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Link } from 'react-router-dom';

import { cn } from '../../lib/utils';

const alertVariants = cva('relative w-full rounded-xl border p-4', {
  variants: {
    variant: {
      default: 'border-border bg-background text-foreground',
      destructive:
        'border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive/30',
      success:
        'border-success-500 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400',
      warning:
        'border-warning-500 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-400',
      error:
        'border-error-500 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400',
      info: 'border-blue-light-500 bg-blue-light-50 text-blue-light-700 dark:border-blue-light-500/30 dark:bg-blue-light-500/15 dark:text-blue-light-400',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type AlertProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    title?: string;
    message?: string;
    showLink?: boolean;
    linkHref?: string;
    linkText?: string;
  };

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant,
      title,
      message,
      showLink = false,
      linkHref = '#',
      linkText = 'Learn more',
      children,
      ...props
    },
    ref
  ) => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {message ? <AlertDescription>{message}</AlertDescription> : null}
      {children}
      {showLink ? (
        <Link
          to={linkHref}
          className="mt-3 inline-block text-sm font-medium text-muted-foreground underline"
        >
          {linkText}
        </Link>
      ) : null}
    </div>
  )
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h4
      ref={ref}
      className={cn('mb-1 text-sm font-semibold text-gray-800 dark:text-white/90', className)}
      {...props}
    />
  )
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p className={cn('text-sm text-gray-500 dark:text-gray-400', className)} {...props} ref={ref} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription, alertVariants };
