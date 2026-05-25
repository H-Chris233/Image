import { useEffect, useRef, useState } from 'react';
import { Download, ImagePlus, Loader2 } from 'lucide-react';

type WatermarkPosition = 'bottom-right' | 'bottom-left' | 'bottom-center';

interface WatermarkEditorProps {
  imageUrl: string;
  onError: (err: unknown) => void;
}

const POSITION_LABELS: Record<WatermarkPosition, string> = {
  'bottom-right': '右下',
  'bottom-left': '左下',
  'bottom-center': '居中',
};

export function WatermarkEditor({ imageUrl, onError }: WatermarkEditorProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [position, setPosition] = useState<WatermarkPosition>('bottom-right');
  const [opacity, setOpacity] = useState(0.6);
  const [scale, setScale] = useState(0.15);
  const [compositing, setCompositing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!logoFile) { setLogoSrc(null); return; }
    const url = URL.createObjectURL(logoFile);
    setLogoSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  async function handleDownload() {
    if (!logoSrc || compositing) return;
    setCompositing(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const [bgImg, logoImg] = await Promise.all([
        loadImage(imageUrl),
        loadImage(logoSrc),
      ]);

      canvas.width = bgImg.naturalWidth;
      canvas.height = bgImg.naturalHeight;
      ctx.drawImage(bgImg, 0, 0);

      const logoW = canvas.width * scale;
      const logoH = (logoImg.naturalHeight / logoImg.naturalWidth) * logoW;
      const padding = canvas.width * 0.03;

      let x = 0;
      let y = canvas.height - logoH - padding;
      if (position === 'bottom-right') {
        x = canvas.width - logoW - padding;
      } else if (position === 'bottom-left') {
        x = padding;
      } else {
        x = (canvas.width - logoW) / 2;
      }

      ctx.globalAlpha = opacity;
      ctx.drawImage(logoImg, x, y, logoW, logoH);
      ctx.globalAlpha = 1;

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'watermarked.png';
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      onError(err);
    } finally {
      setCompositing(false);
    }
  }

  return (
    <div className="border border-white/10 bg-black/40 p-3">
      <div className="mb-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ag-lime)' }}>
        品牌水印
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-col gap-3">
        {/* Logo upload */}
        <div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="flex h-8 items-center gap-2 border border-white/15 px-3 text-[10px] uppercase tracking-widest text-white/55 hover:border-primary hover:text-primary"
            onClick={() => logoInputRef.current?.click()}
          >
            <ImagePlus size={12} />
            {logoFile ? logoFile.name : '上传 Logo'}
          </button>
        </div>

        {logoSrc && (
          <>
            {/* Position */}
            <div>
              <div className="mb-1 text-[9px] uppercase tracking-widest text-white/35">位置</div>
              <div className="flex gap-1.5">
                {(Object.keys(POSITION_LABELS) as WatermarkPosition[]).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    className="h-7 flex-1 border text-[9px] uppercase tracking-widest transition-colors"
                    style={{
                      borderColor: position === pos ? 'var(--ag-lime)' : 'rgba(255,255,255,0.12)',
                      color: position === pos ? 'var(--ag-lime)' : 'rgba(240,237,232,0.45)',
                      background: position === pos ? 'rgba(227,255,116,0.06)' : 'transparent',
                    }}
                    onClick={() => setPosition(pos)}
                  >
                    {POSITION_LABELS[pos]}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity */}
            <label className="block">
              <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-widest text-white/35">
                <span>不透明度</span>
                <span>{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={Math.round(opacity * 100)}
                onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                className="w-full accent-[#E3FF74]"
              />
            </label>

            {/* Scale */}
            <label className="block">
              <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-widest text-white/35">
                <span>大小</span>
                <span>{Math.round(scale * 100)}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={Math.round(scale * 100)}
                onChange={(e) => setScale(Number(e.target.value) / 100)}
                className="w-full accent-[#E3FF74]"
              />
            </label>

            <button
              type="button"
              className="flex h-9 items-center justify-center gap-2 bg-primary text-[11px] font-black uppercase tracking-widest text-black hover:bg-white disabled:opacity-50"
              disabled={compositing}
              onClick={() => void handleDownload()}
            >
              {compositing ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {compositing ? '合成中…' : '导出带水印图片'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
