# Components

Canonical source: `src/design-system/design.md`.

This file is a reference note for the React execution layer in `src/components/design-system/`. Component rules here must conform to the canonical static design system.

当前组件层位于 `src/components/design-system/`。组件只负责稳定 UI 语言，不绑定业务数据。

## Component Scope

本目录只记录 repo-local app primitives：按钮、输入、surface、状态、弹窗、任务列表、账户面板和页面工作台等 UI 基础构件。组件可以承载交互和可访问性约束，但不绑定业务数据，也不定义更高层的业务流程。

新增 primitive 前先确认：

- 现有 primitive 或 pattern 无法表达当前 UI 语义。
- 这个组件会在多个页面、弹窗或状态中复用。
- 组件 API 可以用 token 和语义 variant 表达，而不是暴露页面级硬编码样式。

## `Button`

用途：提交、生成、下载、充值、删除等明确命令。

Variants:

- `primary`：cream pill，默认主动作。
- `ghost`：次要动作。
- `lime`：选中、运行中、少量高优先状态。
- `orange`：充值、购买、商业动作。
- `danger`：删除、失败恢复中的危险动作。
- `plain`：低权重文本/图标动作。

规则：

- 同一视口只保留一个最强 primary。
- 不用 lime 承载普通 submit。
- 不用 orange 承载导航或选中状态。

## `IconButton`

用途：工具栏、上传、刷新、通知、更多操作。

必须提供 `label`，组件会同步设置 `aria-label` 和 `title`。

## `Surface`

用途：panel、dialog body、state container、tool group。

Tones:

- `default`
- `raised`
- `subtle`
- `dashed`
- `lime`
- `orange`
- `danger`

规则：

- 页面 section 不默认做浮动大卡片。
- 内层分组优先用低透明 surface，不堆厚卡。

## `Field`, `TextInput`, `TextareaField`, `SelectField`

用途：表单基础控件。

规则：

- label 使用 `text-xs`。
- focus 使用 lime。
- error 使用 red。
- placeholder 使用 muted。
- 生产工具里的输入高度默认 `h-10`。

## `StatusPill`

用途：任务、队列、成功、失败、商业状态。

Tones:

- `neutral`
- `queued`
- `running`
- `success`
- `error`
- `commercial`

规则：

- `running` 用 lime。
- `commercial` 用 orange。
- `error` 用 red，不用 orange。

## `SurfaceState`

用途：empty、loading、error、success、info。

规则：

- empty 和 upload 使用 dashed warm surface。
- error 必须提供可恢复动作时，优先一个主动作。
- loading 不使用大面积 lime 背景。

## `SkeletonBlock`

用途：列表、图片、文字加载占位。

规则：

- 使用低透明 warm surface。
- 不使用蓝紫 shimmer。

## `SegmentedControl`

用途：create mode、filter mode、工作流模式切换。

规则：

- active 使用 cream surface。
- inactive 使用 muted text。
- 不使用 underline tab 取代 mode switch。

## Dialog / Drawer Accessibility Contract

适用区域：

- `AuthModal`
- `ImagePreviewModal`
- `PromptEditorModal`
- `TaskDrawer`
- high-impact confirmation dialogs

最低要求：

- 使用 `role="dialog"`。
- 使用 `aria-modal="true"`，除非是非阻塞 drawer。
- 使用 `aria-labelledby` 指向可读标题。
- 打开后把焦点移入 dialog，优先聚焦主动作或关闭按钮。
- 关闭后把焦点还给触发元素。
- `Escape` 可以关闭非破坏性 dialog；提交中或高风险动作执行中可以暂时禁用关闭。
- modal dialog 需要防止键盘焦点跑到背景内容。
- 背景点击是否关闭取决于风险：预览类可以关闭；删除、公开、取消公开等确认类不应因为误点背景而执行动作。
- 关闭按钮必须使用 `IconButton` 或同等 `aria-label` 语义。

参考实现：

- `AuthModal` 和 `ImagePreviewModal` 已经包含较完整的 focus trap、Escape 和 focus restore。
- `History` 的 high-impact confirmation dialog 是轻量 tracer bullet，后续如扩展到更多页面，应抽象前先确认复用范围。

Drawer 规则：

- 任务中心这类覆盖式 drawer 应至少提供关闭按钮、可见标题和清晰的 overlay 状态。
- 如果 drawer 阻塞主页面操作，应按 modal dialog 处理焦点。
- 如果 drawer 是非阻塞辅助面板，必须保证键盘用户仍能理解当前焦点和关闭路径。

## Promotion Rules

当某个局部 UI pattern 连续出现在多个页面时，再考虑提升为 primitive。提升时必须同步：

- `src/components/design-system/` 实现和 export。
- `/design-system` 预览样例。
- 本文件的用途、variant、状态和可访问性规则。
- `scripts/design-system-smoke.mjs` 中必要的存在性或文档检查。

不要为了单个页面新增只包装样式的组件。页面级样式应先收敛到现有 primitive、token 或 pattern，只有复用边界清楚后再抽象。
