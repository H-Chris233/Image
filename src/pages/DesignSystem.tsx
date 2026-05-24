import { useState } from 'react';
import {
  ArrowUp,
  Bell,
  Check,
  Download,
  ImagePlus,
  MoreHorizontal,
  RefreshCw,
  Settings2,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  Button,
  IconButton,
  SegmentedControl,
  SelectField,
  SkeletonBlock,
  StatusPill,
  Surface,
  SurfaceState,
  TextareaField,
  TextInput,
} from '../components/design-system';
import brandMark from '../../aethergenix.svg';

const colorTokens = [
  { name: 'background', value: '#111110', usage: 'app canvas' },
  { name: 'surface', value: '#1a1917', usage: 'cards, dialogs' },
  { name: 'surface-container', value: '#242220', usage: 'raised groups' },
  { name: 'surface-container-high', value: '#2e2c29', usage: 'hover, active layer' },
  { name: 'on-surface', value: '#f0ede8', usage: 'primary text' },
  { name: 'on-surface-variant', value: '#8a8680', usage: 'secondary text' },
  { name: 'lime', value: '#E3FF74', usage: 'running, selected, focus' },
  { name: 'orange', value: '#fe6e00', usage: 'commercial CTA' },
  { name: 'success', value: '#4ade80', usage: 'completed state' },
  { name: 'error', value: '#ff6b6b', usage: 'failed state' },
];

const spacingTokens = [
  ['icon button', 'h-11 w-11'],
  ['input', 'h-11'],
  ['primary action', 'h-11'],
  ['surface padding', 'p-4 / p-6'],
  ['page gutter', 'px-4 -> container'],
  ['card gap', 'gap-3 / gap-5'],
];

const statusRows = [
  { tone: 'queued' as const, label: 'queued' },
  { tone: 'running' as const, label: 'running' },
  { tone: 'success' as const, label: 'succeeded' },
  { tone: 'error' as const, label: 'failed' },
  { tone: 'commercial' as const, label: 'commercial' },
];

export default function DesignSystem() {
  const [mode, setMode] = useState<'general' | 'commerce'>('general');

  return (
    <div data-design-system-preview className="min-h-[calc(100vh-64px)] px-4 py-6 text-on-surface sm:py-8 lg:py-10">
      <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 space-y-6">
          <header className="grid gap-4 rounded-2xl border border-white/[0.07] bg-[#151411] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.32)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/10 px-3 py-1 text-xs font-medium text-lime">
                <Sparkles size={13} />
                Warm Charcoal UI
              </div>
              <h1 className="font-display text-2xl font-bold leading-tight text-on-surface sm:text-3xl">
                AetherGenix Design System v1
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
                Shared tokens, primitives, and AI image workflow patterns for the product workbench.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button variant="ghost" size="sm" iconStart={<Settings2 size={14} />}>Inspect</Button>
              <Button size="sm" iconStart={<ArrowUp size={14} />}>Generate</Button>
            </div>
          </header>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <Surface padding="lg" className="min-w-0">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-on-surface">Color roles</h2>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">Semantic roles first, raw color last.</p>
                </div>
                <StatusPill tone="running">source tokens</StatusPill>
              </div>
              <div className="grid gap-2 2xl:grid-cols-2">
                {colorTokens.map((token) => (
                  <div key={token.name} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5">
                    <div className="h-12 rounded-lg border border-white/[0.08]" style={{ backgroundColor: token.value }} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-5 text-on-surface">{token.name}</div>
                      <p className="mt-1 text-xs leading-4 text-on-surface-variant">{token.usage}</p>
                    </div>
                    <code className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant">
                      {token.value}
                    </code>
                  </div>
                ))}
              </div>
            </Surface>

            <Surface padding="none" className="overflow-hidden">
              <div className="relative min-h-[360px] overflow-hidden bg-[#111110]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(227,255,116,0.16),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(254,110,0,0.18),transparent_28%),linear-gradient(145deg,#1a1917,#0d0d0b)]" />
                <div className="relative flex min-h-[360px] flex-col justify-between p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <img src={brandMark} alt="" className="h-8 w-8 rounded-xl" />
                      <div>
                        <div className="font-display text-sm font-semibold text-on-surface">Image workbench</div>
                        <div className="text-xs text-on-surface-variant">Preview composition</div>
                      </div>
                    </div>
                    <StatusPill tone="success" size="sm">ready</StatusPill>
                  </div>

                  <div className="mx-auto flex aspect-[4/5] w-full max-w-[240px] flex-col justify-end overflow-hidden rounded-2xl border border-white/[0.08] bg-[#242220] shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
                    <div className="flex-1 bg-[radial-gradient(circle_at_48%_30%,rgba(240,237,232,0.76),rgba(240,237,232,0.18)_32%,transparent_50%),linear-gradient(160deg,rgba(254,110,0,0.2),rgba(227,255,116,0.1)_48%,rgba(17,17,16,1))]" />
                    <div className="border-t border-white/[0.08] bg-black/35 p-3 backdrop-blur-sm">
                      <div className="text-xs font-semibold text-on-surface">Product hero frame</div>
                      <div className="mt-1 text-[11px] leading-4 text-on-surface-variant">Image remains the visual subject; controls stay quiet.</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <IconButton label="Upload image" icon={<UploadCloud size={16} />} />
                    <IconButton label="Refresh output" icon={<RefreshCw size={16} />} variant="lime" />
                    <IconButton label="More actions" icon={<MoreHorizontal size={16} />} />
                  </div>
                </div>
              </div>
            </Surface>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Surface padding="lg">
              <h2 className="font-display text-lg font-semibold text-on-surface">Actions</h2>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">Cream for primary work, lime for state, orange for commercial intent.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button iconStart={<ArrowUp size={15} />}>Generate image</Button>
                <Button variant="ghost" iconStart={<Download size={15} />}>Download</Button>
                <Button variant="lime" iconStart={<Check size={15} />}>Selected</Button>
                <Button variant="orange">Recharge</Button>
                <Button variant="danger" iconStart={<Trash2 size={15} />}>Delete</Button>
              </div>
              <div className="mt-5 grid grid-cols-5 gap-2 sm:max-w-sm">
                <IconButton label="Add reference" icon={<ImagePlus size={16} />} />
                <IconButton label="Notifications" icon={<Bell size={16} />} variant="solid" />
                <IconButton label="Generate state" icon={<Sparkles size={16} />} variant="lime" />
                <IconButton label="Settings" icon={<Settings2 size={16} />} variant="plain" />
                <IconButton label="Delete item" icon={<Trash2 size={16} />} variant="danger" />
              </div>
            </Surface>

            <Surface padding="lg">
              <h2 className="font-display text-lg font-semibold text-on-surface">Status language</h2>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">One badge system for queues, generation, success, failures, and billing.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {statusRows.map((row) => (
                  <span key={row.tone}>
                    <StatusPill tone={row.tone}>{row.label}</StatusPill>
                  </span>
                ))}
              </div>
              <div className="mt-5 grid gap-3">
                <SkeletonBlock className="h-24" />
                <SkeletonBlock lines={3} />
              </div>
            </Surface>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Surface padding="lg">
              <h2 className="font-display text-lg font-semibold text-on-surface">Form controls</h2>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">Compact inputs for production workflows, with visible lime focus.</p>
              <div className="mt-4 grid gap-4">
                <SegmentedControl
                  label="Generation mode"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'general', label: 'General', description: 'creative' },
                    { value: 'commerce', label: 'Commerce', description: 'product' },
                  ]}
                />
                <TextInput label="Campaign name" placeholder="Spring launch set" />
                <SelectField
                  label="Aspect ratio"
                  defaultValue="1:1"
                  options={[
                    { label: '1:1 Square', value: '1:1' },
                    { label: '4:5 Product card', value: '4:5' },
                    { label: '16:9 Scene banner', value: '16:9' },
                  ]}
                />
                <TextareaField
                  label="Prompt"
                  placeholder="Describe the product, scene, lighting, and commercial intent..."
                  helpText="Generated output must keep product visibility higher than decorative UI."
                />
              </div>
            </Surface>

            <div className="grid gap-4">
              <SurfaceState
                kind="empty"
                title="No reference image yet"
                description="Use a dashed warm surface for upload, empty, and waiting states. Keep the next action singular."
                action={{ label: 'Upload reference' }}
              />
              <SurfaceState
                kind="error"
                title="Generation failed"
                description="Errors use red semantics, not commercial orange. Provide a recoverable action."
                action={{ label: 'Retry' }}
                secondaryAction={{ label: 'Open task log' }}
              />
            </div>
          </section>
        </main>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Surface padding="lg">
            <h2 className="font-display text-lg font-semibold text-on-surface">System map</h2>
            <div className="mt-4 grid gap-3">
              {[
                ['Canonical spec', 'src/design-system/design.md'],
                ['Static preview', 'src/design-system/preview/index.html'],
                ['Tokens', 'src/index.css implements the static spec'],
                ['Primitives', 'src/components/design-system/'],
                ['React preview', '/design-system'],
                ['Gates', 'lint, build, check:brand, smoke:design-system'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                  <div className="text-xs font-medium text-on-surface-variant">{label}</div>
                  <div className="mt-1 break-words font-mono text-xs leading-5 text-on-surface">{value}</div>
                </div>
              ))}
            </div>
          </Surface>

          <Surface padding="lg" tone="subtle">
            <h2 className="font-display text-lg font-semibold text-on-surface">Spacing scale</h2>
            <div className="mt-4 grid gap-2">
              {spacingTokens.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-2 last:border-b-0">
                  <span className="text-sm text-on-surface-variant">{label}</span>
                  <code className="rounded bg-black/20 px-2 py-1 font-mono text-xs text-on-surface">{value}</code>
                </div>
              ))}
            </div>
          </Surface>

          <Surface padding="lg" tone="orange">
            <h2 className="font-display text-lg font-semibold text-on-surface">Guardrails</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
              <li>Do not add cyan/violet primary gradients.</li>
              <li>Do not copy patterns from inactive legacy routes.</li>
              <li>Do not make lime a large background field.</li>
              <li>Do keep image content visually dominant.</li>
            </ul>
          </Surface>
        </aside>
      </div>
    </div>
  );
}
