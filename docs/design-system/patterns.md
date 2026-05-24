# Patterns

Canonical source: `src/design-system/design.md`.

This file is a reference note for route-to-pattern coverage. Page patterns here must conform to the canonical static design system.

本文件记录页面级 pattern。它们是后续页面重做的默认选择，但不是自动迁移清单，也不定义业务生产流程。

## Image Workbench

适用区域：

- `src/pages/Create.tsx`
- `src/pages/Workspace.tsx`
- `src/pages/Explore.tsx`

结构：

- 图片或生成结果是视觉主角。
- UI 控件承托任务，不抢占画面。
- 操作区保持 cream primary + muted ghost。
- 运行中状态使用小面积 lime。

## Prompt Composer

结构：

- 外层 `Surface`。
- prompt textarea 不需要重边框。
- 参数栏使用 compact fields。
- 上传入口使用 icon button 或 dashed state surface。

验收：

- mobile 不横向溢出。
- 输入、参数、上传和主动作在桌面与移动视口都保持清楚层级。
- 余额、失败和重试反馈必须可见。

## Status Surface

适用状态：

- loading
- empty
- search empty
- signed-out
- queued
- running
- succeeded
- failed

验收：

- running = lime。
- success = green。
- error = red。
- commercial = orange。
- 不把 warning / error 混成 orange。
- loading 不使用大面积 lime 背景。

## Commercial CTA

适用区域：

- `/account`
- purchase / upgrade / billing panels

规则：

- orange 表达商业动作。
- 不和 lime selected state 竞争。
- 一个视口内避免多个同权重 orange CTA。
- 商业动作需要明确余额、价格、状态或失败反馈。

## AI UX Guardrails

生成类 workflow 必须考虑：

- reference image 只是生成参考，不保证 100% 还原。
- 生成失败必须可恢复。
- 消耗积分或商业动作需要明确反馈。
- 删除、公开发布、批量下载等高影响动作需要清晰确认。
- 历史任务和结果应可追踪。

### High-Impact Action Confirmation

以下动作必须使用阻塞式确认，不允许静默执行：

- 删除历史任务组。
- 公开发布历史任务组或生成结果。
- 取消公开历史任务组或生成结果。

第一版策略采用确认 + 成功/失败 toast，不提供假 undo。若服务端未来提供软删除或可恢复发布状态，再重新评估 undo。

批量下载默认不需要阻塞式确认，因为下载本身不改变服务端状态、不改变外部可见性、当前也不涉及额外费用。批量下载必须提供 loading 和成功/失败反馈；如果未来进入大批量、付费导出，或用户在设置页自行开启下载确认，再升级为确认流程。

普通生成不需要每次阻塞式确认，避免破坏 `/create` 的主创作流。但生成按钮附近必须有明确余额/额度反馈，失败时必须有 toast 或错误状态。只有高成本、多图、不可预估消耗、余额不足临界，或未来新增付费导出/高级模型时，才需要确认或明确二次提示。

确认文案至少说明：

- 动作对象。
- 影响范围，例如图片数量、任务组或可见性变化。
- 动作后果，例如删除后可能无法从历史页恢复，公开后外部用户可能可见，取消公开后外部链接可能失效。

## Legacy Boundaries

不要从以下区域复制新增 UI pattern，除非另有明确决策：

- inactive legacy route
- deprecated cyan / violet / Genesis gradient
- 外部临时审计包中的非当前项目架构描述

旧页面只能作为历史证据，不能作为新增 UI 的视觉、组件、按钮样式或 token source of truth。`src/pages/Ecommerce.tsx` 不应被复制为新页面结构来源。

## Raw Value Exceptions

页面级 raw values 默认不允许新增。例外必须满足以下条件之一：

- 既有 legacy surface 迁移中，且同一改动没有扩大影响范围。
- 视觉例外已有 pattern 或 ADR 支撑。
- 现有 token / primitive 无法表达，且本次同步补充 token、primitive 或文档说明。

允许的 primitive 内部例外：

- 少量 Tailwind arbitrary values，用于 token 尚无法表达的精确布局或 shadow。
- 与运行时 helper 绑定的 CSS 变量，例如 easing 或 glow。

禁止的新增写法：

- 页面内直接散落 hex color。
- 页面局部自造按钮、卡片、状态色或 focus ring。
- 重新引入 cyan、violet 或 Genesis gradient 作为主视觉。
- 用 `.btn-*`、`.card-*`、`.glow-*` 作为新增 UI 的主要实现方式。

## Hardcoding Prevention

新增页面或重做旧页面时，按这个顺序落地：

1. 先选择 route-to-pattern coverage 中的页面 pattern。
2. 再使用 `src/components/design-system/` primitive。
3. 需要新语义时先扩展 primitive 或 token。
4. 最后才允许有记录的 raw value 例外。

Agent 修改 UI 时必须检查：

- 是否使用 Warm Charcoal UI，而不是旧品牌主视觉。
- 是否通过 token / primitive 表达颜色、间距、状态和 focus。
- 是否保留 high-impact confirmation、toast 和 accessibility contract。
- 是否需要同步 `/design-system` preview。
- 是否需要同步 `scripts/design-system-smoke.mjs`。

## Preview Route

`/design-system` 是内部预览路由：

- 不加进正常导航。
- 可以用于截图、smoke 和人工审查。
- 可以随着 primitives 增长，但不要变成营销页。

## Page Pattern Coverage

本表用于告诉后续 agents：活跃路由优先复用哪些 pattern，以及每个页面至少要覆盖哪些状态。它不是迁移清单。

| Route / Area | Primary pattern | Required states | Notes |
|---|---|---|---|
| `/create` | Image Workbench, Prompt Composer, AI UX Guardrails | input-ready, reference-added, generating, error, balance/credit feedback | 普通生成不每次确认；高成本、多图或不可预估消耗才需要确认。 |
| `/workspace/:taskId` | Image Workbench, Status Surface, Modal / Preview | loading, succeeded, failed, preview, regenerate | 图片是主角，后续编辑和下载动作保持 quiet controls。 |
| `/explore` | Gallery Masonry, Image Workbench | loading, empty, search result, prompt reuse, favorite feedback | 未登录默认落地页；复用提示词是主转化路径。 |
| `/history` | Task Lifecycle, Gallery Masonry, High-Impact Confirmation | loading, empty, error, delete confirm, publish confirm, unpublish confirm | 删除、公开、取消公开必须确认；普通下载不确认。 |
| `/favorites` | Gallery Masonry, Status Surface | loading, empty, search empty, login required, favorite removal | 收藏绑定 AetherGenix 账户。 |
| `/tasks` | Task Lifecycle, Status Surface | queued, running, succeeded, failed, empty, filter empty | 状态色必须走 `StatusPill` 语义。 |
| `/account` | Account / Admin Boundary, Commercial CTA | guest, signed-in, balance synced, balance pending, recharge entry missing | 普通用户只看到 AetherGenix 账户和可用余额，不暴露 Sub2API 技术词。 |
| `/config` | Account / Admin Boundary, Form Surface | ordinary user redirect/limited view, admin settings, save success, save error | 技术集成词只允许出现在管理员配置区域。 |
| `/recharge` | Account / Admin Boundary, Commercial CTA | legacy redirect or handoff context | 当前按 ADR 0003/0004 收敛到 `/account` 作为普通用户余额入口。 |
| `/design-system` | Preview Route | desktop preview, mobile preview, smoke marker | 内部预览，不进入正常导航。 |
| `/ecommerce` | Legacy Boundary | redirect to `/create` | 旧页面只保留历史证据身份，不作为新 UI source of truth。 |

新增页面或重做页面时，先找到对应 pattern。只有当 pattern 无法表达产品语义时，才扩展设计系统。
