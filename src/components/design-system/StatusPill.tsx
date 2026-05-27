import type { ReactNode } from 'react';
import { CheckCircle2, Clock3, Loader2, MinusCircle, ShoppingBag, XCircle } from 'lucide-react';
import { cx } from './cx';

export type StatusTone = 'neutral' | 'queued' | 'running' | 'success' | 'error' | 'commercial';
type StatusPillSize = 'sm' | 'md';

export type StatusPillProps = {
  tone?: StatusTone;
  size?: StatusPillSize;
  children: ReactNode;
  className?: string;
};

const toneClasses: Record<StatusTone, string> = {
  neutral: 'border-white/[0.08] bg-white/[0.04] text-on-surface-variant',
  queued: 'border-white/[0.08] bg-white/[0.04] text-on-surface-variant',
  running: 'border-lime/20 bg-lime/10 text-lime',
  success: 'border-tertiary/20 bg-tertiary-container text-on-tertiary-container',
  error: 'border-error/25 bg-error-container text-on-error-container',
  commercial: 'border-secondary/25 bg-secondary-container text-on-secondary-container',
};

const sizeClasses: Record<StatusPillSize, string> = {
  sm: 'h-6 px-2 text-[11px]',
  md: 'h-7 px-2.5 text-xs',
};

function StatusIcon({ tone }: { tone: StatusTone }) {
  if (tone === 'running') return <Loader2 size={13} className="animate-spin" aria-hidden="true" />;
  if (tone === 'success') return <CheckCircle2 size={13} aria-hidden="true" />;
  if (tone === 'error') return <XCircle size={13} aria-hidden="true" />;
  if (tone === 'commercial') return <ShoppingBag size={13} aria-hidden="true" />;
  if (tone === 'queued') return <Clock3 size={13} aria-hidden="true" />;
  return <MinusCircle size={13} aria-hidden="true" />;
}

export function StatusPill({ tone = 'neutral', size = 'md', children, className }: StatusPillProps) {
  return (
    <span
      className={cx(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border font-medium',
        toneClasses[tone],
        sizeClasses[size],
        className,
      )}
    >
      <StatusIcon tone={tone} />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}
