import { useEffect, useState } from 'react';
import { getHistory } from '../../api';
import { uniqueHistoryImages } from './historyImageAdapter';
import type { UserImage } from './historyTypes';

export function useHistoryImages() {
  const [images, setImages] = useState<UserImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadHistoryImages() {
      setLoading(true);
      setError('');
      try {
        const response = await getHistory({ limit: 36, ecommerce_only: true });
        if (!cancelled) setImages(uniqueHistoryImages(response.items));
      } catch {
        if (!cancelled) {
          setImages([]);
          setError('历史图片暂时不可用');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadHistoryImages();
    return () => {
      cancelled = true;
    };
  }, []);

  return { images, loading, error };
}
