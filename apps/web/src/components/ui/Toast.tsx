import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ToastProps {
  message: string;
  subtitle?: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export function Toast({ message, subtitle, type = 'success', onClose }: ToastProps) {
  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3.5 px-5 py-3.5 rounded-3xl bg-white/95 backdrop-blur-2xl text-gray-900 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-amber-200/80 animate-in fade-in slide-in-from-top-4 duration-300 select-none">
      <div
        className={cn(
          "w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-xs",
          {
            'bg-emerald-50 text-emerald-600 border border-emerald-200': type === 'success',
            'bg-rose-50 text-rose-600 border border-rose-200': type === 'error',
            'bg-amber-50 text-amber-600 border border-amber-200': type === 'info',
          }
        )}
      >
        {type === 'success' && <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
        {type === 'error' && <AlertCircle className="w-4 h-4 stroke-[2.5]" />}
        {type === 'info' && <Info className="w-4 h-4 stroke-[2.5]" />}
      </div>

      <div className="min-w-0 pr-2">
        <div className="font-bold text-xs sm:text-sm tracking-wide text-gray-900 truncate">
          {message}
        </div>
        {subtitle && (
          <div className="text-[10px] text-gray-400 font-medium truncate">
            {subtitle}
          </div>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
