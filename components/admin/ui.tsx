'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from '@/lib/shared/format';

export function Card({ title, subtitle, actions, children, className }: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('bg-white p-5 sm:p-6 rounded-3xl border border-gold-500/40 shadow-sm', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 mb-4 border-b border-stone-200">
          <div>
            {title && <h3 className="font-serif text-base sm:text-lg font-bold text-maroon-700">{title}</h3>}
            {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx('block text-xs', className)}>
      <span className="block font-semibold text-stone-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-stone-500 mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full border border-stone-300 rounded-xl px-3 py-2 text-xs text-espresso bg-white focus:border-maroon-700 focus:outline-none disabled:bg-stone-100';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputClass, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputClass, props.className)} />;
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
const variants: Record<Variant, string> = {
  primary: 'bg-maroon-700 hover:bg-maroon-800 text-parchment-100',
  secondary: 'bg-stone-800 hover:bg-stone-900 text-amber-100',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white',
  ghost: 'bg-stone-100 hover:bg-stone-200 text-stone-800',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white'
};

export function Button({ variant = 'primary', loading, children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 font-bold px-4 py-2 rounded-xl text-xs transition disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cx('inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border', className)}>{children}</span>;
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-stone-500 text-sm">
      <Loader2 className="w-5 h-5 animate-spin" /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
      <span>{message}</span>
      {onRetry && <Button variant="ghost" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-maroon-700" />
      {label}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-start justify-center p-3 sm:p-6">
        <div className={cx('relative z-10 w-full bg-stone-50 rounded-3xl shadow-2xl border border-gold-500/50 overflow-hidden', wide ? 'max-w-5xl' : 'max-w-xl')}>
          <div className="flex items-center justify-between px-5 py-4 bg-maroon-700 text-parchment-100">
            <h3 className="font-serif font-bold text-base">{title}</h3>
            <button onClick={onClose} className="text-parchment-200 hover:text-white text-xl leading-none" aria-label="Close">×</button>
          </div>
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
