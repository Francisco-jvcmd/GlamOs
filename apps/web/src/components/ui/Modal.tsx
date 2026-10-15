import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Frosted Dark Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog Surface */}
      <div
        className={cn(
          "relative w-full rounded-3xl bg-[#0F0E14]/95 backdrop-blur-2xl p-6 sm:p-8 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar",
          {
            'max-w-sm': maxWidth === 'sm',
            'max-w-md': maxWidth === 'md',
            'max-w-lg': maxWidth === 'lg',
            'max-w-2xl': maxWidth === 'xl',
          }
        )}
      >
        {/* Subtle Luxury Corner Accents */}
        <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-amber-400/40 rounded-tl-sm pointer-events-none" />
        <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-amber-400/40 rounded-tr-sm pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/[0.08] mb-5">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-editorial text-white tracking-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed font-sans">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
