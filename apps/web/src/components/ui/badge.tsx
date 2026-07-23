import * as React from 'react';
import { cn } from '@/lib/utils/cn';

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'success' | 'warning' | 'error' | 'outline';
  }
>(({ className, variant = 'default', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        {
          'bg-slate-900 text-slate-50 hover:bg-slate-900/80 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/80':
            variant === 'default',
          'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400':
            variant === 'success',
          'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400':
            variant === 'warning',
          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400': variant === 'error',
          'text-foreground border border-input': variant === 'outline',
        },
        className,
      )}
      {...props}
    />
  );
});
Badge.displayName = 'Badge';

export { Badge };
