# AetherGenix · Create Flow — Design North Star (Index)

> Single source of truth for the core `/create` pipeline.
> 目的：让每一次 UI 改动都有据可依，不再"每次改完都很随机"。
> 规则：任何改 `/create` 的 PR，必须能指回本文件的某条原则，或某页文档/`BACKLOG.md` 的某条。
> **换窗口/新 agent：先读 [`BACKLOG.md`](./BACKLOG.md) 决定做什么，再回本文件看原则。**

## Docs (read order)

| 文件 | 作用 |
|---|---|
| [BACKLOG.md](./BACKLOG.md) | **唯一权威待办**：排好序的 to-do + ⛔待决策项。先读这个。 |
| README.md（本文件） | 北极星：用户/原则/设计语言/工作法 |
| [PANEL-REVIEW.md](./PANEL-REVIEW.md) | 6 视角评审团 + 单 HIG 的合并评审证据（细节出处） |
| [BATCH1.md](./BATCH1.md) | Batch 1 计划 + 复盘修正（哪些真做了/欠账） |
| [01-create-entry.md](./01-create-entry.md) … [05-result-failed.md](./05-result-failed.md) | 逐页原始批评+方案（截图待重截，见 BACKLOG F4） |

## Pages (1 md = 1 page)

| # | Page | Doc | Screenshot(待重截) |
|---|---|---|---|
| P0 | Create 入口 | 01-create-entry.md | 01-create-entry.png |
| P1 | 选择场景 | 02-select-scene.md | 02-select-scene.png |
| P2 | 上传商品 | 03-upload.md | 03-upload.png |
| P3 | 微调输出 | 04-tune.md | 04-tune.png |
| P4 | 结果/失败 | 05-result-failed.md | 05-result-failed.png |

---

## 0. Why changes kept looking random (root cause)

不是执行力问题，是**缺少唯一基准**。过去每开一个 agent 窗口都从零猜"用户是谁、要解决什么、长什么样"，于是术语漂移、视觉漂移、优先级漂移。本目录锁死：用户与目标(§1)、设计语言(§2)、动线(§3)、待办与决策(`BACKLOG.md`)。之后只允许"对齐+打磨"，不许重新发明方向。

## 1. Product vision (the shared "why")

- **One user.** 中小卖家/个体店主，**非设计师**，决策耐受度低，**手机优先**。典型：自己拍图、图很丑的小红书店主。怕做错、怕花钱看不到结果。
- **One job.** 上传一张商品图 → **几步内拿到一张能直接用的商品图**。
- **One feeling.** "它替我拿主意了"。每屏都应**减少**而非增加决策。

### Design principles（引用写编号 P1–P8）

- **P1 替用户做默认决定** — 任何选择都有合理预选值并**让用户看得出是替他选好的**。
- **P2 一个概念一个词** — 只用 场景/生意类型/商品图；视觉语法同理(同一种高亮=同一种含义)。
- **P3 先给信心再要投入** — 先让用户看到"会出什么样(最好是他自己的图)"，再要求上传/登录/付费。
- **P4 失败温柔可重试说人话** — 永不暴露 Sub2API/ConnectError/原始 prompt；失败处就近给重试。
- **P5 舞台让给当前任务** — 当前步骤是唯一视觉主角；模态只在用户主动发起时全屏。
- **P6 像真实产品截图** — 每屏≥4 条 design-quality；样例必须真实出图、不用占位/盗链 stock。
- **P7 无障碍达标(WCAG 2.2 AA)** — 对比度≥4.5:1；模态是真 dialog(role/焦点陷阱/Esc)；状态不靠纯色；控件有正确 role/aria-live。*(评审团新增)*
- **P8 移动优先** — 以 360–390px 单手为基准：触屏可见的affordance、相机优先上传、主 CTA 沉底可达、无隐藏横滚。*(评审团新增)*

## 2. Design language (lock this)

| Aspect | Decision |
|---|---|
| Theme | 暗色单主题 |
| Accent `#E3FF74` | **只给一屏唯一主操作**(主 CTA/当前进度/选中值)；filter tab 等用更安静的高亮，别和取值/主操作同款实心 lime |
| Surfaces | 两层；圆角/描边统一 token |
| Typography | 单一字阶；强调靠字号对比 |
| States | hover/focus/active/selected/disabled 齐全；**选中态 lime 描边+浅底填充**(别只 2px 边)；disabled 用中性色不用淡 lime |
| Imagery | 真实出图(before→after)，本地资源，不盗链 stock |
| Errors | 友好标题 + 一句人话原因 + 就近「重试」；技术细节折叠「详情」 |
| Contrast | 正文/helper ≥4.5:1；状态色必配图标/形状 |

**Vocabulary lock（违反即 bug）**：✅`场景/生意类型/商品图`　❌`模板/类目/客户类型`

## 3. Information architecture

```
/create
  └─ Wizard（3 步，进度 33/67/100）：1 选择场景 → 2 上传商品图 → 3 微调并生成
  ─ 生成结果区（出图 / 失败就近重试）
  ─ 右侧任务栏（创作时弱化）
```
**未决**：入口是否全屏自动弹 / 内联 / 先 hero（见 `BACKLOG.md` D1）。分类轴是否重构（D3）。

## 4. How to keep moving consistently (工作法)

**每个 `/create` UI 改动的 DoD：**
1. 指明对应哪条原则(P1–P8)或 `BACKLOG.md` 哪条。
2. 不引入新术语(过 §2 vocabulary lock)。
3. 交互元素 5 态齐全；过 P7 无障碍基线。
4. 改完在 1440 + 360px **整页**截图，更新 `doc/UI/` 对应图。
5. 不把任何内部错误/字段/prompt 暴露给用户。

**协作规则**：新窗口先读 `BACKLOG.md`；⛔决策项未拍板**禁止实现**；要改方向必须先改本文件/BACKLOG 并经确认，否则视为越界。

## 5. Status & open decisions（防失忆）

- **当前**：Batch 1(术语/副标题/版本号)已合 PR#157 并验证；"删入口页/场景兜底"为半成品（见 BATCH1 复盘）。
- **评审团判决**：对首个付费卖家 = **不能上**，两个 blocker(F1 失败态泄漏、F2 付费前无证明)，详见 `BACKLOG.md` / `PANEL-REVIEW.md`。
- **待你拍板**：D1 入口模型 / D2 最常用方向 / D3 分类轴（`BACKLOG.md` 顶部）。**未决前相关代码不动。**

## 6. Sequencing
1. **上线前灭火**：F1 失败态 → F2 先证明后付费 → F3 入口+无障碍(依赖 D1) → F4 重截图。
2. **Batch 2 信心与可用**：真实样图/推荐场景/选中态/移动端/无障碍补齐。
3. **Batch 3 打磨**：分类轴重构/结果页主操作/术语最后一公里。
