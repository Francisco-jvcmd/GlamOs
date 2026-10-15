import { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'glam' | 'gold' | 'velvet' | 'success' | 'destructive' | 'warning' | 'outline' | 'glass' | 'default';
  dot?: boolean;
}

export function Badge({ className, variant = 'default', dot = false, children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider uppercase transition-colors select-none",
        {
          // Signature Sunset Rose
          'bg-rose-50 text-rose-900 border border-rose-200/80':
            variant === 'default',

          // Vibrant Haute Glam
          'bg-gradient-to-r from-[#F6D365]/20 via-[#FDA085]/20 to-[#E11D48]/20 text-rose-950 border border-rose-300/60 font-black':
            variant === 'glam',

          // Champagne Gold
          'bg-amber-50 text-amber-950 border border-amber-300/80':
            variant === 'gold',

          // Deep Velvet Noir
          'bg-[#1E0517] text-amber-200 border border-amber-400/40 shadow-xs':
            variant === 'velvet',

          // Emerald Success
          'bg-emerald-50 text-emerald-900 border border-emerald-200':
            variant === 'success',

          // Destructive / Alert
          'bg-rose-100/80 text-rose-900 border border-rose-300':
            variant === 'destructive',

          // Amber Warning
          'bg-amber-100 text-amber-950 border border-amber-300':
            variant === 'warning',

          // Frosted Glass
          'bg-white/70 backdrop-blur-md text-gray-800 border border-gray-200/70 shadow-2xs':
            variant === 'glass',

          // Minimal Outline
          'border border-amber-200/80 text-gray-600':
            variant === 'outline',
        },
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full shrink-0", {
            'bg-rose-500 animate-pulse': variant === 'default' || variant === 'glam',
            'bg-amber-500 animate-pulse': variant === 'gold' || variant === 'warning',
            'bg-amber-300': variant === 'velvet',
            'bg-emerald-500': variant === 'success',
            'bg-rose-600': variant === 'destructive',
            'bg-gray-400': variant === 'outline' || variant === 'glass',
          })}
        />
      )}
      {children}
    </div>
  );
}
