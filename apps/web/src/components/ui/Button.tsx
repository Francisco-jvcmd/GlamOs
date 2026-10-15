import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'glam' | 'default' | 'velvet' | 'gold' | 'glass' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'pill';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'glam', size = 'default', isLoading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-semibold text-xs tracking-wide transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
          {
            // Haute Horlogerie Signature Champagne Gold (Pure Luxury)
            'bg-gradient-to-r from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 font-bold shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_6px_28px_rgba(212,175,55,0.45)] hover:brightness-105 rounded-2xl':
              variant === 'glam' || variant === 'default',

            // Deep Obsidian Velvet (Chanel Black Lacquer)
            'bg-neutral-900/90 text-neutral-200 border border-white/10 shadow-lg shadow-black/40 hover:border-amber-400/40 hover:text-white hover:bg-neutral-850 rounded-2xl':
              variant === 'velvet',

            // Solid Brushed Gold
            'bg-[#D4AF37] text-neutral-950 shadow-md shadow-amber-950/30 hover:bg-[#E5C378] hover:shadow-[0_4px_20px_rgba(212,175,55,0.35)] rounded-2xl font-bold':
              variant === 'gold',

            // Smoked Frosted Glass (Apple Vision Precision)
            'bg-white/[0.06] backdrop-blur-md border border-white/10 text-neutral-200 shadow-xs hover:bg-white/[0.12] hover:border-white/20 hover:text-white rounded-2xl':
              variant === 'glass',

            // Editorial Crisp Outline
            'border border-white/15 bg-white/[0.02] backdrop-blur-sm text-neutral-300 hover:bg-white/[0.06] hover:border-amber-400/50 hover:text-amber-200 rounded-2xl':
              variant === 'outline',

            // Minimal Ghost
            'text-neutral-400 hover:bg-white/[0.06] hover:text-white rounded-xl':
              variant === 'ghost',

            // Luxury Destructive (Deep Crimson Velvet)
            'bg-rose-950/80 text-rose-200 border border-rose-500/30 hover:bg-rose-900 shadow-sm rounded-2xl':
              variant === 'destructive',

            // Editorial Link
            'text-amber-400 underline-offset-4 hover:underline p-0 h-auto font-normal':
              variant === 'link',

            // Sizing hierarchy
            'h-11 px-5 py-2.5': size === 'default',
            'h-9 px-3.5 py-1.5 text-[11px] rounded-xl': size === 'sm',
            'h-13 px-7 py-3.5 text-sm rounded-2xl': size === 'lg',
            'h-10 w-10 p-0 rounded-xl': size === 'icon',
            'h-8 px-4 py-1 text-[11px] rounded-full': size === 'pill',
          },
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Procesando...</span>
          </div>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";
