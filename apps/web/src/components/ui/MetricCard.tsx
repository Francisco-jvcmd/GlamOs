import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: 'glass' | 'hero' | 'noir' | 'gold';
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  variant = 'glass',
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl p-5 sm:p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between group",
        {
          // Smoked Frosted Glass (Default)
          'bg-neutral-900/60 backdrop-blur-xl border border-white/[0.08] hover:border-amber-400/40 hover:bg-neutral-900/80 shadow-[0_15px_35px_rgba(0,0,0,0.5)]':
            variant === 'glass',

          // Featured Hero Card with Champagne Gold Specular Halo (Spotify Focus)
          'bg-gradient-to-br from-amber-950/25 via-neutral-900/80 to-black/90 border border-amber-400/35 shadow-[0_15px_35px_rgba(212,175,55,0.08)] hover:border-amber-400/60':
            variant === 'hero',

          // Deep Obsidian Lacquer (Chanel Noir)
          'bg-black/75 backdrop-blur-xl border border-white/[0.07] hover:border-amber-400/30 shadow-[0_15px_35px_rgba(0,0,0,0.7)]':
            variant === 'noir',

          // Champagne Gold Ambient Accent
          'bg-gradient-to-br from-neutral-900/80 via-neutral-900/60 to-amber-950/20 border border-amber-400/25 hover:border-amber-400/50 shadow-[0_15px_35px_rgba(0,0,0,0.5)]':
            variant === 'gold',
        },
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-widest transition-colors",
            variant === 'hero' ? 'text-amber-200/90' : 'text-neutral-400 group-hover:text-neutral-200'
          )}
        >
          {label}
        </span>
        {icon && (
          <div
            className={cn(
              "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
              variant === 'hero'
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                : 'bg-white/[0.05] text-amber-300 border border-white/10 group-hover:border-amber-400/30'
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4">
        <div
          className={cn(
            "text-2xl sm:text-3xl font-bold font-editorial tracking-tight truncate",
            variant === 'hero' ? 'text-gradient-glam' : 'text-white'
          )}
        >
          {value}
        </div>

        <div className="flex items-center justify-between gap-2 mt-1">
          {subtitle && (
            <span
              className={cn(
                "text-[11px] truncate",
                variant === 'hero' ? 'text-amber-200/60' : 'text-neutral-400'
              )}
            >
              {subtitle}
            </span>
          )}

          {trend && (
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                trend.isPositive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
