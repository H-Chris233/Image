import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from './cx';

type ButtonVariant = 'primary' | 'ghost' | 'lime' | 'orange' | 'danger' | 'plain';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
};

type NativeButtonProps = ButtonOwnProps & ButtonHTMLAttributes<HTMLButtonElement> & {
  as?: 'button';
};

type AnchorButtonProps = ButtonOwnProps & AnchorHTMLAttributes<HTMLAnchorElement> & {
  as: 'a';
  disabled?: boolean;
};

export type ButtonProps = NativeButtonProps | AnchorButtonProps;

const variantClasses: Record<ButtonVariant, string> = {
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

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-11 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(
  {
    as = 'button',
    className,
    variant = 'primary',
    size = 'md',
    iconStart,
    iconEnd,
    loading = false,
    fullWidth = false,
    disabled,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const content = (
    <>
      {loading ? <Loader2 size={15} className="shrink-0 animate-spin" aria-hidden="true" /> : iconStart}
      {children ? <span className="min-w-0 truncate">{children}</span> : null}
      {!loading ? iconEnd : null}
    </>
  );
  const buttonClassName = cx(
    'inline-flex min-w-0 items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
    'disabled:pointer-events-none disabled:opacity-45',
    (disabled || loading) && as === 'a' && 'pointer-events-none opacity-45',
    sizeClasses[size],
    variantClasses[variant],
    fullWidth && 'w-full',
    className,
  );

  if (as === 'a') {
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        aria-disabled={disabled || loading || undefined}
        className={buttonClassName}
        {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonClassName}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
});
