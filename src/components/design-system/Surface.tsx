import { createElement, forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

type SurfaceTone = 'default' | 'raised' | 'subtle' | 'dashed' | 'lime' | 'orange' | 'danger';
type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';
type SurfaceElement = 'section' | 'article' | 'div' | 'aside' | 'header' | 'footer';

export type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: SurfaceElement;
  tone?: SurfaceTone;
  padding?: SurfacePadding;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
};

const toneClasses: Record<SurfaceTone, string> = {
  default: 'border-white/[0.07] bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.28)]',
  raised: 'border-white/[0.08] bg-surface-container shadow-[0_14px_44px_rgba(0,0,0,0.36)]',
  subtle: 'border-white/[0.06] bg-white/[0.03]',
  dashed: 'border-dashed border-white/[0.12] bg-white/[0.025]',
  lime: 'border-lime/20 bg-lime/[0.06] shadow-[0_0_0_1px_rgba(227,255,116,0.03)]',
  orange: 'border-secondary/24 bg-secondary/[0.08]',
  danger: 'border-error/25 bg-error-container',
};

const paddingClasses: Record<SurfacePadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5 sm:p-6',
};

export const Surface = forwardRef<HTMLElement, SurfaceProps>(function Surface({
  as = 'section',
  tone = 'default',
  padding = 'md',
  interactive = false,
  className,
  children,
  ...props
}, ref) {
  return createElement(
    as,
    {
      ref,
      className: cx(
        'rounded-2xl border',
        toneClasses[tone],
        paddingClasses[padding],
        interactive && 'transition-colors duration-150 hover:border-white/[0.12] hover:bg-surface-container',
        className,
      ),
      ...props,
    },
    children,
  );
});
