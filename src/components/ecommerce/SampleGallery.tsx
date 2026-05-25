/** Static sample gallery shown in empty states so users know what to expect */

interface SampleCard {
  emoji: string;
  label: string;
  gradient: string;
}

const SAMPLES: SampleCard[] = [
  {
    emoji: '☕',
    label: '咖啡·白底',
    gradient: 'linear-gradient(135deg, #f5f0eb 0%, #e8e2db 100%)',
  },
  {
    emoji: '👟',
    label: '球鞋·渐变',
    gradient: 'linear-gradient(135deg, #dce8f8 0%, #ede6f8 100%)',
  },
  {
    emoji: '🌿',
    label: '护肤·自然',
    gradient: 'linear-gradient(135deg, #1a4a2e 0%, #52c875 100%)',
  },
  {
    emoji: '🎁',
    label: '礼盒·节日',
    gradient: 'linear-gradient(135deg, #6b1200 0%, #ff8c00 100%)',
  },
  {
    emoji: '💡',
    label: '灯具·商业',
    gradient: 'linear-gradient(135deg, #0d0d0b 0%, #242220 55%, #E3FF74 100%)',
  },
  {
    emoji: '🛋',
    label: '家居·室内',
    gradient: 'linear-gradient(135deg, #3d2a20 0%, #9a7055 100%)',
  },
];

interface SampleGalleryProps {
  /** headline shown above the grid */
  title?: string;
  /** supporting text below the title */
  subtitle?: string;
}

export function SampleGallery({ title = '已生成场景图效果', subtitle = '上传商品图，一键生成专业场景图' }: SampleGalleryProps) {
  return (
    <div className="w-full">
      {title && (
        <div className="mb-3 flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-white/50">{title}</span>
          {subtitle && <span className="text-[10px] text-white/30">{subtitle}</span>}
        </div>
      )}
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {SAMPLES.map((sample) => (
          <div
            key={sample.label}
            className="flex flex-col items-center gap-1.5 overflow-hidden rounded-lg"
            style={{ background: sample.gradient }}
          >
            <div className="flex aspect-square w-full items-center justify-center text-2xl">{sample.emoji}</div>
            <span
              className="w-full truncate px-1.5 pb-1.5 text-center text-[9px] font-semibold"
              style={{ color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
            >
              {sample.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
