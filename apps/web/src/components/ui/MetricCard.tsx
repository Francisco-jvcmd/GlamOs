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
        "rounded-3xl p-5 sm:p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between shadow-2xs group",
        {
          // Frosted Glass (Default)
          'bg-white/85 backdrop-blur-xl border border-amber-200/70 hover:border-amber-300 hover:shadow-md':
            variant === 'glass',

          // Hero Sunset-Rose Gradient (Spotify contrast)
          'bg-gradient-to-br from-[#FDA085] via-[#FB7185] to-[#E11D48] text-white shadow-lg shadow-rose-900/20 border border-white/20':
            variant === 'hero',

          // Deep Velvet Noir
          'bg-gradient-to-br from-[#1E0517] via-[#14020F] to-[#0A0108] text-white border border-amber-400/20 shadow-xl shadow-black/25':
            variant === 'noir',

          // Champagne Gold
          'bg-gradient-to-br from-amber-50/80 via-white to-amber-100/40 border border-amber-300/80 shadow-xs hover:border-amber-400':
            variant === 'gold',
        },
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-xs font-bold uppercase tracking-wider",
            variant === 'hero' ? 'text-white/85' : variant === 'noir' ? 'text-amber-200/80' : 'text-gray-500'
          )}
        >
          {label}
        </span>
        {icon && (
          <div
            className={cn(
              "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
              variant === 'hero'
                ? 'bg-white/20 text-white'
                : variant === 'noir'
                ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4">
        <div
          className={cn(
            "text-2xl sm:text-3xl font-extrabold font-editorial tracking-tight truncate",
            variant === 'hero' ? 'text-white' : variant === 'noir' ? 'text-amber-100' : 'text-gray-950'
          )}
        >
          {value}
        </div>

        <div className="flex items-center justify-between gap-2 mt-1">
          {subtitle && (
            <span
              className={cn(
                "text-[11px] truncate",
                variant === 'hero' ? 'text-white/80' : variant === 'noir' ? 'text-amber-200/60' : 'text-gray-400'
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
