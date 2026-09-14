import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

import { cn } from '../../lib/utils';

const sizeClasses = {
  xsmall: 'size-6',
  small: 'size-8',
  medium: 'size-10',
  large: 'size-12',
  xlarge: 'size-14',
  xxlarge: 'size-16',
} as const;

const statusSizeClasses = {
  xsmall: 'size-1.5',
  small: 'size-2',
  medium: 'size-2.5',
  large: 'size-3',
  xlarge: 'size-3.5',
  xxlarge: 'size-4',
} as const;

const statusColorClasses = {
  online: 'bg-success-500',
  offline: 'bg-error-400',
  busy: 'bg-warning-500',
} as const;

type AvatarSize = keyof typeof sizeClasses;
type AvatarStatus = keyof typeof statusColorClasses | 'none';

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    src?: string;
    alt?: string;
    size?: AvatarSize;
    status?: AvatarStatus;
  }
>(({ className, src, alt = 'User Avatar', size = 'medium', status = 'none', children, ...props }, ref) => (
  <span className={cn('relative inline-flex shrink-0', sizeClasses[size])}>
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex size-full shrink-0 overflow-hidden rounded-full',
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          {src ? <AvatarImage src={src} alt={alt} /> : null}
          <AvatarFallback>{alt.charAt(0)}</AvatarFallback>
        </>
      )}
    </AvatarPrimitive.Root>
    {status !== 'none' && (
      <span
        className={cn(
          'absolute bottom-0 end-0 rounded-full border-[1.5px] border-white dark:border-gray-900',
          statusSizeClasses[size],
          statusColorClasses[status]
        )}
      />
    )}
  </span>
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square size-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('flex size-full items-center justify-center rounded-full bg-muted', className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
