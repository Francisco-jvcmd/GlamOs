import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'noir' | 'hero' | 'default' | 'pearl';
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'glass', interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-3xl transition-all duration-300 relative overflow-hidden",
        {
          // Frosted Glass (Apple Vision fluidity)
          'bg-white/85 backdrop-blur-xl border border-amber-200/70 shadow-[0_10px_30px_rgba(217,119,6,0.04)]':
            variant === 'glass',

          // Deep Velvet Noir (Spotify contrast × Chanel elegance)
          'bg-gradient-to-br from-[#1E0517] via-[#14020F] to-[#0A0108] text-white border border-amber-400/20 shadow-[0_20px_50px_rgba(0,0,0,0.4)]':
            variant === 'noir',

          // Hero Ambient Card
          'bg-gradient-to-br from-[#FDA085] via-[#FB7185] to-[#E11D48] text-white shadow-xl shadow-rose-900/20 border border-white/20':
            variant === 'hero',

          // Silk Pearl
          'bg-[#FCFAF7] border border-amber-100 shadow-xs':
            variant === 'pearl' || variant === 'default',

          // Interactive Hover Lift
          'hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-900/5 cursor-pointer':
            interactive,
        },
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6 sm:p-7", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-xl sm:text-2xl font-bold tracking-tight font-editorial text-gray-950", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs text-gray-500 leading-relaxed", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 sm:p-7 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 sm:p-7 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";
