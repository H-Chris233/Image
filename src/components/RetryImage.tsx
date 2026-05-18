import { ImageOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { useSite } from '../site';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  variant?: 'default' | 'gallery';
};

const RETRY_DELAYS = [1000, 2500, 5000];

function retrySrc(src: string, attempt: number) {
  if (attempt <= 0 || src.startsWith('blob:') || src.startsWith('data:')) {
    return src;
  }
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}retry=${attempt}`;
}

export default function RetryImage({ src, alt = '', className = '', onError, onLoad, variant = 'default', ...props }: Props) {
  const { t } = useSite();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAttempt(0);
    setFailed(!src);
    setLoaded(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={`flex min-h-24 flex-col items-center justify-center gap-2 border border-[#E3FF74]/15 bg-[#14120f] p-3 text-center text-[#f0ede8]/65 ${className}`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E3FF74]/20 bg-[#E3FF74]/10">
          <ImageOff size={17} className="text-[#E3FF74]/75" />
        </div>
        <div className="text-xs font-medium">{t('image_load_failed')}</div>
        {src ? (
          <button
            className="flex h-8 items-center gap-2 rounded-full border border-[#E3FF74]/25 bg-[#E3FF74]/10 px-3 text-xs font-semibold text-[#E3FF74] transition-colors hover:bg-[#E3FF74]/15"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setFailed(false);
              setLoaded(false);
              setAttempt((current) => current + 1);
            }}
          >
            <RefreshCw size={12} />
            {t('image_retry')}
          </button>
        ) : null}
      </div>
    );
  }

  const image = (
    <img
      {...props}
      alt={alt}
      className={variant === 'gallery' ? 'h-full w-full object-cover transition-opacity duration-300' : className}
      src={retrySrc(src, attempt)}
      onLoad={(event) => {
        setFailed(false);
        setLoaded(true);
        onLoad?.(event);
      }}
      onError={(event) => {
        onError?.(event);
        setLoaded(false);
        if (attempt < RETRY_DELAYS.length) {
          window.setTimeout(() => setAttempt((current) => current + 1), RETRY_DELAYS[attempt]);
          return;
        }
        setFailed(true);
      }}
    />
  );

  if (variant !== 'gallery') {
    return image;
  }

  return (
    <span className={`relative block overflow-hidden bg-[#14120f] ${className}`}>
      {!loaded ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(110deg,rgba(240,237,232,0.05),rgba(227,255,116,0.16),rgba(240,237,232,0.05))] bg-[length:220%_100%] animate-pulse"
        />
      ) : null}
      <span className={`block h-full w-full transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
        {image}
      </span>
    </span>
  );
}
