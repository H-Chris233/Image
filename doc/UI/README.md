# AetherGenix · Create Flow — Design North Star (Index)

> Single source of truth for the core `/create` pipeline.
> 目的：让每一次 UI 改动都有据可依，不再"每次改完都很随机"。
> 规则：任何改 `/create` 的 PR，必须能指回本文件的某条原则，或某页文档的某条方案。

## Pages (1 md = 1 page)

| # | Page | Doc | Screenshot |
|---|---|---|---|
| P0 | Create 入口页 | [01-create-entry.md](./01-create-entry.md) | `01-create-entry.png` |
| P1 | 选择场景 | [02-select-scene.md](./02-select-scene.md) | `02-select-scene.png` |
| P2 | 上传商品 | [03-upload.md](./03-upload.md) | `03-upload.png` |
| P3 | 微调输出 | [04-tune.md](./04-tune.md) | `04-tune.png` |
| P4 | 生成结果 / 失败态 | [05-result-failed.md](./05-result-failed.md) | `05-result-failed.png` |

---

## 0. Why changes kept looking random (root cause)

不是执行力问题，是**缺少唯一基准**。过去每开一个 agent 窗口，它都从零猜"用户是谁、要解决什么、长什么样"，于是：术语漂移（类目/模板/场景/客户类型）、视觉漂移（圆角/间距/强调色/空状态各页不一）、优先级漂移（有人修 bug、有人改文案，没有先后共识）。

**解法**：本目录锁死三件事 —— 用户与目标（§1）、设计语言（§2）、动线与逐页方案（各页 md）。之后所有 agent 只允许在此基准上"对齐 + 打磨"，不允许重新发明方向。

## 1. Product vision (the shared "why")

- **One user.** 中小卖家 / 个体店主，**非设计师**，决策耐受度低。典型：自己拍图、图很丑的小红书店主。怕做错、怕花钱看不到结果。
- **One job.** 上传一张商品图 → **几步内拿到一张能直接用的商品图**。不是 PS，不是 prompt 平台。
- **One feeling.** "它替我拿主意了"。每屏都应**减少**而非增加决策。

### Design principles（引用写编号 P1–P6）

- **P1 替用户做默认决定** — 任何选择都有合理预选值，用户可改但不必改。
- **P2 一个概念一个词** — 全流程只用 **「场景」**（不用 模板/类目/客户类型 当同义词）。
- **P3 先给信心再要投入** — 先让用户看到"会出什么样"，再要求上传/注册/付费。
- **P4 失败要温柔、可重试、说人话** — 永不暴露 `Sub2API / ConnectError` 等内部错误。
- **P5 舞台让给当前任务** — 当前步骤永远是视觉主角；历史/营销/说明退居次要。
- **P6 像真实产品截图** — 每屏至少满足 4 条 design-quality（层级/节奏/深度/排版/语义化色彩/有设计感的状态）。

## 2. Design language (lock this)

Tokens 已在 `src/index.css`，规则是**怎么用、统一用**。

| Aspect | Decision |
|---|---|
| Theme | 暗色单主题（本阶段不做亮色） |
| Accent `#E3FF74` | **只给一屏唯一主操作**（主 CTA / 当前进度 / 选中态）；不做装饰大色块 |
| Surfaces | 只两层：页面底 / 抬升卡片；圆角与描边走统一 token |
| Typography | 单一字阶；强调靠**字号对比**，不是到处加粗 |
| Spacing | 有节奏：卡内紧、区块间松 |
| States | 每个可交互元素都要 hover / focus / active / selected / disabled；选中态用 lime 描边+浅底 |
| Imagery | 场景样例必须**真实出图**，不能 SVG 简笔示意 |
| Errors | 友好标题 + 一句人话原因 + 主按钮"重试"；技术细节折叠进"详情" |

**Vocabulary lock（违反即视为 bug）**：✅`场景 / 生意类型 / 商品图`　❌`模板 / 类目 / 客户类型`

## 3. Information architecture

```
/create
  └─ Wizard（全屏，3 步，进度 33/67/100）
       1 选择场景 → 2 上传商品图 → 3 微调并生成
  ─ 生成结果区（出图 / 失败重试）
  ─ 右侧任务栏（创作时弱化）
```

**关键决策**：删除"入口介绍页"这一层 —— 点「创作」**直接进第 1 步**。介绍属于落地页，不属于工作台。

## 4. How to keep moving consistently (工作法)

**Definition of Done（每个 `/create` UI 改动）：**
1. 指明对应哪条原则（P1–P6）或哪页方案。
2. 不引入新术语（过 §2 vocabulary lock）。
3. 交互元素 5 态齐全。
4. 改完在 1440 宽**整页**截图，更新 `doc/UI/` 对应图。
5. 不把任何内部错误/字段/prompt 暴露给用户。

**Agent 协作规则**：新开窗口先读本目录，只做"对齐基准"的事；要改方向必须先改本文件并经确认，否则视为越界。

## 5. Sequencing（先做什么）

| Batch | 内容 | 风险 | 价值 |
|---|---|---|---|
| **1 引导对齐** | 删入口页 / 统一术语 / 修副标题 / 第3步默认值 / 去版本号 / 场景分类兜底 | 极低 | 立刻减压，最快上线 |
| **2 信心与失败** | 真实样例图 / 上传正反例 / 失败说人话+重试 / 费用提示 | 中 | **决定首个真实卖家是否留下**（真正卡点） |
| **3 视觉系统** | 强调色/圆角/间距/状态统一 / 任务栏让位 | 中 | 让产品"像真实产品" |
