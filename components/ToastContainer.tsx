'use client';

import React from 'react';
import { useToast } from '@/lib/toast';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0">
      {toasts.map((t) => {
        const icons = {
          success: CheckCircle2,
          warn: AlertTriangle,
          error: AlertCircle,
          info: Info,
        };
        const Icon = icons[t.type || 'success'];

        const colors = {
          success: 'bg-stone-900 border-gold-500/70 text-parchment-100',
          warn: 'bg-amber-950 border-amber-500 text-amber-100',
          error: 'bg-red-950 border-red-500 text-red-100',
          info: 'bg-stone-900 border-stone-600 text-stone-100',
        };

        const iconColors = {
          success: 'text-gold-400',
          warn: 'text-amber-400',
          error: 'text-red-400',
          info: 'text-blue-400',
        };

        return (
          <div
            key={t.id}
            role="status"
            onClick={() => dismissToast(t.id)}
            className={`pointer-events-auto rounded-2xl p-4 border shadow-2xl backdrop-blur-md flex items-start gap-3 animate-fadeIn ${
              colors[t.type || 'success']
            }`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[t.type || 'success']}`} />
            <div className="flex-1 min-w-0">
              <h5 className="font-bold text-xs sm:text-sm font-serif leading-tight">
                {t.title}
              </h5>
              <p className="text-[11px] sm:text-xs text-stone-300 mt-0.5 leading-snug">
                {t.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
