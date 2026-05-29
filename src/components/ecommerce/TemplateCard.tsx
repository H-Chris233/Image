import { Sparkles } from 'lucide-react';
import type { EcommerceRecommendedPlan, InspirationItem, RecommendedTemplate } from '../../api';
import { Pressable } from '../design-system';

export type TemplateCandidate = (RecommendedTemplate | EcommerceRecommendedPlan | InspirationItem) & {
  id?: string;
  name?: string;
  title?: string;
  prompt?: string;
  description?: string;
  default_aspect_ratio?: string;
  image_url?: string | null;
  thumbnail_url?: string | null;
};

export function templateName(template: TemplateCandidate) {
  return ('title' in template && template.title) || ('name' in template && template.name) || template.id || 'Benchmark template';
}

export function templatePrompt(template: TemplateCandidate) {
  const templateScreens = 'screens' in template && Array.isArray(template.screens) ? template.screens : [];
  const screens = templateScreens
    .map((screen, index) =>
      [
        `${index + 1}. ${screen.title}`,
        screen.visual_goal,
        screen.copy,
        'prompt' in screen && typeof screen.prompt === 'string' ? screen.prompt : '',
      ]
        .filter(Boolean)
        .join(' - '),
    )
    .filter(Boolean)
    .join('\n');

  return (
    ('prompt' in template ? template.prompt : '') ||
    ('extra_requirements' in template ? template.extra_requirements : '') ||
    template.description ||
    ('curator_note' in template ? template.curator_note : '') ||
    ('reason' in template ? template.reason : '') ||
    ('style' in template ? template.style : '') ||
    screens ||
    templateName(template)
  );
}

export function templateAspectRatio(template: TemplateCandidate) {
  return ('default_aspect_ratio' in template && template.default_aspect_ratio) || '1:1';
}

export function TemplateCard({
  template,
  selected = false,
  disabled = false,
  onClick,
  actionLabel,
  className = '',
}: {
  key?: string;
  template: TemplateCandidate;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  actionLabel?: string;
  className?: string;
}) {
  const imageUrl = ('image_url' in template ? template.image_url : '') || template.thumbnail_url || '';
  const name = templateName(template);
  const summary =
    ('curator_note' in template ? template.curator_note : '') ||
    ('reason' in template ? template.reason : '') ||
    template.description ||
    ('style' in template ? template.style : '') ||
    templatePrompt(template);
  const screens = 'screens' in template && Array.isArray(template.screens) ? template.screens : [];
  const imageCount = 'image_count' in template ? template.image_count : 1;
  const platform = 'platform' in template ? template.platform : '';
  const style = 'style' in template ? template.style : '';
  const styleTags = 'style_tags' in template && Array.isArray(template.style_tags) ? template.style_tags : [];

  return (
    <Pressable
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={`group flex min-h-[220px] min-w-0 flex-col overflow-hidden rounded-xl border bg-[#111110] text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E3FF74]/40 hover:bg-[#171613] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35 disabled:pointer-events-none disabled:opacity-55 ${
        selected
          ? 'border-[#E3FF74]/70 shadow-[0_0_0_1px_rgba(227,255,116,0.25)]'
          : 'border-white/[0.08]'
      } ${className}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-20 w-full items-center justify-center border-b border-white/[0.06] bg-[#1a1917] text-[#E3FF74]">
          <Sparkles size={20} aria-hidden="true" />
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 break-words text-sm font-semibold leading-5 text-[#f0ede8] [overflow-wrap:anywhere]">
            {name}
          </h3>
          <span className="shrink-0 rounded-full border border-[#E3FF74]/20 bg-[#E3FF74]/10 px-2 py-0.5 text-[10px] font-semibold text-[#E3FF74]">
            x{Math.max(1, imageCount || 1)}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-[#8a8680] [overflow-wrap:anywhere]">
          {summary}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold text-[#8a8680]">
          {platform ? <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5">{platform}</span> : null}
          {style ? <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5">{style}</span> : null}
          {styleTags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5">{tag}</span>
          ))}
          {template.default_aspect_ratio ? <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5">{template.default_aspect_ratio}</span> : null}
        </div>
        {screens.length > 0 ? (
          <div className="mt-3 grid gap-1.5">
            {screens.slice(0, 3).map((screen, index) => (
              <div key={`${name}-${screen.title}-${index}`} className="min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1.5">
                <div className="truncate text-[11px] font-semibold text-[#E3FF74]">
                  {index + 1}. {screen.title}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-[#8a8680]">{screen.visual_goal || screen.copy}</div>
              </div>
            ))}
          </div>
        ) : null}
        {actionLabel ? (
          <div className="mt-auto pt-3 text-center text-[11px] font-semibold text-[#E3FF74]">{actionLabel}</div>
        ) : null}
      </div>
    </Pressable>
  );
}
