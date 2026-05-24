import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

type PressableVariant = 'plain' | 'surface' | 'danger';

export type PressableProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: PressableVariant;
};

const variantClasses: Record<PressableVariant, string> = {
  plain: '',
  surface: 'rounded-lg border border-white/[0.08] bg-white/[0.035] text-on-surface hover:bg-white/[0.07]',
  danger: 'rounded-lg border border-error/25 bg-error-container text-on-error-container hover:border-error/40',
};

export const Pressable = forwardRef<HTMLButtonElement, PressableProps>(function Pressable(
  { className, variant = 'plain', type = 'button', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/35',
        'disabled:pointer-events-none disabled:opacity-45',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
