# AetherGenix Design System
> 版本 v1.0 · 2026-05-18
> 设计语言代号：**Aether Fruit** — 宇宙深处熟透的果实

---

## 一、品牌定位 & 设计哲学

AetherGenix 是一个 AI 图像生成平台。「Aether」是古典宇宙元素中的以太——渗透万物的发光能量；「Genix」是创生与起源。这两个词合在一起，意味着**从以太中召唤视觉**。

**设计哲学三句话**：
1. **以太质感**：界面本身就是生成物——光从内部透出，表面带有湿润的光泽感，像一颗刚被摘下的果实。
2. **宇宙里的鲜果**：用深空背景衬托高饱和的色彩，对比创造张力，黑色越深，颜色越响亮。
3. **克制的丰盛**：「果味」不是把所有颜色倒进一个碗。是一个精准的爆发点，其余保持深沉。

**核心灵感来源**：Lovart.ai 的产品设计输出风格——饱和渐变、有机形态、色光叠加。

---

## 二、色彩系统

### 2.1 品牌调色板（设计 Token）

「果味」进化：在现有青蓝×靛紫的基础上，引入暖琥珀和电石灰作为「果肉色」。

```css
/* ─── 核心品牌色 ─── */
--ag-cyan:        #00D4F0;   /* 电青，比原 #0891b2 更饱和 */
--ag-violet:      #8B5CF6;   /* 活力紫，比原 #6366f1 更暖 */
--ag-amber:       #F59E0B;   /* 琥珀金，「果肉」暖色 */
--ag-lime:        #D9F20A;   /* 电石灰，Lovart 签名高亮 #E3FF74 的 AetherGenix 版 */

/* ─── 深空背景色 ─── */
--ag-bg-void:     #050810;   /* 最深：宇宙黑 */
--ag-bg-deep:     #080D1A;   /* 深空：主背景 dark */
--ag-bg-cosmic:   #0D1428;   /* 宇宙蓝：surface 容器 */
--ag-bg-nebula:   #151E38;   /* 星云：card 背景 */

/* ─── 亮色模式背景 ─── */
--ag-bg-light:    #F8FAFC;   /* 主背景 light（保留原值） */
--ag-bg-mist:     #EFF4FF;   /* 带蓝气息的浅面 */
--ag-bg-frost:    #FFFFFF;   /* 纯白 */

/* ─── 文字色 ─── */
--ag-text-primary:   #F0F4FF;    /* dark 主文字：微冷白 */
--ag-text-secondary: #8899BB;    /* dark 次级：星光蓝灰 */
--ag-text-muted:     #4A5980;    /* dark 弱：深宇宙蓝 */
--ag-text-ink:       #0F172A;    /* light 主文字 */
--ag-text-ink-2:     #475569;    /* light 次级 */
```

### 2.2 渐变配方（Gradient Recipes）

「果味」的精髓在于渐变的**温度感**和**层次数**。

```css
/* ── 品牌 Hero 渐变（3色，以太色谱）─── */
--ag-gradient-aether:
  linear-gradient(135deg, #00D4F0 0%, #8B5CF6 55%, #EC4899 100%);

/* ── 生成渐变（2色，最常用）─── */
--ag-gradient-genesis:
  linear-gradient(135deg, #00D4F0 0%, #8B5CF6 100%);

/* ── 暖果渐变（CTA 用，有温度）─── */
--ag-gradient-fruit:
  linear-gradient(135deg, #F59E0B 0%, #EF4444 100%);

/* ── 电石高亮（稀用，最「果味」的一笔）─── */
--ag-gradient-spark:
  linear-gradient(90deg, #D9F20A 0%, #A3E635 100%);

/* ── 深空背景渐变（页面底色）─── */
--ag-gradient-void:
  radial-gradient(ellipse at 20% 50%, #1E1B4B 0%, #050810 60%);

/* ── 玻璃卡片渐变（内部填充）─── */
--ag-gradient-glass:
  linear-gradient(135deg, rgba(0,212,240,0.08) 0%, rgba(139,92,246,0.05) 100%);
```

**渐变使用规范**：
- `aether`：Hero section、Splash 区域（页面只能出现 1 次）
- `genesis`：主 CTA 按钮、焦点元素
- `fruit`：次级 CTA、充值/购买相关元素
- `spark`：悬停高亮、选中状态、徽章（点缀，非大面积）
- `void`：暗色页面底层背景
- `glass`：卡片内部微渐变，与深色底叠合

### 2.3 暗色模式（Dark First）

**AetherGenix 以深色为主要模式**，浅色为辅助选项。

```
深色主题层级：
  Void   #050810  ← 最底层背景
  Deep   #080D1A  ← 页面主背景
  Cosmic #0D1428  ← 主要 surface（nav、sidebar）
  Nebula #151E38  ← 卡片、浮层
  Stellar #1E2A4A  ← hover 状态、输入框
  Frost  rgba(255,255,255,0.06)  ← 玻璃面最高层
```

```
浅色主题层级：
  Background  #F8FAFC
  Surface     #FFFFFF
  Container   #EFF4FF
  High        #E2E8F0
```

### 2.4 色光系统（Glow & Aura）

「果味」重要组成：发光效果，像果实在光下的反光。

```css
/* 主色光（青） */
--ag-glow-cyan:   0 0 20px rgba(0,212,240,0.35), 0 0 60px rgba(0,212,240,0.12);
/* 紫光 */
--ag-glow-violet: 0 0 20px rgba(139,92,246,0.35), 0 0 60px rgba(139,92,246,0.12);
/* 金光（CTA） */
--ag-glow-amber:  0 0 20px rgba(245,158,11,0.40), 0 0 60px rgba(245,158,11,0.15);
/* 微光（通用卡片悬停）*/
--ag-glow-soft:   0 8px 32px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.08);
```

---

## 三、字体排版

### 3.1 字体栈

Lovart 使用专属展示字体（FeatureDisplay）+ 优质 Grotesque（GT Standard）。AetherGenix 采用公开可用的同级替代：

```css
/* Display / 大标题：Bricolage Grotesque —— 有机感的变宽几何无衬线 */
--ag-font-display: 'Bricolage Grotesque', 'Plus Jakarta Sans', ui-sans-serif, sans-serif;

/* Body / UI：Inter —— 保留现有（工程化，信息密度高）*/
--ag-font-sans:    'Inter', ui-sans-serif, system-ui, sans-serif;

/* Mono：JetBrains Mono —— 保留现有 */
--ag-font-mono:    'JetBrains Mono', ui-monospace, monospace;
```

> **实施说明**：在 `index.html` 的 `<head>` 追加：
> ```html
> <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
> ```

### 3.2 排版层级

| Token | 字体 | 尺寸 | 字重 | 行高 | 用途 |
|---|---|---|---|---|---|
| `ag-display-xl` | Display | 60px / 3.75rem | 700 | 1.1 | Hero 主标题 |
| `ag-display-lg` | Display | 48px / 3rem | 700 | 1.15 | 区块标题 |
| `ag-display-md` | Display | 36px / 2.25rem | 600 | 1.2 | 页面标题 |
| `ag-heading-xl` | Display | 28px / 1.75rem | 600 | 1.25 | 卡片组标题 |
| `ag-heading-lg` | Sans | 22px / 1.375rem | 600 | 1.35 | 页面二级标题 |
| `ag-heading-md` | Sans | 18px / 1.125rem | 600 | 1.4 | 组件标题 |
| `ag-heading-sm` | Sans | 16px / 1rem | 500 | 1.5 | 小标题 |
| `ag-body-lg` | Sans | 16px / 1rem | 400 | 1.6 | 正文大 |
| `ag-body-md` | Sans | 14px / 0.875rem | 400 | 1.55 | 正文 |
| `ag-body-sm` | Sans | 13px / 0.8125rem | 400 | 1.5 | 辅助文字 |
| `ag-label` | Sans | 12px / 0.75rem | 500 | 1.4 | 标签、说明 |
| `ag-mono` | Mono | 13px / 0.8125rem | 400 | 1.6 | 代码、API |

**字间距（Letter Spacing）**：
- Display 字体：`-0.02em`（略收，现代感）
- Heading：`-0.01em`
- Body/Label：`0`（不额外调整）
- 全大写标签：`0.08em`（展开）

### 3.3 中文排版

- 中英混排时 Display 字体 fallback 到 `Noto Sans SC`
- 中文正文行高取 `1.8`（比英文更宽松）
- 不使用衬线体（与平台科技感不符）

---

## 四、空间系统

基于 **4px 基准**，与现有 Tailwind 保持一致，补充大号间距。

```
2px   → 极紧（图标内边距）
4px   → xs
8px   → sm
12px  → md
16px  → lg       ← 默认卡片内边距
20px  → xl
24px  → 2xl
32px  → 3xl
40px  → 4xl
48px  → 5xl
64px  → 6xl
80px  → 7xl      ← section 间距
96px  → 8xl
128px → 9xl      ← Hero 区域垂直内边距
```

**圆角系统**（「果味」偏大圆角，有机感）：
```
4px   → 细节圆角（输入框内部角标）
8px   → sm（徽章、tag）
12px  → md（输入框、小卡片）
16px  → lg（标准卡片）
20px  → xl（大卡片、弹窗）
24px  → 2xl（面板）
9999px → pill（按钮、胶囊标签）
```

---

## 五、组件风格

### 5.1 按钮（Button）

「果味」按钮的核心：胶囊形状 + 色彩渐变 + 光晕。

#### Primary（主行动按钮）
```
形状：rounded-full（pill）
背景：linear-gradient(135deg, #00D4F0, #8B5CF6)
悬停：brightness + box-shadow: var(--ag-glow-cyan)
文字：白色 font-medium
高度：h-10（40px）标准 / h-12（48px）大号
内边距：px-6（24px）
过渡：all 0.2s ease-out
```

#### Secondary（次级）
```
形状：rounded-full
背景：透明
边框：1px solid rgba(0,212,240,0.4)
文字：--ag-cyan
悬停：bg-[rgba(0,212,240,0.08)]
```

#### Ghost（幽灵）
```
形状：rounded-xl（非胶囊）
背景：rgba(255,255,255,0.06)
边框：1px solid rgba(255,255,255,0.1)
文字：--ag-text-secondary
悬停：bg-[rgba(255,255,255,0.1)]
```

#### Danger / CTA Warm
```
背景：linear-gradient(135deg, #F59E0B, #EF4444)（fruit 渐变）
悬停：brightness(1.1) + --ag-glow-amber
```

#### 禁止状态
```
opacity: 0.4
pointer-events: none
不加灰色背景（保留原色只降透明度）
```

### 5.2 卡片（Card）

「果味」卡片的核心：玻璃质感 + 内发光边框 + 悬停色光。

#### 标准卡片（图片生成结果等）
```css
background: linear-gradient(135deg, rgba(0,212,240,0.06) 0%, rgba(139,92,246,0.04) 100%);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 16px;
backdrop-filter: blur(12px);

/* 悬停 */
&:hover {
  border-color: rgba(0,212,240,0.25);
  box-shadow: var(--ag-glow-soft), 0 0 0 1px rgba(0,212,240,0.15);
  transform: translateY(-2px);
}
transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
```

#### 精选/Featured 卡片
```css
/* 额外：顶部有渐变光带 */
&::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--ag-gradient-genesis);
  border-radius: 16px 16px 0 0;
}
```

#### 信息卡片（文字为主）
```css
background: var(--ag-bg-nebula);
border: 1px solid rgba(255,255,255,0.06);
border-radius: 12px;
padding: 20px;
```

### 5.3 输入框（Input）

```css
/* 默认 */
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.1);
border-radius: 12px;
color: var(--ag-text-primary);

/* Focus */
border-color: rgba(0,212,240,0.5);
box-shadow: 0 0 0 3px rgba(0,212,240,0.12);
outline: none;

/* Prompt 输入（大型）*/
border-radius: 16px;
padding: 16px;
min-height: 80px;
font-size: 15px;
line-height: 1.6;
```

### 5.4 徽章 / Tag（Badge）

```css
/* 默认 */
display: inline-flex; align-items: center; gap: 4px;
padding: 3px 10px;
border-radius: 9999px;
font-size: 12px; font-weight: 500;
letter-spacing: 0.02em;

/* 颜色变体 */
.badge-cyan:   { background: rgba(0,212,240,0.15);  color: #00D4F0; border: 1px solid rgba(0,212,240,0.3) }
.badge-violet: { background: rgba(139,92,246,0.15); color: #A78BFA; border: 1px solid rgba(139,92,246,0.3) }
.badge-amber:  { background: rgba(245,158,11,0.15); color: #FCD34D; border: 1px solid rgba(245,158,11,0.3) }
.badge-lime:   { background: rgba(217,242,10,0.15); color: #D9F20A; border: 1px solid rgba(217,242,10,0.3) }
.badge-neutral:{ background: rgba(255,255,255,0.08); color: var(--ag-text-secondary); border: 1px solid rgba(255,255,255,0.12) }
```

### 5.5 导航栏（TopNavBar）

**现有布局保留，升级视觉**：
```css
/* 背景 */
background: rgba(8,13,26,0.75);
backdrop-filter: blur(20px) saturate(1.5);
border-bottom: 1px solid rgba(255,255,255,0.06);

/* 滚动后 */
.scrolled {
  background: rgba(8,13,26,0.92);
  border-bottom-color: rgba(0,212,240,0.15);
}
```

Logo 字样 `AetherGenix`：用 `font-display` + `font-bold`，加一个微渐变文字效果：
```css
background: var(--ag-gradient-genesis);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

### 5.6 侧边导航（SideNavBar）

```css
background: var(--ag-bg-cosmic);
border-right: 1px solid rgba(255,255,255,0.06);

/* 激活菜单项 */
.active {
  background: rgba(0,212,240,0.1);
  border-left: 2px solid var(--ag-cyan);
  color: var(--ag-cyan);
}
```

### 5.7 图片预览 & 瀑布流（Masonry）

```css
/* 图片卡片 */
border-radius: 12px;
overflow: hidden;
transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);

&:hover {
  transform: scale(1.02);
  box-shadow: var(--ag-glow-soft);
}

/* Overlay（悬停显示操作按钮）*/
.overlay {
  background: linear-gradient(to top, rgba(5,8,16,0.85) 0%, transparent 60%);
}
```

---

## 六、动效原则

### 6.1 时间曲线（Easing）

「果味」动效：有弹性，有反馈感，不机械。

```css
/* 标准进入（元素出现）*/
--ag-ease-out:    cubic-bezier(0.16, 1, 0.3, 1);   /* 快进慢出，果实落下感 */

/* 退出/消失 */
--ag-ease-in:     cubic-bezier(0.4, 0, 1, 1);

/* 交互反馈（微动效）*/
--ag-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* 轻微弹射，有生命感 */

/* 颜色/透明度变化 */
--ag-ease-linear: linear;
```

### 6.2 持续时间（Duration）

```
即时反馈（hover 颜色变化）：100ms
快速过渡（按钮、图标状态）：150-200ms
标准动画（卡片展开、弹窗）：250-350ms
页面级过渡（路由切换）：400-500ms
背景慢动效（光晕漂移）：3000-8000ms（循环）
```

### 6.3 动效模式

1. **Fade + Slide**：元素进入从 `opacity:0, translateY(8px)` → `opacity:1, translateY(0)`
2. **Scale Pop**：弹窗、Tooltip 从 `scale(0.95)` → `scale(1)` + spring easing
3. **Glow Pulse**：主要高亮元素有慢速光晕呼吸（3s cycle）
4. **Shimmer**：骨架屏用斜向扫光而非透明度呼吸

**不用动效的场景**：
- 纯文字状态变化（直接 color transition 即可）
- 超长列表项（`prefers-reduced-motion` 时关闭）

---

## 七、图标 & 插图风格

### 7.1 图标

**当前使用 Lucide React**，保留。样式规范：
- 尺寸：`16px`（内联）、`20px`（按钮/菜单）、`24px`（页面级）
- 线条宽度：`stroke-width: 1.5`（更细腻，非 Lucide 默认 2）
- 颜色：继承文字色，重点图标用 `--ag-cyan`

### 7.2 品牌图标 / Favicon

**四芒星 Sparkle**（已确定方向）：
- 圆角矩形底（`rx=22`）+ 靛紫→青蓝渐变
- 白色四芒星路径（smooth bezier）
- 可用于 favicon、App Icon、徽标背景

### 7.3 插图风格

当图像内容需要占位或装饰插图时：
- **风格**：抽象几何 + 光效 + 深空色调
- **元素**：不规则多边形、流动渐变斑块、散点光晕
- **禁止**：卡通人物、平面 icon 拼贴、照片素材
- **推荐**：用生成图本身作为装饰（灵感图库的轮播作为 Hero 背景）

---

## 八、实现规范（Tailwind CSS v4）

### 8.1 更新 `src/index.css` 的 @theme

```css
/* 在现有 @theme 内追加以下变量 */
@theme {
  /* 品牌演化色 */
  --color-ag-cyan:   #00D4F0;
  --color-ag-violet: #8B5CF6;
  --color-ag-amber:  #F59E0B;
  --color-ag-lime:   #D9F20A;

  /* 深空背景层级 */
  --color-void:   #050810;
  --color-deep:   #080D1A;
  --color-cosmic: #0D1428;
  --color-nebula: #151E38;
  --color-stellar:#1E2A4A;

  /* 字体 */
  --font-display: 'Bricolage Grotesque', 'Plus Jakarta Sans', ui-sans-serif, sans-serif;

  /* 圆角扩展 */
  --radius-pill: 9999px;
}
```

### 8.2 渐变 Utility（追加到 @layer utilities）

```css
@layer utilities {
  .gradient-aether {
    background: linear-gradient(135deg, #00D4F0 0%, #8B5CF6 55%, #EC4899 100%);
  }
  .gradient-genesis {
    background: linear-gradient(135deg, #00D4F0 0%, #8B5CF6 100%);
  }
  .gradient-fruit {
    background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%);
  }
  .gradient-spark {
    background: linear-gradient(90deg, #D9F20A 0%, #A3E635 100%);
  }
  .gradient-void {
    background: radial-gradient(ellipse at 20% 50%, #1E1B4B 0%, #050810 60%);
  }
  .text-gradient-genesis {
    background: linear-gradient(135deg, #00D4F0, #8B5CF6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .glow-cyan {
    box-shadow: 0 0 20px rgba(0,212,240,0.35), 0 0 60px rgba(0,212,240,0.12);
  }
  .glow-violet {
    box-shadow: 0 0 20px rgba(139,92,246,0.35), 0 0 60px rgba(139,92,246,0.12);
  }
  .glow-soft {
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.08);
  }
  .glass-card {
    background: linear-gradient(135deg, rgba(0,212,240,0.06) 0%, rgba(139,92,246,0.04) 100%);
    border: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(12px);
  }
  .glass-nav {
    background: rgba(8,13,26,0.75);
    backdrop-filter: blur(20px) saturate(1.5);
  }
}
```

### 8.3 CSS 变量注入（追加到 :root 和 .dark）

```css
:root {
  --ag-glow-cyan:   0 0 20px rgba(0,212,240,0.35), 0 0 60px rgba(0,212,240,0.12);
  --ag-glow-violet: 0 0 20px rgba(139,92,246,0.35), 0 0 60px rgba(139,92,246,0.12);
  --ag-glow-amber:  0 0 20px rgba(245,158,11,0.40), 0 0 60px rgba(245,158,11,0.15);
  --ag-glow-soft:   0 8px 32px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.08);

  --ag-ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ag-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### 8.4 暗色模式默认策略

当前已是系统跟随，建议改为**暗色优先**（匹配 Lovart 模式）：

```ts
/* src/components/ThemeProvider.tsx */
/* 修改 getInitialTheme()：找不到存储值时默认 dark */
function getInitialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return 'dark'; // 改为默认 dark（原为跟随系统）
}
```

---

## 九、「果味」设计 Dos & Don'ts

### ✅ 要做的

| 做什么 | 为什么 |
|---|---|
| 背景用深空色，不用纯黑 | 纯黑 `#000000` 是廉价感；宇宙深蓝有深度 |
| 渐变按钮加发光阴影 | 光效让元素「发光」，像果实在阳光下 |
| 卡片用玻璃态（毛玻璃+色彩叠加） | 层次感，表面像水果皮带有光泽 |
| 全站最多出现 1 处 `aether` 三色渐变 | 稀缺性让它成为视觉锚点 |
| 电石灰 `#D9F20A` 作精准点缀 | 这个颜色是「果味」的最强信号，但一定要克制 |
| 字母间距负值用于 Display 字体 | 现代紧凑感，区别于普通 UI |

### ❌ 不要做的

| 不做什么 | 为什么 |
|---|---|
| 不要大面积浅色背景 + 蓝色按钮 | 这是 SaaS 平庸模板，失去「果味」 |
| 不要用纯色（无渐变）作为主按钮 | 单色按钮在深色背景下失去层次 |
| 不要所有元素都加发光 | 全场发光 = 没有发光，光晕要稀缺 |
| 不要 card 圆角 < 12px | 小圆角在深色主题下显硬，与有机感冲突 |
| 不要用橙色+蓝色（廉价撞色） | 琥珀金要配紫色/青蓝，不配扁平蓝 |
| 不要用 emoji 当图标 | 破坏精心设计的视觉密度 |
| 不要把 `lime` 用在文字高亮以外 | 电石灰过于强势，只适合极小点缀 |

---

## 十、实施优先级

| 优先级 | 项目 | 影响 |
|---|---|---|
| P0 | 暗色主题默认化 + 深空背景色系更新 | 整体气质转变最大 |
| P0 | Primary 按钮改为渐变 + glow | 每个页面都有 |
| P1 | 卡片升级为玻璃态（glass-card） | 图片瀑布流视觉提升明显 |
| P1 | 导航栏更新（glass-nav + logo 渐变字） | First impression |
| P1 | Display 字体引入（Bricolage Grotesque） | 大标题「果味」感来源 |
| P2 | 徽章/Tag 色彩系统 | 细节品质感 |
| P2 | 输入框 focus 状态 glow | 交互反馈升级 |
| P3 | 电石灰 `#D9F20A` 高亮点缀（悬停、选中） | 「签名」点睛 |
| P3 | Favicon / 四芒星图标更新 | 品牌完整性 |
