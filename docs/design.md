# AetherGenix 设计系统

> 版本：v2.0 / 2026-05-18
> 当前标准：Warm Charcoal UI
> 适用范围：AetherGenix Image 前端 UI、后续 UI agents、截图验收与文档审查

---

## 1. 设计方向

AetherGenix 是面向商家与创作者的 AI 图像生成平台。当前 live UI 已从早期的 cyan / violet cosmic 方向，收敛到更克制、更像生产工具的 **warm charcoal / cream / lime / orange** 方向。

核心感受：

- 深色优先，但不是冷蓝宇宙背景，而是带暖度的炭黑界面。
- 主要动作不靠蓝紫渐变抢眼，而靠 cream 色 pill button 建立清晰入口。
- lime 是签名高亮，只用于选中、运行中、通知点、细线光带、余额等关键状态。
- orange 是商业和补充动作色，适合充值、购买、促销、提醒，不作为全站主色。
- 图片内容本身是视觉主角，UI 负责安静承托。

历史说明：

早期文档中的 “Aether Fruit / cyan-violet cosmic / glass nebula” 是已发生过的设计探索。它解释了品牌曾经追求“发光、生成感、深色科技感”的来源，但 **不再作为新 UI 的执行标准**。后续新增页面和组件必须优先匹配 live UI 的 warm charcoal 方向。

---

## 2. 产品与路由语义

参考 `CONTEXT.md` 和 ADR：

- `/create`：已登录用户默认落地页。承载通用生成与电商生成两个模式，输入提示词、参考图、参数并发起任务。
- `/explore`：未登录用户默认落地页。公开灵感图库，主路径是浏览图片并复用提示词。
- `/workspace/:taskId`：单次任务完成后的专属工作台，展示结果、重新生成、后续创作与营销文案入口。
- `/history`：历史任务列表，点击后进入对应 workspace。
- `/favorites`：已登录用户的收藏入口。
- `/recharge`、`/billing`、`/account`、`/config`：账户与配置相关页面。

导航决策：

- 桌面端：顶部导航 + 左侧导航。
- 移动端：顶部导航 + 底部 tab bar + “更多”全屏面板。
- `/` 只做分流：已登录进入 `/create`，未登录进入 `/explore`。
- `/ecommerce` 是兼容旧路径，应重定向到 `/create`，电商生成作为 create 内部模式存在。

---

## 3. 颜色系统

### 3.1 当前 live tokens

以下颜色来自 `src/index.css` 与主要组件，是后续 UI 的事实标准。

```css
/* Warm charcoal base */
--ag-charcoal-950: #0d0d0b; /* 最深底层 */
--ag-charcoal-900: #111110; /* 页面背景、导航背景 */
--ag-charcoal-800: #1a1917; /* 主 surface、卡片、弹窗 */
--ag-charcoal-700: #242220; /* 次级 surface */
--ag-charcoal-600: #2e2c29; /* hover / raised surface */
--ag-charcoal-500: #3a3835; /* 控件局部、关闭按钮背景 */
--ag-charcoal-400: #504d49; /* 弱边框 */
--ag-charcoal-300: #6b6660; /* 次级浅色文本 */

/* Text and cream */
--ag-cream: #f0ede8;        /* dark mode 主文字、主按钮背景 */
--ag-cream-hover: #ffffff;  /* 主按钮 hover */
--ag-muted: #8a8680;        /* 次级文字、图标默认 */
--ag-muted-low: #4a4844;    /* placeholder、分组标题 */

/* Signature accents */
--ag-lime: #E3FF74;         /* 选中、运行中、状态点、细线高亮 */
--ag-lime-dim: #c8e84a;     /* lime 的低亮度变体 */
--ag-orange: #fe6e00;       /* 充值、购买、商业 CTA */
--ag-green: #4ade80;        /* 成功状态 */
--ag-red: #ff6b6b;          /* 失败/错误状态 */
```

当前 dark mode 主题层级：

| 角色 | 色值 | 用途 |
|---|---:|---|
| `background` | `#111110` | 页面底色、导航底色、drawer 底色 |
| `surface` | `#1a1917` | 主卡片、输入容器、弹窗、任务卡 |
| `surface-container` | `#242220` | 次级容器、浅层 raised area |
| `surface-container-high` | `#2e2c29` | hover 或更高层 surface |
| `on-surface` | `#f0ede8` | 主文字 |
| `on-surface-variant` | `#8a8680` | 次级文字、默认图标 |
| `outline-variant` | `#2e2c29` 或 `rgba(255,255,255,0.06-0.08)` | 控件边框 |
| `primary` | `#f0ede8` | 主按钮背景 |
| `on-primary` | `#1a1917` | 主按钮文字 |
| `surface-tint` | `#E3FF74` | 选中和关键状态 |

当前 light mode 是辅助模式，必须可用，但不作为品牌主展示。light mode 应保持 warm neutral，不要回到冷蓝 SaaS 主题：

| 角色 | 色值 | 用途 |
|---|---:|---|
| `background` | `#f9f8f6` | 浅色页面底色 |
| `surface` | `#ffffff` | 浅色卡片 |
| `surface-container` | `#f2f0ed` | 浅色容器 |
| `on-surface` | `#1a1917` | 浅色主文字 |
| `on-surface-variant` | `#6b6660` | 浅色次级文字 |
| `secondary` | `#fe6e00` | 充值/购买/促销 |
| `tertiary` | `#2d7a45` | 成功/正向状态 |

### 3.2 颜色角色

**Charcoal**

- 用作页面底、导航、drawer、卡片底。
- 允许使用 `#111110`、`#1a1917`、`#242220`、`#2e2c29` 形成层级。
- 不要使用纯黑 `#000000` 作为大面积背景。遮罩可以使用 `bg-black/40-70`，但主体 surface 不用纯黑。

**Cream**

- 主按钮、主文字、强标题、重要数值。
- 主按钮通常是 cream 背景 + charcoal 文字。
- hover 可升到白色，但不要让白色成为大面积背景。

**Lime**

- 只用于关键状态和小面积强调：active nav、tab active、任务运行中、通知点、顶部 1px 光带、计数 badge、余额、focus ring。
- lime 适合做细线、点、文字、极少量背景，如 `rgba(227,255,116,0.08-0.12)`。
- 避免大面积 lime 面板。大面积使用会压过图片内容。

**Orange**

- 用于商业动作：充值、购买、套餐、促销、需要强调的付费路径。
- 可以用于 warning-adjacent 提醒，但错误仍用 red。
- 不要把 orange 和 lime 同时做主按钮竞争。

**Cyan / Violet**

- 已降级为历史遗留色。
- 不再用于新页面主按钮、logo 文字、导航 active、输入 focus、卡片 hover。
- 允许短期存在于旧代码残留或等待统一清理的细节中，例如现有 `gradient-genesis`、少量 hover border、旧阴影值。
- 新代码如果确实需要“生成中进度”渐变，优先用 lime/cream/charcoal 或低饱和 warm 方案；不要新增 cyan/violet 品牌渐变。

---

## 4. 字体与排版

当前字体：

```css
--font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
--font-display: 'Bricolage Grotesque', 'Inter', ui-sans-serif, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
```

使用规则：

- `font-display` 用于品牌名、页面标题、重要卡片标题。
- `font-sans` 用于正文、表单、按钮、导航。
- `font-mono` 仅用于 ID、API、代码、调试信息。
- 标题可以 `tracking-tight`，但不要继续新增负 letter spacing 到小字号 UI。
- 正文与控件文本保持清晰密度，常用 `text-sm`、`text-xs`。
- 中文界面需要足够行高：正文 `leading-6` 或 `leading-7`，按钮和 tab 避免换行挤压。

建议字号：

| 场景 | class / 尺寸 | 说明 |
|---|---|---|
| 页面标题 | `text-2xl` 到 `text-3xl` + `font-display` | 当前 Explore / Tasks 风格 |
| 弹窗标题 | `text-lg` 到 `text-xl` | 不做 hero 化 |
| 卡片标题 | `text-sm` 到 `text-base` + `font-medium/semibold` | 信息密度优先 |
| 表单标签 | `text-[10px]` 到 `text-xs` | 颜色用 muted |
| 辅助说明 | `text-xs` 到 `text-sm` | 颜色用 muted |
| 底部 tab label | `text-[10px]` | 必须截断不撑开 |

---

## 5. 空间、圆角、边框、阴影

间距基准仍然是 4px。当前 live UI 的主要尺度：

| 用途 | 推荐值 |
|---|---:|
| 图标按钮 | `h-9 w-9` |
| 主按钮 | `h-9` 或 `h-10` |
| 主要 CTA | `h-10` 到 `h-11` |
| 输入框 | `h-9` 或 `h-10` |
| 主卡片 padding | `p-4` 到 `p-6` |
| 页面左右 padding | mobile `px-4`，desktop 由容器控制 |
| 卡片间距 | `gap-3` 到 `gap-6` |

圆角：

| 用途 | 推荐值 |
|---|---:|
| 小输入、select、任务按钮 | `rounded-lg` |
| 图标按钮、缩略图、nav item | `rounded-xl` |
| 主卡片、弹窗、输入大容器 | `rounded-2xl` |
| 主按钮、pill action | `rounded-full` |

边框：

- 常规暗色边框：`border-white/[0.05]` 到 `border-white/[0.08]`。
- hover 边框：可以升到 `border-white/[0.1]` 或 lime 的 `rgba(227,255,116,0.12-0.15)`。
- 空态和上传区可用 dashed border：`border-dashed border-white/[0.1]`。

阴影：

- 常规 elevated card：`0 8px 40px rgba(0,0,0,0.5)`。
- 弹窗：`0 24px 64px rgba(0,0,0,0.7)`。
- 图片 hover：`0 8px 32px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.06)`。
- lime glow 只用于少数关键强调：`0 0 16px rgba(227,255,116,0.3), 0 0 48px rgba(227,255,116,0.1)`。

---

## 6. 按钮

### 6.1 Primary

当前主按钮是 cream pill，不是 cyan/violet gradient。

```css
.btn-primary {
  height: 2.5rem;
  padding: 0 1.25rem;
  border-radius: 9999px;
  background-color: #f0ede8;
  color: #1a1917;
  font-size: 0.875rem;
  font-weight: 600;
}
.btn-primary:hover {
  background-color: #ffffff;
}
.btn-primary:disabled {
  opacity: 0.4;
  pointer-events: none;
}
```

使用场景：

- 注册、生成图片、确认提交、登录弹窗提交。
- 图标 + 文本按钮应保持 `gap-1.5` 或 `gap-2`，图标尺寸 `13-16px`。
- 高度常用 `h-9`、`h-10`、`h-11`，同一工具栏内高度必须一致。

### 6.2 Ghost / Secondary

```css
.btn-ghost {
  height: 2.5rem;
  padding: 0 1rem;
  border-radius: 9999px;
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(240,237,232,0.8);
}
.btn-ghost:hover {
  background-color: rgba(255,255,255,0.07);
  color: #f0ede8;
}
```

使用场景：

- 登录、退出、重新生成、下载 zip、取消、次要操作。
- 文字不应比 primary 更亮。
- 图标按钮可以不用 pill，保持 `rounded-xl` 或 `rounded-lg`。

### 6.3 Lime Button

`.btn-lime` 是强强调按钮，必须少用。

适合：

- 特殊促销、极高优先级的付费动作。
- 需要明确“当前运行/当前选择”的状态按钮。

不适合：

- 每个表单的默认 submit。
- 大量列表项按钮。
- 长文案按钮。

### 6.4 Orange CTA

orange 用在充值、购买、升级、套餐选择。它可以是实心按钮，也可以是 warm outline 或 small badge。

规则：

- 同一视口内不要同时出现多个同等级 orange CTA。
- 如果页面已有 lime active 状态，orange CTA 要保持商业语义，不要变成导航状态色。
- 橙色文字必须保证暗色背景上可读，优先 `#fe6e00` 或浅化变体。

### 6.5 禁用与加载

- 禁用：`opacity: 0.4-0.5`，保留原按钮形状，不改成灰色实心。
- 加载：使用 `Loader2` + `animate-spin`，颜色继承按钮文本；运行中状态可用 lime 图标。
- 不要在禁用状态加 hover glow。

---

## 7. 卡片、面板与图片

### 7.1 标准卡片

当前标准卡片：

```css
background: #1a1917;
border: 1px solid rgba(255,255,255,0.07);
border-radius: 1rem; /* 或 rounded-2xl */
```

使用场景：

- 任务卡、表单主容器、弹窗、设置分组、账户模块。
- 文本卡片 padding 通常 `p-4`，更完整的面板用 `p-6`。
- 不要把卡片套卡片堆出厚重装饰。内层如果必须分组，用 `bg-white/[0.03]` 和细边框。

### 7.2 生成输入主卡

Create 页输入卡是当前最重要的标准：

- 外层：`rounded-2xl border border-white/[0.07] bg-[#1a1917] shadow-[0_8px_40px_rgba(0,0,0,0.5)]`
- hover：只做轻微 lime shadow，不能整卡发光。
- 文本区：透明背景，主文字 cream，placeholder 用 `#4a4844`。
- 底部参数栏：顶部细分隔线 `border-white/[0.06]`。

### 7.3 图片卡

Explore 和 Workspace 的图片卡规则：

- 图片本身铺满容器，卡片 `rounded-2xl overflow-hidden`。
- hover 可 `translateY(-1)` 或图片 `scale(1.03-1.04)`。
- overlay 用黑色渐变承托文字：`from-black/85 via-black/30 to-transparent`。
- hover 顶部细线可用 lime：`h-[2px] bg-[#E3FF74] opacity-80`。
- 图片按钮文字使用 cream pill，不使用蓝紫渐变。
- 图片 alt 必须来自 title/prompt 或当前任务 prompt。

### 7.4 弹窗与 Drawer

弹窗：

- 遮罩：`bg-black/50-70` + `backdrop-blur-sm/md`。
- surface：`bg-[#1a1917] border-white/[0.08] rounded-2xl`。
- 顶部可用 1px lime 光带，但不要加多重渐变边框。

Drawer：

- 背景：`#111110`。
- 最大宽度：当前任务 drawer 是 `max-w-[420px]`。
- 右侧滑入动画保持 300ms 左右。
- 空态、筛选、任务卡都应在 drawer 内形成清晰层级。

---

## 8. 输入、选择器与表单

标准输入：

```css
height: 2.5rem;
border-radius: 0.75rem;
border: 1px solid rgba(255,255,255,0.08);
background: rgba(255,255,255,0.04);
color: #f0ede8;
outline: none;
```

focus：

```css
border-color: rgba(227,255,116,0.4);
background: rgba(255,255,255,0.06);
```

规则：

- 表单 label 用 `text-xs` 或 `text-[10px]`，颜色 `on-surface-variant`。
- placeholder 用 `#4a4844` 或 `on-surface-variant/50`。
- select 和 compact input 保持 `h-9 rounded-lg`。
- Prompt textarea 不需要边框，依附于外层主输入卡。
- 上传入口是图标按钮：`h-10 w-10 rounded-xl border-white/[0.08] bg-white/[0.04]`。
- 表单错误使用 red，不使用 orange 或 lime。

---

## 9. 导航

### 9.1 TopNavBar

当前顶部导航：

- 固定顶部，`h-16`。
- 背景：未滚动 `rgba(17,17,16,0.7)`，滚动后 `rgba(17,17,16,0.95)`。
- blur：`backdrop-blur-[20px]`。
- Logo：图标 `h-8 w-8 rounded-xl`，文字 `font-display text-[#f0ede8]`，桌面/平板显示，窄屏隐藏。
- 右侧 icon button：`h-9 w-9 rounded-xl text-[#8a8680] hover:text-[#f0ede8] hover:bg-white/5`。
- 任务计数和公告点用 lime。

不要：

- 顶部导航不要加 cyan/violet 品牌渐变文字。
- 不要把 nav 高度改成 hero 或营销页样式。
- 不要在移动端塞完整账户信息进顶部栏，使用移动菜单面板承载。

### 9.2 SideNavBar

当前桌面侧栏：

- `w-60`，固定在 top nav 下方。
- 背景 `#111110`，右边框 `border-white/[0.05]`。
- nav item：`rounded-xl px-3 py-2.5 text-sm`。
- active：`bg-[rgba(227,255,116,0.08)] text-[#E3FF74] border-[rgba(227,255,116,0.15)]`，左侧 2px lime 指示条。
- inactive：muted 文本，hover 到 cream + `bg-white/[0.04]`。

分组：

- 主功能：创作、历史、收藏。
- 账户功能：充值、账单、账户、配置。
- Explore 不进已登录桌面主导航，未登录用户通过 `/explore` 落地。

### 9.3 BottomTabBar

当前移动底部导航：

- `lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#111110] border-t border-white/[0.05]`。
- 主 tabs：创作、历史、收藏。
- “更多”承载充值、账单、账户、配置。
- active 只改变文字/图标为 lime，不加复杂底座。
- label `text-[10px]`，必须 truncate，不可撑开 tab。
- 内容区 bottom padding 必须预留 `pb-16`，避免被 tab bar 遮挡。

移动菜单：

- 顶部菜单从 top nav 下方展开。
- 使用 `bg-[rgba(17,17,16,0.97)] backdrop-blur-xl`。
- 登录/注册按钮并排，保持 `h-11`。

---

## 10. Tabs、Segmented Controls 与状态筛选

### 10.1 Create 模式切换

当前 create 模式切换是 warm segmented control：

- 外层：`rounded-2xl border border-white/[0.07] bg-[#171613] p-1.5`。
- active：cream 背景 + charcoal 文字 + 轻阴影。
- inactive：muted 文本，hover 到 cream。
- 两个模式等宽，不使用普通 tab underline。

### 10.2 Workspace Tabs

workspace 内子功能使用 top border tabs：

- active：lime 文字、`border-b-2 border-[#E3FF74]`、`bg-[rgba(227,255,116,0.06)]`。
- inactive：muted 文本，hover 到 on-surface。
- 不要使用 cyan/violet active border。

### 10.3 任务筛选

任务筛选按钮使用小 rounded-lg：

- active：lime 边框 + lime 低透明背景 + lime 文字。
- inactive：transparent border + muted 文本。
- 数量较多时允许横向滚动或 wrap，但不能压缩文字重叠。

---

## 11. 状态、徽章与空态

状态色：

| 状态 | 颜色 | 用途 |
|---|---:|---|
| queued | `#8a8680` | 等待、低优先级状态 |
| running | `#E3FF74` | 运行中 spinner、进度提示 |
| succeeded | `#4ade80` | 成功状态 |
| failed/error | `#ff6b6b` | 失败、错误消息 |
| commercial | `#fe6e00` | 充值、购买、套餐 |

徽章：

- 数字 badge：lime 背景 + charcoal 文字，尺寸要小，如 `h-4 min-w-[16px] text-[9px]`。
- 状态 pill：用低透明背景，不要大面积实心。
- 分组标题：`text-[10px] uppercase tracking-widest text-[#4a4844]`。

空态：

- 容器：`min-h-[240px] rounded-xl border border-dashed border-white/[0.1] bg-white/[0.03]`。
- 文本：`text-sm text-[#8a8680]`。
- 空态不需要插画，不需要蓝紫 glow。
- 如果有下一步动作，使用一个 cream primary 或 muted ghost button，不要同时堆多个 CTA。

加载态：

- 列表加载可使用 3 个小圆点，颜色跟 `bg-primary` 或 lime。
- Skeleton 使用 `bg-white/[0.04]` + `animate-skeleton`。
- 生成中主面板可显示 spinner + 状态文案 + 细进度条；进度条后续应改为 warm/lime 系，旧 `gradient-genesis` 属历史残留。

---

## 12. 图标与媒体

图标：

- 使用 Lucide React。
- 工具栏/按钮内常用 `13-16px`。
- 底部 tab 使用 `20px`。
- 页面级图标或空态图标可用 `18-24px`。
- 默认颜色继承文本，inactive 使用 muted，active 使用 lime。
- 不使用 emoji 作为图标。

媒体：

- 真实生成图片是视觉主角。
- 图片卡 overlay 文案不要遮挡过多画面，移动端可常显关键动作，桌面端可 hover 显示。
- 上传预览缩略图使用 `h-16 w-16 rounded-xl object-cover`。
- 图片 modal / preview 必须保持背景深色，不要切到浅色相册风格。

---

## 13. 动效

当前全局动效：

```css
--ag-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ag-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

使用规则：

- hover 反馈：`150-200ms`。
- drawer / modal：`250-300ms`。
- 页面元素进入：`fade-in`，从 `opacity: 0; translateY(8px)` 到自然位置。
- 图片 hover scale：`300-500ms`，不要过快闪动。
- glow breathe 只用于极少数状态，不要全页面持续发光。
- 尊重 `prefers-reduced-motion` 的后续实现空间，新增动画不要成为理解信息的唯一方式。

---

## 14. 旧 cyan/violet 指南的废弃与降级

以下旧方向已废弃，不应在新 UI 中继续扩展：

- `--ag-cyan: #00D4F0` 作为主品牌色。
- `--ag-violet: #8B5CF6` 作为主品牌色。
- cyan/violet 的主按钮渐变。
- cyan/violet logo 文字渐变。
- 冷蓝宇宙背景：`#050810`、`#080D1A`、`#0D1428`、`#151E38` 作为主层级。
- 大面积 glass nebula card。
- 所有卡片 hover 都发 cyan/violet glow。
- 输入 focus 使用 cyan。
- 侧边栏 active 使用 cyan 左边线。

以下旧元素降级为历史兼容，可存在但不新增：

- `gradient-genesis`、`text-gradient-genesis` 等旧 utility。
- workspace 中少量 cyan/violet hover border 或 shadow。
- 旧文档中的 “Aether Fruit” 叙事。
- Favicon / 旧 logo 如果仍带蓝紫，可以暂时保留，直到专门的品牌资产任务处理。

迁移原则：

1. 新增组件全部使用 warm charcoal tokens。
2. 修改旧组件时，如果触及相关样式，应顺手把 cyan/violet active/focus/CTA 改成 lime/cream/orange。
3. 不做无关大扫除。多人并行工作时，只改当前任务相关文件。

---

## 15. 截图验收规则

后续 UI agents 做页面或组件变更后，至少检查桌面与移动两个视口：

- 桌面建议：`1440x900` 或 `1366x768`。
- 移动建议：`390x844` 或 `375x812`。

必须通过：

- 页面背景第一眼是 warm charcoal，不是冷蓝宇宙或纯黑。
- 主 CTA 是 cream pill，文字是 charcoal，hover 不丢对比度。
- active nav / tab / running / notification 使用 lime，小面积明确可见。
- orange 只出现在充值、购买、商业提醒等语义位置。
- cyan/violet 不作为新增主视觉，不出现在新 active/focus/primary CTA。
- 顶部导航固定且不遮挡内容，滚动后背景更实。
- 桌面侧栏不遮挡主内容，`main` 保持 `lg:pl-60`。
- 移动底部 tab 不遮挡页面底部内容，主内容有 `pb-16`。
- 移动更多面板从 top nav 下方开始，不盖住顶部导航。
- 文本不溢出按钮、tab、卡片和 bottom nav。
- 图片卡 hover overlay 不遮挡过多图片；移动端关键动作仍可访问。
- 空态有明确边界、说明文字和必要动作，不使用装饰性大渐变。
- focus-visible 对键盘用户可见，优先 lime ring 或 border。
- 弹窗和 drawer 的遮罩、层级、关闭按钮可见且可点击。
- loading、empty、error、success 四类状态颜色语义一致。

截图审查时，若看到以下现象，应退回修改：

- 页面被单一紫蓝渐变支配。
- 主按钮变成 cyan/violet gradient。
- lime 大面积铺底导致刺眼。
- card 套 card 形成厚重装饰。
- 文字在 cream 按钮、lime badge 或图片 overlay 上不可读。
- 移动端 tab label 被压缩、换行或相互重叠。

---

## 16. 实施优先级

| 优先级 | 项目 | 判断标准 |
|---|---|---|
| P0 | 新增 UI 使用 warm charcoal tokens | 不新增 cyan/violet primary、focus、active |
| P0 | 主操作按钮保持 cream pill | create、auth、workspace 等核心路径一致 |
| P0 | 导航 active 使用 lime | Top / Side / Bottom / Drawer 语义一致 |
| P1 | 表单 focus 使用 lime 或 cream | 不再使用 cyan focus |
| P1 | 图片卡 overlay 与 hover 克制 | 图片是主角，UI 只承托 |
| P1 | 空态和 loading 统一 | 任务、历史、收藏、drawer 一致 |
| P2 | 清理旧 `gradient-genesis` 残留 | 仅在触及相关组件时做，不单独扩大范围 |
| P2 | 品牌资产 warm 化 | Logo/favicon 另开任务处理 |

---

## 17. 给后续 UI agents 的简短准则

做新界面前先问三件事：

1. 这个元素是主动作、状态、商业动作，还是普通信息？
2. 它应该用 cream、lime、orange，还是只用 charcoal 层级？
3. 截图里图片内容是否仍然是主角？

默认选择：

- 页面底：`#111110`
- 卡片底：`#1a1917`
- 卡片边框：`rgba(255,255,255,0.07)`
- 主文字：`#f0ede8`
- 次文字：`#8a8680`
- 主按钮：`#f0ede8` 背景 + `#1a1917` 文字
- active / running / notify：`#E3FF74`
- commercial CTA：`#fe6e00`

不要从旧文档复制 cyan/violet cosmic recipes。它们现在是历史记录，不是执行规范。
