# Scale Alignment

Canonical source: `src/design-system/design.md`.

This file is a reference note for design-system governance scale. It does not supersede the canonical static design system.

本文件只服务 AetherGenix 设计系统治理。它用于让后续 agent 在修改 UI、重做页面、补充文档或调整门禁时保持同一尺度，不在这里定义业务生产流程、数据模型、模板路线或媒体生成流程。

## Scale Route

Legend: L0 human intent -> L1 project objective -> L2 phase objective -> L3 current request -> L4 active branch -> L5 immediate action

Current route:

- L0: 尽早防住设计债务，让后续页面和 agent 修改不再各自发明视觉系统。
- L1: AetherGenix Image 维护一个 repo-local、AI-ready、可验证的 Warm Charcoal UI 设计系统。
- L2: 当前阶段落地 token、component、pattern、accessibility、governance 和 smoke gate。
- L3: 当前请求是把设计系统文档从跑偏内容中恢复出来，重新聚焦规范落地和防硬编码。
- L4: 当前支线是把设计系统收敛到 `src/design-system/design.md` canonical static spec，并让 smoke gate 防止同类漂移再次进入。
- L5: 眼前动作是编辑 canonical spec、静态 preview、参考文档、门禁，并运行验证命令。

Where attention should go:

只处理能直接服务设计系统治理的内容：token 来源、primitive 使用、页面 pattern、可访问性契约、raw value 例外、compatibility-only utilities、旧品牌残留、隐藏预览路由和 CI/smoke 门禁。

Next move:

continue within design-system governance; move one level up only when一个建议无法映射到 token/component/pattern/accessibility/governance/smoke gate。

Confidence:

- facts: `src/design-system/design.md` 是 canonical static spec；`src/design-system/preview/index.html` 是 canonical static preview；`src/index.css` 是运行时 token 实现；Tailwind v4 `@theme` 是可扩展 token 层；`src/components/design-system/` 是 repo-local React primitives；`/design-system` 是内部执行层预览路由。
- inference: 文档和门禁应该优先阻止硬编码、旧品牌复活、局部自造组件和页面级 raw value 扩散。
- unknown: 后续产品或业务流程的长期形态不在本目录决策。

## In Scope

- Canonical source of truth: `src/design-system/design.md`。
- Canonical static preview: `src/design-system/preview/index.html`。
- Runtime token implementation: `src/index.css`。
- Extensible token layer: Tailwind v4 `@theme`。
- Runtime helpers: `:root --ag-*` 只保留 easing、glow 等运行时 helper。
- Compatibility-only utilities: `.btn-*`、`.card-*`、`.glow-*` 不作为新增 UI source of truth。
- Repo-local primitives: `src/components/design-system/`。
- Internal preview: `/design-system`，不进入普通用户导航。
- Reference docs: `docs/design-system/README.md`、`tokens.md`、`components.md`、`patterns.md`。
- Accessibility contracts: dialog、drawer、focus restore、high-impact confirmation。
- Gates: `npm run check:brand`、`npm run smoke:design-system`、CI 里的同等门禁。

## Out Of Scope

- 不在 `docs/design-system/` 定义业务生产流程。
- 不在 `docs/design-system/` 讨论持久化模型、项目实体或服务端拆分。
- 不把旧页面视觉、旧组件结构、旧按钮样式或旧 token 写法恢复为新增 UI 模式。
- 不把 cyan、violet 或 Genesis gradient 恢复为新增 UI 主视觉。
- 不把外部临时审计包或历史页面当作当前设计系统事实来源。

## Working Rules

- 新增 UI 先查 `src/design-system/design.md` 和 `src/components/design-system/`，再查 `docs/design-system/patterns.md`。
- 只有当现有 primitive 无法表达稳定语义时，才扩展 primitive。
- 页面级 raw value 必须有明确例外理由，默认先使用 token 和 primitive。
- 旧全局 utility 只能兼容历史 surface；新增 UI 不继续依赖它们。
- 高影响动作必须确认，并且成功/失败必须有 toast 或等价反馈。
- 每个新建议都必须能映射到 token、component、pattern、accessibility、governance 或 smoke gate。

## Drift Response

当文档或实现开始讨论不属于设计系统治理的内容时，后续 agent 应先停止扩写，把相关内容降级为外部背景或独立议题，等用户明确确认后再处理。不要把支线内容写进 `docs/design-system/` 作为事实来源。
