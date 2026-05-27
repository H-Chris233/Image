import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const files = {
  agents: resolve(root, 'AGENTS.md'),
  app: resolve(root, 'src/App.tsx'),
  canonical: resolve(root, 'src/design-system/design.md'),
  staticPreview: resolve(root, 'src/design-system/preview/index.html'),
  page: resolve(root, 'src/pages/DesignSystem.tsx'),
  index: resolve(root, 'src/components/design-system/index.ts'),
  docs: resolve(root, 'docs/design-system/README.md'),
  tokens: resolve(root, 'docs/design-system/tokens.md'),
  components: resolve(root, 'docs/design-system/components.md'),
  patterns: resolve(root, 'docs/design-system/patterns.md'),
  scale: resolve(root, 'docs/design-system/scale-alignment.md'),
};

const [agents, app, canonical, staticPreview, page, index, docs, tokens, components, patterns, scale] = await Promise.all([
  readFile(files.agents, 'utf8'),
  readFile(files.app, 'utf8'),
  readFile(files.canonical, 'utf8'),
  readFile(files.staticPreview, 'utf8'),
  readFile(files.page, 'utf8'),
  readFile(files.index, 'utf8'),
  readFile(files.docs, 'utf8'),
  readFile(files.tokens, 'utf8'),
  readFile(files.components, 'utf8'),
  readFile(files.patterns, 'utf8'),
  readFile(files.scale, 'utf8'),
]);

const required = [
  [agents.includes('src/design-system/design.md'), 'AGENTS.md must point to the canonical static design spec'],
  [agents.includes('src/design-system/preview/index.html'), 'AGENTS.md must point to the canonical static preview'],
  [canonical.includes('Canonical source of truth for AetherGenix Image frontend UI.'), 'canonical design.md must identify itself as source of truth'],
  [canonical.includes('## Product UI Posture'), 'canonical design.md must include product UI posture'],
  [canonical.includes('## Design Variables'), 'canonical design.md must include design variables'],
  [canonical.includes('## Component System'), 'canonical design.md must include component system rules'],
  [canonical.includes('## Page Layout Rules'), 'canonical design.md must include page layout rules'],
  [canonical.includes('## Responsive Rules'), 'canonical design.md must include responsive rules'],
  [canonical.includes('## Accessibility Rules'), 'canonical design.md must include accessibility rules'],
  [canonical.includes('## Reuse Rules'), 'canonical design.md must include reuse rules'],
  [canonical.includes('## Preview Rules'), 'canonical design.md must include preview rules'],
  [canonical.includes('## Verification Rules'), 'canonical design.md must include verification rules'],
  [staticPreview.includes('data-static-design-system-preview'), 'static preview must expose the static preview marker'],
  [staticPreview.includes('--color-background: #111110'), 'static preview must define warm charcoal background token'],
  [staticPreview.includes('Cream for primary work'), 'static preview must show button semantics'],
  [!/\bfont-size:\s*clamp\([^)]*vw/i.test(staticPreview), 'static preview must not scale font size with viewport width'],
  [staticPreview.includes('prefers-reduced-motion: reduce'), 'static preview must include reduced-motion behavior'],
  [app.includes('path="/design-system"'), 'App.tsx must register /design-system'],
  [page.includes('data-design-system-preview'), 'DesignSystem page must expose the preview marker'],
  [index.includes("export { Button }"), 'design-system index must export Button'],
  [index.includes("export { Pressable }"), 'design-system index must export Pressable for custom interactive surfaces'],
  [index.includes('TextInputControl'), 'design-system index must export low-level form controls'],
  [index.includes("export { SurfaceState }"), 'design-system index must export SurfaceState'],
  [docs.includes('src/design-system/design.md'), 'design-system README must point to canonical static spec'],
  [docs.includes('src/design-system/preview/index.html'), 'design-system README must point to canonical static preview'],
  [tokens.includes('Canonical source: `src/design-system/design.md`'), 'tokens.md must point to canonical static spec'],
  [tokens.includes('compatibility-only'), 'tokens.md must mark legacy utilities as compatibility-only'],
  [patterns.includes('## Raw Value Exceptions'), 'patterns.md must include raw value exception rules'],
  [patterns.includes('## Hardcoding Prevention'), 'patterns.md must include hardcoding prevention rules'],
  [patterns.includes('## Page Pattern Coverage'), 'patterns.md must include the route-to-pattern coverage map'],
  [components.includes('## Dialog / Drawer Accessibility Contract'), 'components.md must include the dialog/drawer accessibility contract'],
  [scale.includes('L0: 尽早防住设计债务'), 'scale-alignment.md must stay focused on design-system governance'],
];

const banned = [
  'gradient-genesis',
  'text-gradient-genesis',
  '#00D4F0',
  '#8B5CF6',
  'cyan-violet',
];

const scanned = [
  ['src/design-system/preview/index.html', staticPreview],
  ['src/pages/DesignSystem.tsx', page],
  ['src/components/design-system/index.ts', index],
  ['docs/design-system/README.md', docs],
];

const designSystemDocs = [
  ['src/design-system/design.md', canonical],
  ['docs/design-system/README.md', docs],
  ['docs/design-system/tokens.md', tokens],
  ['docs/design-system/components.md', components],
  ['docs/design-system/patterns.md', patterns],
  ['docs/design-system/scale-alignment.md', scale],
];

const driftTerms = [
  'Deliverable Project',
  'Deliverable Brief',
  'DeliverableSpec',
  'ImageSlotSpec',
  'HTML Draft',
  'Approved For Image Generation',
  'Demand Alignment',
  'Template Or Custom Route Confirmed',
  'Review Before Image Generation',
  'Image Generation',
  'HTML deliverable',
  'ImageSlot',
  '交付生产环境',
  '交付项目',
  '先审后生图',
  '后端建模',
  '产品级后端',
  '轻量 JSON 合约',
  '状态机',
  '第一刀',
  '画册生产',
  '画册草案',
  '批量画册',
];

const activeSourceFiles = [
  'src/App.tsx',
  'src/components/AccountCenterHeader.tsx',
  'src/components/AnnouncementModal.tsx',
  'src/components/AuthModal.tsx',
  'src/components/BottomTabBar.tsx',
  'src/components/ImagePreviewModal.tsx',
  'src/components/PromptEditorModal.tsx',
  'src/components/SideNavBar.tsx',
  'src/components/TaskDrawer.tsx',
  'src/components/TopNavBar.tsx',
  'src/components/design-system/Button.tsx',
  'src/components/design-system/FormField.tsx',
  'src/components/design-system/IconButton.tsx',
  'src/components/design-system/SegmentedControl.tsx',
  'src/components/design-system/SkeletonBlock.tsx',
  'src/components/design-system/StatusPill.tsx',
  'src/components/design-system/Surface.tsx',
  'src/components/design-system/SurfaceState.tsx',
  'src/pages/Account.tsx',
  'src/pages/Config.tsx',
  'src/pages/Create.tsx',
  'src/pages/Explore.tsx',
  'src/pages/Favorites.tsx',
  'src/pages/History.tsx',
  'src/pages/Tasks.tsx',
  'src/pages/Workspace.tsx',
];

const primitiveMigrationFiles = [
  'src/components/AccountCenterHeader.tsx',
  'src/components/BottomTabBar.tsx',
  'src/components/PromptEditorModal.tsx',
  'src/components/SideNavBar.tsx',
  'src/pages/Account.tsx',
];

const rawControlPattern = /<(button|input|textarea|select)\b/;
const legacyUtilityPattern = /\b(btn-primary|btn-ghost|card-warm|card-warm-glass|glow-lime|glow-orange|glow-soft)\b/;

for (const [ok, message] of required) {
  if (!ok) {
    throw new Error(message);
  }
}

for (const [label, content] of scanned) {
  for (const token of banned) {
    if (content.includes(token)) {
      throw new Error(`${label} contains banned design residual: ${token}`);
    }
  }
}

for (const [label, content] of designSystemDocs) {
  for (const term of driftTerms) {
    if (content.includes(term)) {
      throw new Error(`${label} contains product workflow drift: ${term}`);
    }
  }
}

for (const relativePath of activeSourceFiles) {
  const content = await readFile(resolve(root, relativePath), 'utf8');
  for (const token of banned) {
    if (content.includes(token)) {
      throw new Error(`${relativePath} contains banned active UI design residual: ${token}`);
    }
  }
}

for (const relativePath of primitiveMigrationFiles) {
  const content = await readFile(resolve(root, relativePath), 'utf8');
  if (rawControlPattern.test(content)) {
    throw new Error(`${relativePath} contains raw control markup; use src/components/design-system primitives`);
  }
  const legacyMatch = content.match(legacyUtilityPattern);
  if (legacyMatch) {
    throw new Error(`${relativePath} uses legacy utility ${legacyMatch[1]}; use src/components/design-system primitives`);
  }
}

if (process.env.DESIGN_SYSTEM_URL) {
  const response = await fetch(process.env.DESIGN_SYSTEM_URL, { redirect: 'manual' });
  if (!response.ok) {
    throw new Error(`DESIGN_SYSTEM_URL returned ${response.status}: ${process.env.DESIGN_SYSTEM_URL}`);
  }
}

console.log('design-system smoke passed');
