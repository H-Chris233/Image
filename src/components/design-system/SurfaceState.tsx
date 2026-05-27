import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ImageIcon, Info, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Surface } from './Surface';
import { cx } from './cx';

export type SurfaceStateKind = 'empty' | 'loading' | 'error' | 'success' | 'info';

export type SurfaceStateAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  iconStart?: ReactNode;
};

export type SurfaceStateProps = {
  kind?: SurfaceStateKind;
  title: ReactNode;
  description?: ReactNode;
  action?: SurfaceStateAction;
  secondaryAction?: SurfaceStateAction;
  className?: string;
};

const iconClasses: Record<SurfaceStateKind, string> = {
  empty: 'border-white/[0.08] bg-white/[0.04] text-on-surface-variant',
  loading: 'border-lime/20 bg-lime/10 text-lime',
  error: 'border-error/25 bg-error-container text-on-error-container',
  success: 'border-tertiary/20 bg-tertiary-container text-on-tertiary-container',
  info: 'border-white/[0.08] bg-white/[0.04] text-on-surface-variant',
};

function StateIcon({ kind }: { kind: SurfaceStateKind }) {
  if (kind === 'loading') return <Loader2 size={20} className="animate-spin" aria-hidden="true" />;
  if (kind === 'error') return <AlertTriangle size={20} aria-hidden="true" />;
  if (kind === 'success') return <CheckCircle2 size={20} aria-hidden="true" />;
  if (kind === 'info') return <Info size={20} aria-hidden="true" />;
  return <ImageIcon size={20} aria-hidden="true" />;
}

function ActionLink({ action, variant }: { action: SurfaceStateAction; variant: 'primary' | 'ghost' }) {
  if (action.href) {
    return (
      <Button
        as="a"
        variant={variant}
        size="sm"
        href={action.href}
        iconStart={action.iconStart}
      >
        {action.label}
      </Button>
    );
  }
  return (
    <Button variant={variant} size="sm" onClick={action.onClick} iconStart={action.iconStart}>
      {action.label}
    </Button>
  );
}

export function SurfaceState({
  kind = 'empty',
  title,
  description,
  action,
  secondaryAction,
  className,
}: SurfaceStateProps) {
  return (
    <Surface tone={kind === 'error' ? 'danger' : 'dashed'} padding="lg" className={cx('min-h-56', className)}>
      <div className="flex h-full min-h-44 flex-col items-center justify-center text-center">
        <div className={cx('mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border', iconClasses[kind])}>
          <StateIcon kind={kind} />
        </div>
        <h3 className="max-w-md font-display text-base font-semibold leading-6 text-on-surface">{title}</h3>
        {description ? (
          <p className="mt-2 max-w-md text-sm leading-6 text-on-surface-variant">{description}</p>
        ) : null}
        {action || secondaryAction ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {action ? <ActionLink action={action} variant="primary" /> : null}
            {secondaryAction ? <ActionLink action={secondaryAction} variant="ghost" /> : null}
          </div>
        ) : null}
      </div>
    </Surface>
  );
}
