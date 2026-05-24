import { cx } from './cx';

export type SkeletonBlockProps = {
  className?: string;
  lines?: number;
};

export function SkeletonBlock({ className, lines }: SkeletonBlockProps) {
  if (lines && lines > 1) {
    return (
      <div className={cx('grid gap-2', className)} aria-hidden="true">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cx(
              'h-3 rounded-full bg-white/[0.05] animate-skeleton',
              index === lines - 1 && 'w-2/3',
            )}
          />
        ))}
      </div>
    );
  }

  return <div className={cx('animate-skeleton rounded-xl bg-white/[0.05]', className)} aria-hidden="true" />;
}
