import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from './cx';

type IconButtonVariant = 'ghost' | 'solid' | 'lime' | 'danger' | 'plain';
type IconButtonSize = 'sm' | 'md' | 'lg';

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  children?: ReactNode;
};

const variantClasses: Record<IconButtonVariant, string> = {
  ghost:
    'border border-white/[0.09] bg-white/[0.035] text-on-surface-variant hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-on-surface focus-visible:ring-lime/30',
  solid:
    'border border-white/[0.08] bg-surface-container text-on-surface hover:bg-surface-container-high focus-visible:ring-lime/30',
  lime:
    'border border-lime/25 bg-lime/10 text-lime hover:bg-lime/15 focus-visible:ring-lime/35',
  danger:
    'border border-error/25 bg-error-container text-on-error-container hover:border-error/40 focus-visible:ring-error/30',
  plain:
    'text-on-surface-variant hover:bg-white/[0.05] hover:text-on-surface focus-visible:ring-lime/30',
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'h-11 w-11 rounded-xl',
  md: 'h-11 w-11 rounded-xl',
  lg: 'h-12 w-12 rounded-xl',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    className,
    icon,
    label,
    variant = 'ghost',
    size = 'md',
    loading = false,
    disabled,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
        'disabled:pointer-events-none disabled:opacity-45',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});
