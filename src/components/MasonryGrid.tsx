import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type MasonryGridProps<T> = {
  items: T[];
  getKey: (item: T, index: number) => string;
  getEstimatedHeight?: (item: T, index: number) => number;
  mobileColumns?: 1 | 2;
  renderItem: (item: T, index: number) => ReactNode;
};

function getColumnCount(mobileColumns: 1 | 2) {
  if (typeof window === 'undefined') return 1;
  if (window.matchMedia('(min-width: 1280px)').matches) return 4;
  if (window.matchMedia('(min-width: 1024px)').matches) return 3;
  if (window.matchMedia('(min-width: 640px)').matches) return 2;
  return mobileColumns;
}

export default function MasonryGrid<T>({ items, getKey, getEstimatedHeight, mobileColumns = 1, renderItem }: MasonryGridProps<T>) {
  const [columnCount, setColumnCount] = useState(() => getColumnCount(mobileColumns));

  useEffect(() => {
    const updateColumnCount = () => setColumnCount(getColumnCount(mobileColumns));
    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, [mobileColumns]);

  const columns = useMemo(() => {
    const nextColumns: Array<Array<{ item: T; index: number }>> = Array.from({ length: columnCount }, () => []);
    const columnHeights = Array.from({ length: columnCount }, () => 0);

    items.forEach((item, index) => {
      const shortestColumnIndex = columnHeights.reduce(
        (shortestIndex, height, currentIndex) => (height < columnHeights[shortestIndex] ? currentIndex : shortestIndex),
        0,
      );

      nextColumns[shortestColumnIndex].push({ item, index });
      columnHeights[shortestColumnIndex] += Math.max(1, getEstimatedHeight?.(item, index) ?? 1);
    });

    return nextColumns;
  }, [columnCount, getEstimatedHeight, items]);

  return (
    <div className={mobileColumns === 2 ? 'grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4' : 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}>
      {columns.map((column, columnIndex) => (
        <div className="flex min-w-0 flex-col gap-6" key={columnIndex}>
          {column.map(({ item, index }) => (
            <div key={getKey(item, index)}>{renderItem(item, index)}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
