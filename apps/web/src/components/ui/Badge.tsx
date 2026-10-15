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
          // Signature Obsidian Minimal
          'bg-white/[0.06] text-neutral-300 border border-white/10':
            variant === 'default',

          // Vibrant Haute Champagne Glam
          'bg-gradient-to-r from-amber-400/15 via-amber-500/10 to-transparent text-amber-200 border border-amber-400/30 shadow-[0_0_12px_rgba(212,175,55,0.15)]':
            variant === 'glam',

          // Metallic Champagne Gold
          'bg-amber-400/10 text-amber-300 border border-amber-400/30':
            variant === 'gold',

          // Deep Velvet Noir
          'bg-neutral-950 text-amber-200 border border-amber-400/30 shadow-xs':
            variant === 'velvet',

          // Emerald Success
          'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30':
            variant === 'success',

          // Destructive / Alert (Deep Crimson)
          'bg-rose-950/60 text-rose-300 border border-rose-500/30':
            variant === 'destructive',

          // Amber Warning
          'bg-amber-950/60 text-amber-300 border border-amber-500/30':
            variant === 'warning',

          // Smoked Glass
          'bg-white/[0.05] backdrop-blur-md text-neutral-300 border border-white/10':
            variant === 'glass',

          // Minimal Outline
          'border border-white/15 text-neutral-400':
            variant === 'outline',
        },
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full shrink-0", {
            'bg-amber-400 animate-pulse': variant === 'default' || variant === 'glam' || variant === 'gold' || variant === 'velvet' || variant === 'warning',
            'bg-emerald-400 animate-pulse': variant === 'success',
            'bg-rose-400 animate-pulse': variant === 'destructive',
            'bg-neutral-400': variant === 'outline' || variant === 'glass',
          })}
        />
      )}
      {children}
    </div>
  );
}
