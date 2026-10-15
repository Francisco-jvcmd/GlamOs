import { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from './Badge';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'glam' | 'gold' | 'velvet' | 'success' | 'destructive' | 'warning' | 'outline' | 'glass' | 'default';
  actions?: ReactNode;
  icon?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  badgeVariant = 'gold',
  actions,
  icon,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/[0.08]">
      <div className="space-y-1.5">
        {badge && (
          <div className="flex items-center gap-2">
            <Badge variant={badgeVariant} dot>
              {icon || <Sparkles className="w-3 h-3 text-amber-400" />}
              {badge}
            </Badge>
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold font-editorial text-white tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
