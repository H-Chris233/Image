import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface Stage {
  id: string;
  label: string;
  duration: number; // ms to hold this stage before advancing
}

const STAGES: Stage[] = [
  { id: 'identify', label: '商品识别', duration: 1800 },
  { id: 'compose', label: '场景构建', duration: 2400 },
  { id: 'render', label: '精细渲染', duration: 99999 }, // stays until done
];

interface GenerationProgressProps {
  /** Pass true while the submit API call is in-flight */
  active: boolean;
}

export function GenerationProgress({ active }: GenerationProgressProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setStageIndex(0);
      return;
    }
    setStageIndex(0);
    let current = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function advance() {
      if (current >= STAGES.length - 1) return;
      const delay = STAGES[current].duration;
      const t = setTimeout(() => {
        current += 1;
        setStageIndex(current);
        advance();
      }, delay);
      timers.push(t);
    }
    advance();
    return () => timers.forEach(clearTimeout);
  }, [active]);

  if (!active) return null;

  return (
    <div className="flex items-center gap-3">
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
    </div>
  );
}
