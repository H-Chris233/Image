# Batch 1 — 引导对齐（计划 + 复盘修正）

> ⚠️ **复盘修正（panel review 后）—— 实际状态，别再被旧计划误导：**
> 
> - ☑ 术语统一 场景/生意类型/商品图、副标题去「描述场景」、去「v1」版本号 —— 已做并验证(tsc + test:account 绿)，PR #157。
> - ◐ **"删入口页" 未真删**：实现成"进 /create 默认直进向导 + 关闭回落 CreateHero"。评审团判为 H3（伏击+循环+两套相反 gating）→ 入口模型改走 `BACKLOG.md` **D1 待决策**。
> - ◐ **场景「最常用」兜底** 已加，但有 provenance 陷阱（聚合卡只显 label，国内卖家可能拿到 cross-border 英文 prompt）→ `BACKLOG.md` D2/B2-6。
> - ✗ **「推荐」小标未做**：下文 D 项是计划，代码没实现，默认值只在 state（用户看不出）→ `BACKLOG.md` B2-2。
> - ✗ **截图未重截**：`doc/UI/*.png` 仍是改前旧图（DoD#4 欠账）→ `BACKLOG.md` F4。
> 
> 当前唯一权威待办见 [`BACKLOG.md`](./BACKLOG.md)。以下为 Batch 1 的原始计划存档。

---

## A. 术语统一（场景/生意类型/商品图）— P2 ☑

Create.tsx / SceneBrowser.tsx / CreateFlowWizard.tsx 全流程替换 模板·类目·客户类型 → 场景·生意类型；副标题去「描述场景」；上传页「已选模板」→「已选场景」、「v1 暂只支持单图」→「目前支持单张商品图」、「返回选模板」→「返回选场景」。

## B. 删入口页 — P5 ◐（未真删，见顶部修正 / D1）

原计划：点「创作」直接进第 1 步。实际：默认直进 + 关闭回落 CreateHero。

## C. 去版本号 — P6 ☑

## D. 第 3 步默认值 1:1/1张 + 「推荐」小标 — P1 ◐

默认值 ☑ 已在 createWizardState；「推荐」小标 ✗ 未实现（B2-2）。

## E. 场景分类兜底「最常用」— P1 ◐

已加默认选中的 POPULAR 入口；provenance 陷阱待修（D2/B2-6）。
