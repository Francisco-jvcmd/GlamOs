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
          // Smoked Frosted Glass (Apple Vision fluidity)
          'bg-neutral-900/60 backdrop-blur-xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-white':
            variant === 'glass',

          // Deep Obsidian Noir (Spotify contrast × Chanel elegance)
          'bg-black/80 backdrop-blur-2xl text-white border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.8)]':
            variant === 'noir',

          // Featured Hero Card with Champagne Gold Specular Halo
          'bg-gradient-to-br from-amber-950/25 via-neutral-900/80 to-black/90 text-white border border-amber-400/35 shadow-[0_20px_50px_rgba(212,175,55,0.08)]':
            variant === 'hero',

          // Solid Obsidian Surface
          'bg-neutral-900/80 border border-white/[0.06] text-white shadow-lg':
            variant === 'pearl' || variant === 'default',

          // Interactive Hover Lift
          'hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-[0_20px_50px_rgba(212,175,55,0.1)] cursor-pointer':
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
      className={cn("text-xl sm:text-2xl font-bold tracking-tight font-editorial text-white", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs text-neutral-400 leading-relaxed", className)} {...props} />
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
