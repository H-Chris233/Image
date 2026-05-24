import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cx } from './cx';

type LinkButtonVariant = 'primary' | 'ghost' | 'lime' | 'orange' | 'danger' | 'plain';
type LinkButtonSize = 'sm' | 'md' | 'lg';

export type LinkButtonProps = LinkProps & {
  variant?: LinkButtonVariant;
  size?: LinkButtonSize;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
};

const variantClasses: Record<LinkButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary shadow-[0_10px_28px_rgba(240,237,232,0.12)] hover:bg-[#ffffff] focus-visible:ring-primary/30',
  ghost:
    'border border-white/[0.12] bg-white/[0.035] text-on-surface/80 hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-on-surface focus-visible:ring-lime/30',
  lime:
    'bg-lime text-on-lime shadow-[0_0_16px_rgba(227,255,116,0.24)] hover:bg-[#f0ff9c] focus-visible:ring-lime/35',
  orange:
    'bg-secondary text-on-secondary shadow-[0_0_18px_rgba(254,110,0,0.22)] hover:bg-[#ff8326] focus-visible:ring-secondary/35',
  danger:
    'border border-error/30 bg-error-container text-on-error-container hover:border-error/45 hover:bg-error-container/80 focus-visible:ring-error/30',
  plain:
    'bg-transparent text-on-surface-variant hover:bg-white/[0.05] hover:text-on-surface focus-visible:ring-lime/30',
};

const sizeClasses: Record<LinkButtonSize, string> = {
  sm: 'h-11 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export function LinkButton({
  children,
  className,
  disabled = false,
  fullWidth = false,
  iconEnd,
  iconStart,
  size = 'md',
  variant = 'primary',
  ...props
}: LinkButtonProps) {
  return (
    <Link
      aria-disabled={disabled || undefined}
      className={cx(
        'inline-flex min-w-0 items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
        disabled && 'pointer-events-none opacity-45',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {iconStart}
      {children ? <span className="min-w-0 truncate">{children}</span> : null}
      {iconEnd}
    </Link>
  );
}
