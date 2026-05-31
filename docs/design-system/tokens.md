# Tokens

Canonical source: `src/design-system/design.md`.

This file is a reference note about how canonical tokens are implemented in `src/index.css`. It must not define token rules that conflict with the canonical static design system.

Tokens 的运行时来源是 `src/index.css`。文档只描述语义和使用边界，不另立一套独立 token 文件。

## Token Source Of Truth

`src/index.css` 中的 Tailwind v4 `@theme` 是唯一可扩展 token 层。新增可复用颜色、字体、语义 surface、状态色、radius、spacing 或 motion role 时，优先沉淀到 `@theme`，再由组件和页面通过 Tailwind token 使用。

`:root --ag-*` 只保留给 Tailwind token 不适合承载的 runtime helper，例如 easing、glow shadow，或确实需要被普通 CSS 与组件共同引用的运行时变量。不要在 `--ag-*` 里扩展另一套颜色系统。

全局 utilities 如 `.btn-primary`、`.btn-ghost`、`.btn-lime`、`.card-warm`、`.card-warm-glass`、`.glow-*` 视为 compatibility-only。新增 UI 不应继续以这些 class 作为主要写法，优先使用 `src/components/design-system/` primitives。

Primitive 内允许少量 raw Tailwind arbitrary values 或 raw color/shadow class，但必须是 token 尚无法表达的明确例外。页面级 raw values 只允许在既有 pattern、视觉例外或迁移中的 legacy surface 保留；新增页面默认先使用 token 和 primitives。

## Color Roles

| role | value | use |
|---|---:|---|
| `background` | `#111110` | app canvas, nav background |
| `surface` | `#1a1917` | cards, dialogs, main panels |
| `surface-container` | `#242220` | raised groups, nested controls |
| `surface-container-high` | `#2e2c29` | hover surface, active surface |
| `on-surface` | `#f0ede8` | primary text |
| `on-surface-variant` | `#8a8680` | secondary text, muted icons |
| `lime` | `#E3FF74` | selected, running, notification, focus |
| `orange` | `#fe6e00` | recharge, purchase, commercial CTA |
| `success` | `#4ade80` | succeeded state |
| `error` | `#ff6b6b` | failed and destructive state |

## Typography

- `font-display`：品牌名、页面标题、关键 panel 标题。
- `font-sans`：正文、表单、按钮、导航。
- `font-mono`：ID、API、命令、路径、调试信息。

不要把 hero-scale type 用进工具面板、表单、状态卡和导航。

## Radius

| role | value |
|---|---:|
| small controls | `rounded-lg` |
| icon buttons / nav items | `rounded-xl` |
| panels / dialogs / image cards | `rounded-2xl` |
| primary buttons / pills | `rounded-full` |

## Spacing

| role | value |
|---|---:|
| icon button | `h-11 w-11` |
| input | `h-11` |
| primary action | `h-11` |
| panel padding | `p-4` or `p-6` |
| card gap | `gap-3` to `gap-5` |
| page gutter | `px-4` plus constrained container |

## Focus

Focus 使用 lime ring 或 lime border：

```css
focus-visible:ring-2 focus-visible:ring-lime/30
focus:border-lime/45
```

不要新增 cyan focus、violet focus 或高饱和蓝色 focus。

## Motion

Motion runtime helpers live in `src/index.css` as `--ag-*` easing variables and shared `ds-*` motion classes.

Current reusable motion language:

| role | implementation | use |
|---|---|---|
| `--ag-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | default enter, reveal, panel movement |
| `--ag-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | rare small press or icon emphasis |
| `ds-motion-tree-*` | CSS grid rows + opacity + transform | T1/T2 workspace navigation |
| `ds-sticky-morph-*` | CSS scroll-state container query | sticky nav morph on scroll |
| `ds-stage-enter`, `ds-panel-enter` | keyframe enter utilities | page stage and side panel continuity |
| `ds-motion-card`, `ds-motion-press` | transition utilities | repeated cards and compact pressable actions |
| `ds-workbench-*` | shared component shell classes | T3 cards, T3 detail panels, T4 composer panels |

Rules:

- JS 可以切换状态，但不计算动画帧。
- 可复用 motion 必须沉淀为 design-system class 或 primitive。
- 页面级动画只能作为过渡期例外，不能成为新模式。新 Studio shell 默认使用 `ds-*` motion。
- 必须保留 `prefers-reduced-motion` 降级路径。

## Deprecated

以下只能作为历史残留存在，不允许新增：

- `gradient-genesis`
- `text-gradient-genesis`
- cyan / violet primary CTA
- cyan / violet active nav
- cold blue SaaS background
