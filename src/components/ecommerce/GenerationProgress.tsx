import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, X } from 'lucide-react';

interface Stage {
  id: string;
  label: string;
  duration: number;
}

const STAGES: Stage[] = [
  { id: 'identify', label: '商品识别', duration: 1800 },
  { id: 'compose', label: '场景构建', duration: 2400 },
  { id: 'render', label: '精细渲染', duration: 99999 },
];

const TIMEOUT_SECONDS = 60;
const CANCEL_VISIBLE_AFTER = 5;

interface GenerationProgressProps {
  active: boolean;
  onCancel?: () => void;
}

export function GenerationProgress({ active, onCancel }: GenerationProgressProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setStageIndex(0);
      setElapsed(0);
      startTimeRef.current = null;
      return;
    }
    setStageIndex(0);
    setElapsed(0);
    startTimeRef.current = Date.now();

    let current = 0;
    const stageTimers: ReturnType<typeof setTimeout>[] = [];

    function advance() {
      if (current >= STAGES.length - 1) return;
      const delay = STAGES[current].duration;
      const t = setTimeout(() => {
        current += 1;
        setStageIndex(current);
        advance();
      }, delay);
      stageTimers.push(t);
    }
    advance();

    const tickInterval = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    return () => {
      stageTimers.forEach(clearTimeout);
      clearInterval(tickInterval);
    };
  }, [active]);

  if (!active) return null;

  const timedOut = elapsed >= TIMEOUT_SECONDS;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {STAGES.map((stage, i) => {
          const isDone = i < stageIndex;
          const isActive = i === stageIndex;
          return (
            <div key={stage.id} className="flex items-center gap-1.5">
              <span
                className="flex items-center gap-1 text-[10px] font-semibold transition-colors duration-300"
                style={{
                  color: isDone
                    ? 'var(--ag-lime)'
                    : isActive
                      ? 'rgba(240,237,232,0.9)'
                      : 'rgba(240,237,232,0.3)',
                }}
              >
                {isDone ? (
                  <CheckCircle2 size={11} style={{ color: 'var(--ag-lime)' }} />
                ) : isActive ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: 'rgba(240,237,232,0.2)' }}
                  />
                )}
                {stage.label}
              </span>
              {i < STAGES.length - 1 && (
                <span
                  className="text-[8px]"
                  style={{ color: isDone ? 'var(--ag-lime)' : 'rgba(255,255,255,0.15)' }}
                >
                  →
                </span>
              )}
            </div>
          );
        })}
        {timedOut && (
          <span className="text-[10px]" style={{ color: 'rgba(255,165,80,0.8)' }}>
            队列中，请稍候…
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {elapsed > CANCEL_VISIBLE_AFTER && (
          <span className="tabular-nums text-[9px]" style={{ color: 'rgba(240,237,232,0.3)' }}>
            {elapsed}s
          </span>
        )}
        {onCancel && elapsed > CANCEL_VISIBLE_AFTER && (
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center transition-colors hover:text-red-400"
            style={{ color: 'rgba(240,237,232,0.4)' }}
            onClick={onCancel}
            title="取消生成"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
