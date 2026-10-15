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
            // Haute Couture Signature Gradient (Chanel × Dyson vibrancy)
            'bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white shadow-md shadow-rose-900/15 hover:shadow-lg hover:shadow-rose-900/25 hover:brightness-105 rounded-2xl':
              variant === 'glam' || variant === 'default',

            // Deep Velvet Royal (Spotify depth × High luxury)
            'bg-gradient-to-r from-[#2D0A22] via-[#1E0517] to-[#0F020B] text-amber-200 border border-amber-400/30 shadow-lg shadow-black/20 hover:border-amber-400/60 hover:text-amber-100 rounded-2xl':
              variant === 'velvet',

            // Metallic Champagne Gold
            'bg-gradient-to-r from-[#FFF6D6] via-[#F6D365] to-[#D97706] text-amber-950 shadow-md shadow-amber-900/15 hover:shadow-lg hover:shadow-amber-900/25 hover:brightness-105 rounded-2xl font-bold':
              variant === 'gold',

            // Frosted Glass (Apple Vision precision)
            'bg-white/80 backdrop-blur-md border border-amber-200/80 text-gray-800 shadow-xs hover:bg-white hover:border-amber-300 hover:text-amber-950 rounded-2xl':
              variant === 'glass',

            // Editorial Crisp Outline
            'border border-amber-200/90 bg-white/50 backdrop-blur-sm text-gray-700 hover:bg-amber-50/70 hover:border-amber-300 hover:text-amber-950 rounded-2xl':
              variant === 'outline',

            // Minimal Ghost
            'text-gray-600 hover:bg-amber-50/60 hover:text-amber-950 rounded-xl':
              variant === 'ghost',

            // Luxury Destructive (Ruby wine)
            'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-sm hover:from-rose-700 hover:to-rose-800 shadow-rose-900/20 rounded-2xl':
              variant === 'destructive',

            // Editorial Link
            'text-amber-900 underline-offset-4 hover:underline p-0 h-auto font-normal':
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
