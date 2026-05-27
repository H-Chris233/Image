# PRD — AetherGenix 电商场景图生成
## `/ecommerce` 功能产品需求文档 v0.1（草稿，待打磨）

> **版本：** v0.1 DRAFT  
> **创建日期：** 2026-05-25  
> **状态：** 🟡 草稿 — 等待打磨  
> **数据来源：** `docs/competitive-teardown/ecommerce-image-gen-teardown.md` · `plans/ecommerce-workflow-paradigm-shift.md` · `docs/workflow-design-system.md` · `docs/ux-references/workflow-benchmark.md`

---

## 0. 一页纸摘要

| 维度 | 内容 |
|------|------|
| **产品名** | AetherGenix 电商场景图 |
| **核心价值主张** | 3 步完成商品主图场景化——选风格 → 放商品 → 看结果 |
| **目标用户** | Shopify / 独立站卖家（全球），中国独立站 / 多平台卖家 |
| **当前状态** | Template-First 重构已完成（Blueprint 4步），3步路径对齐竞品水平 |
| **下一阶段目标** | 从「追平」到「反超」：AI 产品分析驱动的智能推荐 + 批量生成 |
| **竞争威胁** | 🔴 HIGH — Pebblely/豆绘AI 在 UX 和功能宽度上领先 |
| **独有护城河** | AI 产品特征自动解析（竞品均无）|

---

## 1. 问题陈述

### 1.1 用户痛点（原始）

电商卖家需要为每款商品生成高质量的场景主图（用于 Shopify / 淘宝 / 小红书 / 独立站）。手工拍摄场景图成本高（拍摄 + 后期：数百～数千元/套），AI 生图工具是天然替代品。

**当前 AetherGenix 的问题：**
1. **路径太长**：到首张结果需要 7+ 步操作（Blueprint 修复后已降至 3 步）
2. **无即时预期**：模板缩略图是渐变色块，用户不知道能生成什么效果
3. **结果在错误位置**：生成结果出现在侧边任务抽屉，而非主视口（Blueprint 修复后已解决）
4. **无批量能力**：卖家通常有 10~100 款商品，需要每次手动重复操作

### 1.2 市场空白

竞品分析揭示的定位空白：

```
         高「专业功能深度」
                 ↑
 万相营造 (淘宝生态) |    豆绘AI (多工具矩阵)
                 |
 ←──────────────────────────────→
 低易用性                    高易用性
                 |
                 |  Pebblely (Shopify卖家)
     AetherGenix |
   ↗ 目标象限     ↓
         低「专业功能深度」
```

**目标象限（6个月）：** 右上 — 高功能深度 + 高易用性  
**当前特殊优势：** AI 产品分析——无论竞品在哪个象限，这个能力都不存在

### 1.3 我们的假设

> 如果一个卖家能在 60 秒内看到第一张高质量场景图，并且这张图是基于 AI 对其商品的理解自动推荐的风格，他会付费续订。

验证此假设的关键指标：TTFV（Time to First Value）和首次付费转化率。

---

## 2. 目标用户

### Persona A：全球独立站卖家「Alex」
- 在 Shopify 上销售家居 / 配饰产品，月销 50~500 单
- 熟悉 Canva，会用 AI 工具，但不懂 PS / AI 绘图
- 痛点：Pebblely 模板数量少，且无法输出中文平台要求的尺寸
- 目标：每次上新，30 分钟内为 5 款产品生成 3~5 张场景图
- **AetherGenix 机会：AI 分析帮他找到最适合商品气质的场景风格，节省试错时间**

### Persona B：中国多平台卖家「小林」
- 在淘宝 / 小红书 / 独立站同时运营，每周上新 2~10 款
- 用过豆绘AI，觉得工具太多太乱
- 痛点：豆绘AI 工具分散，每个场景要进不同入口；万相营造要绑淘宝账号
- 目标：一个工具解决所有平台的主图需求
- **AetherGenix 机会：统一工作台 + 批量生成，减少工具切换成本**

### Persona C：设计师 / 代运营「晓雯」
- 服务 5~20 个品牌客户，每周处理 50+ 张图
- 熟悉 AI 生图，对质量要求高
- 痛点：没有批量 API，每张都要手动操作
- 目标：提升产出效率 3~5 倍
- **AetherGenix 机会：批量生成 + 项目管理（按品牌分组历史记录）**

---

## 3. 产品目标 & 成功指标

### 本季度目标（Q2 2026）

**O：让电商生图工作流成为卖家的默认选择**

| Key Result | 目标值 | 当前值 | 备注 |
|-----------|--------|--------|------|
| KR1：TTFV（首张结果时间） | < 60s | ~3min（修复前）→ ~1min（修复后） | Blueprint 已改善 |
| KR2：激活步骤数 | ≤ 3 步 | 3步（已达成） | 已完成 |
| KR3：模板缩略图真实率 | 100% | 0%（当前全是渐变色块） | 需填入 exampleImageUrl |
| KR4：首次生成成功率 | > 80% | 未知（需埋点） | 需数据埋点 |

### 中期目标（Q3 2026）

| Key Result | 目标值 | 备注 |
|-----------|--------|------|
| KR5：批量生成上线 | MVP 1商品×N模板 | 填补最大功能差距 |
| KR6：AI 推荐准确率 | > 70% 用户接受推荐模板 | AI 分析 → 自动推荐 |
| KR7：Shopify 集成 MAU | 100+ | 绑定渠道用户 |

---

## 4. 功能需求

### 4.1 功能优先级总表

| 优先级 | 功能 | 用户价值 | 技术复杂度 | 竞品差距 |
|--------|------|---------|-----------|---------|
| **P0** | 模板真实缩略图（exampleImageUrl）| 建立用户期望 | XS（接口已预留）| 差距大 |
| **P0** | 数据埋点（首次生成成功率）| 决策基础 | S | 内部 |
| **P0** | Freemium 定价公示（5次/月免费） | 降低试用门槛 | XS | 差距大 |
| **P1** | 批量生成 MVP（1商品×多模板）| Persona C 核心需求 | M | 差距最大 |
| **P1** | AI 分析 → 自动推荐模板 | 独有护城河激活 | M | 独有 |
| **P1** | 移动端布局优化（/ecommerce）| Persona A 高频场景 | S | 差距中 |
| **P2** | 自动背景抠图预览 | 减少摩擦 | M | 差距大 |
| **P2** | Shopify 商品图直拉 | 渠道绑定 | L | Pebblely 独有 |
| **P2** | 结果分享 / 社区画廊 | 社区飞轮 | M | 差距大 |
| **P3** | 卖点图（文字叠加）| 功能宽度 | L | 豆绘AI 有 |
| **P3** | 精修 / 局部重绘 | 功能宽度 | XL | 豆绘AI 有 |

### 4.2 P0 — 模板真实缩略图

**用户故事：** 作为卖家，我想在选择模板时就能预见到我的商品放进去大概是什么效果，这样我才敢点击生成。

**验收标准：**
- [ ] 6 个场景模板的 `exampleImageUrl` 全部填入真实生成示例图
- [ ] 图片分辨率 ≥ 400×400px，AVIF/WebP 格式，加载时间 < 500ms
- [ ] TemplatePicker 在图片加载失败时降级到渐变色块（已实现）
- [ ] 在「生成结果空状态」下，ResultPanel 底部展示 6 张示例图（SampleGallery）

**内容需求（产品团队）：** 使用真实商品（建议：日用品 / 数码配件）在每个场景模板下生成示例图，作为 exampleImageUrl 内容。

### 4.3 P1 — 批量生成 MVP

**用户故事：** 作为代运营，我想上传一张商品图后，一次性生成所有场景风格的图片，而不是每个风格都要重复操作。

**功能描述：**
- 用户在配置区勾选多个模板（TemplatePicker 支持多选模式）
- 点击「批量生成」，系统并发提交多个任务（N 个模板 = N 个任务）
- ResultPanel 显示 N 列结果（每列对应一个模板），按模板名称分组
- 可下载全部（ZIP）

**验收标准：**
- [ ] 用户可选 2~6 个模板
- [ ] 并发任务数上限：6（超出提示「已达上限」）
- [ ] 每个任务的进度独立显示
- [ ] 全部完成后提供「下载全部」按钮
- [ ] 批量模式入口：在单次生成按钮旁显示「批量模式」开关（渐进披露）

**技术要求：**
- 不得阻塞 UI（所有任务后台并发）
- 用 `Promise.allSettled` 处理部分失败
- 与现有 `addTask` + `seenTaskIds` 机制兼容

### 4.4 P1 — AI 分析 → 自动推荐模板

**用户故事：** 作为不熟悉场景搭配的卖家，我上传商品图后，AI 帮我推荐最适合的 2~3 个场景风格，我确认后直接生成。

**功能描述：**
- 上传商品图后（在「上传即响应」已有基础上），如果用户未选模板，自动触发轻量 AI 分析
- 分析结果：提取商品品类（家居 / 食品 / 数码 / 服饰等）+ 推荐最匹配的 2~3 个场景模板
- 推荐呈现：TemplatePicker 中高亮推荐的模板，加「✦ AI 推荐」标签
- 用户可直接使用推荐，也可手动选择其他模板
- AI 分析卡片（EcommerceAnalysisPanel）在完成分析后自动展开（当前是手动触发 + 默认折叠）

**验收标准：**
- [ ] 上传后 3s 内开始分析（轻量端，不等待完整分析）
- [ ] 推荐 2~3 个模板，带「AI 推荐」标签
- [ ] 用户选择推荐模板时，正常触发生成流程
- [ ] 分析失败时静默降级（不阻塞用户手动选择）

**⚠️ 待讨论：** 自动触发分析是否消耗积分？建议：推荐分析免费，完整 AI 分析报告消耗积分。

### 4.5 P0 — Freemium 定价公示

**用户故事：** 作为新用户，我想在注册前就知道免费能用多少次，以便决定是否值得试用。

**验收标准：**
- [ ] 首页/落地页明确显示免费层（建议：5次/月 or 10次/月，待定）
- [ ] `/ecommerce` 页面在积分不足时显示「免费额度已用完，升级继续」而非神秘报错
- [ ] 定价页面（如存在）与实际一致

---

## 5. 工作流规范（已执行）

> 本章记录 Blueprint 执行后的当前状态，作为后续开发的基线。

### 5.1 当前用户路径（3步）

```
① 选择场景风格（TemplatePicker — 页面第一个交互元素）
    ↓
② 上传商品图（拖拽或点击，h-40 上传区）
    ↓
③ 点击「✦ 生成场景图 (N)」
    ↓
结果内联显示（右栏 ResultPanel，无需滚动/切换视图）
```

### 5.2 已完成的核心改进

| 改进项 | 完成状态 |
|--------|---------|
| ResultPanel 内联显示（不在侧边抽屉）| ✅ |
| 双栏布局（360px 配置 + 弹性结果）| ✅ |
| 上传即响应（缩略图 + 就绪状态反馈）| ✅ |
| Template-First 顺序（模板在上传之前）| ✅ |
| 步骤数 ≤ 3 | ✅ |
| 模板缩略图真实图（exampleImageUrl 接口）| ⬜ 接口已预留，内容待填入 |

### 5.3 未解决的 UX 差距

| 差距 | Pebblely 的做法 | AetherGenix 现状 |
|------|----------------|-----------------|
| 模板选中即时预览 | 选中后右侧实时合成预览 | 需点击生成才能看到结果 |
| 上传自动抠图 | 上传完立即展示抠图结果 | 无抠图，商品图原样 |
| 模板真实缩略图 | 真实合成效果图 | 渐变色块（接口预留） |

---

## 6. 非功能需求

| 维度 | 要求 |
|------|------|
| **性能** | TTFV < 60s（当前 ~1min，需优化任务优先级）|
| **可用性** | 移动端（375px）完整可用，左栏配置全宽展示 |
| **国际化** | 支持中英文（i18n key 已有，需补全电商相关 key）|
| **无障碍** | TemplatePicker 支持键盘导航（Tab + Enter）|
| **错误处理** | 生成失败时显示重试按钮 + 错误原因（非神秘空白）|

---

## 7. 约束 & 依赖

| 约束/依赖 | 说明 |
|---------|------|
| AI 分析 API | `analyzeEcommerceProduct` 已存在，消耗积分——需与后端确认自动触发的计费策略 |
| 批量生成 | 依赖后端任务队列支持并发 N 个任务，需确认限额 |
| exampleImageUrl CDN | 需要确定图片存储位置（OSS / Cloudflare Images）|
| Shopify 集成 | 需要 Shopify Partner 资质申请（L 级工作量） |

---

## 8. 待讨论问题（打磨清单）

> 以下是 PRD 中仍然存在疑问或需要对齐的点，欢迎逐一讨论。

### Q1 — 免费层定量
- 目前定价模型完全不透明，竞品（Pebblely）5次/月免费，豆绘AI 新用户赠积分
- **建议：** 5次/月免费生成，不需要信用卡
- **讨论点：** 免费次数是否足够驱动「体验到惊喜」？是否考虑 10次/月？

### Q2 — AI 分析自动触发 vs 手动触发
- 当前：手动点击「分析」按钮（折叠在 details 里）
- 建议：上传后自动触发轻量分析 + 推荐，不消耗积分
- **讨论点：** 自动分析是否会引起用户对「隐私/数据使用」的疑虑？

### Q3 — 批量生成的 UX 范式
- 方案 A：多选模板 → 单次批量生成（改变 TemplatePicker 交互）
- 方案 B：生成后显示「用所有模板生成」按钮（保持当前单选体验）
- **讨论点：** 哪种更符合卖家工作方式？Persona A 更倾向 B，Persona C 更倾向 A

### Q4 — 「模板选中即时预览」的优先级
- Pebblely 核心体验，我们目前缺失
- 实现难度：中（需要前端合成预览图，或 API 快速推理）
- **讨论点：** 这个功能值不值得提前到 P1？还是等批量生成做完再做？

### Q5 — 目标用户的主次
- Persona A（Shopify/全球卖家）还是 Persona B（中国多平台卖家）优先？
- 这影响功能优先级：Shopify 集成 vs 淘宝/抖音相关能力
- **讨论点：** 当前团队的获客渠道主要在哪里？

### Q6 — 竞品对比落地页
- Teardown 建议做「vs Pebblely」对比页
- **讨论点：** 这个是产品 PRD 的范围，还是市场营销的范围？是否放进本 PRD？

---

## 9. 里程碑规划

```
2026-05 当前（Blueprint 完成）
  ├─ DONE：3步路径、内联结果、双栏布局、上传即响应
  └─ DONE：竞品 Teardown 完成

2026-06 M1（Quick Wins）✅ 已完成
  ├─ DONE：填入 exampleImageUrl（6张模板示例图，Unsplash CDN）
  ├─ DONE：数据埋点上线（useGenerationMetrics，TTFV + 成功率）
  └─ DONE：Freemium 定价公示（积分余额芯片 + 按钮 disabled 状态）

2026-07 M2（差距填补）✅ 已完成
  ├─ DONE：批量生成 MVP（TemplatePicker 多选 + BatchResultPanel + Promise.allSettled）
  ├─ DONE：AI 分析 → 自动推荐模板（TEMPLATE_KEYWORDS + AI 角标）
  └─ DONE：移动端布局修复（aspect-[4/3]、grid-cols-1 sm:grid-cols-2、FormatPicker 响应式）

2026-08 M3（生成管道强化 + 信用透明化）
  ├─ P0：积分消耗透明（每次生成预估费用 + 余额动态更新）
  ├─ P0：生成进度增强（真实 % 进度 + 取消任务 + 队列位置）
  └─ P1：自动背景抠图（上传后触发，主图去白底预览）

2026-09 M4（用户资产管理升级）
  ├─ P1：历史搜索 / 筛选（按商品名、日期、模板）
  ├─ P1：参数复用（从历史项目一键复制配置）
  └─ P1：批量下载（多项目 ZIP + 单图格式选择）

2026-10 M5（多模型路由 + 风格扩展）
  ├─ P2：模型选择器（速度 / 质量 / 成本三角可见）
  ├─ P2：风格模板扩展（6 → 12+，支持自定义）
  └─ P2：Shopify 商品图直拉（MVP OAuth 授权）

2026-Q4 M6（共享 + 发布生态）
  ├─ P2：分享链接（单图 / 项目公开链接）
  ├─ P2：品牌水印（Logo 叠加，位置可配置）
  └─ P3：Agent 模式原型（「告诉我商品，我给你生成套图」）
```

---

## 10. 系统架构设计

> 本章记录 v0.1 PRD 遗漏的 8 个系统层的完整设计，作为 M3-M6 的实现基线。

### 10.1 生成管道（Generation Pipeline）

**当前状态：** 前端每 1500ms 轮询 `/api/tasks/{id}`，任务状态为 `queued → running → succeeded/failed`。  
**缺失：** 进度百分比、取消 API、队列位置、用户可见超时计时。

**数据流：**
```
用户点击「生成」
  → generateEcommerceImages() → POST /api/ecommerce/generate → { task_id }
  → setAwaitingTaskId(task_id)
  → useTasks 轮询 /api/tasks/{task_id} 每 1500ms
  → ImageTask.status: queued → running → succeeded
      ↓
  taskHistoryItems 更新 → Ecommerce.tsx useEffect 检测到完成
  → latestImages 更新 → ResultPanel 渲染结果
```

**M3 新增的数据流：**
```
running 状态 → 后端返回 progress_pct (0-100) 字段
  → GenerationProgress 组件显示真实 %
  → 超时计时器（60s 无进度 → 显示「生成中，请稍候…已等待 Xs」）
  → 取消按钮 → DELETE /api/tasks/{task_id} → 前端清空 awaitingTaskId
```

**新增 API 契约：**
```typescript
// ImageTask 扩展（M3）
interface ImageTask {
  // 现有字段...
  progress_pct?: number;       // 0-100，running 时由后端填充
  queue_position?: number;     // queued 时显示队列位置
  estimated_seconds?: number;  // 预估剩余秒数
}

// 取消任务（M3）
// DELETE /api/tasks/{taskId}
// → { ok: boolean }
```

**前端集成点：** `src/tasks.tsx`（轮询结果），`src/components/ecommerce/GenerationProgress.tsx`（展示进度），`src/pages/Ecommerce.tsx`（取消按钮）

---

### 10.2 信用/配额系统（Credits & Quota）

**当前状态：** 后端已完整实现 `LedgerEntry`、`PaymentPlan`、`PaymentOrder`、`BalanceInfo`。前端仅显示「免费额度已用完」的 boolean 状态。  
**缺失：** 单次消耗显示、余额动态刷新、套餐升级 CTA。

**数据流：**
```
用户余额：getAccount() → AccountInfo.balance.remaining (USD 小数)
生成1次消耗：约 $0.04~$0.10（取决于模型和 n）
账单明细：getLedger() → LedgerEntry[]
套餐信息：getPaymentCheckoutInfo() → PaymentPlan[]
充值：createPaymentOrder() → 支付链接
```

**新增 UI 契约（M3 实现）：**
```typescript
// 电商页生成按钮区域新增「积分预估」组件
interface CreditEstimateProps {
  n: number;               // 生成张数
  quality: string;         // 'hd' | 'standard'
  model: string;           // 模型 ID
  balance: number | null;  // 当前余额（USD）
}
// → 显示「预计消耗 $0.06，余额 $1.23 → 生成后余额 $1.17」

// 生成完成后自动刷新余额
// → 重新调用 getAccount()，更新 account state
```

**前端集成点：**
- `src/pages/Ecommerce.tsx`：生成按钮旁显示积分预估
- `src/components/ecommerce/CreditEstimate.tsx`（新建）
- 生成成功后触发 `getAccount()` 刷新余额

---

### 10.3 图像后处理（Image Post-Processing）

**当前状态：** 生成结果直接显示原始图 URL，无后处理能力。  
**关键场景：** 商品图白底去除（抠图）→ 合成场景更自然。

**数据流：**
```
上传商品图
  → 可选：前端调用后端抠图 API（/api/images/remove-background）
  → 返回去底图 URL（PNG with alpha）
  → 替换 productImage 上传到生成 API
  → 生成结果更自然（商品无白边）
```

**新增 API 契约（M3 实现）：**
```typescript
// POST /api/images/remove-background
// Content-Type: multipart/form-data
// 请求体：{ image: File }
// 响应：{ url: string; width: number; height: number }

export function removeBackground(image: File): Promise<{ url: string }> {
  const form = new FormData();
  form.set('image', image);
  return request('/api/images/remove-background', { method: 'POST', body: form });
}
```

**前端集成点：**
- `src/pages/Ecommerce.tsx`：上传区增加「自动抠图」开关
- `src/components/ecommerce/BackgroundRemovalPreview.tsx`（新建）：显示原图 vs 抠图对比

**降级策略：** 后端抠图 API 不可用时，静默跳过，使用原图继续生成。

---

### 10.4 用户资产管理（Asset Management）

**当前状态：** 历史按 task_id 分组，支持删除和发布，但无搜索/筛选/标签/批量操作。

**数据流（M4 扩展）：**
```
搜索：getHistory({ q: '手机壳' }) → 后端全文搜索 task_request.ecommerce.product_name
筛选：getHistory({ limit: 20, offset: 0, status: 'succeeded' })
参数复用：从 HistoryGroup.first.task_request.ecommerce 提取参数 → 填入当前表单
批量下载：taskDownloadUrl(taskId) → ZIP（现有） + 多项目 ZIP（新增）
```

**新增 API 契约（M4 实现）：**
```typescript
// 多项目批量下载（新增）
// POST /api/tasks/batch-download
// 请求体：{ task_ids: string[] }
// 响应：{ download_url: string }（合并 ZIP，限制 max 20 个任务）

// 现有 getHistory 扩展（已支持 q 参数，确认后端是否实现）
export function getHistory(params: {
  limit?: number;
  offset?: number;
  q?: string;            // 全文搜索
  ecommerce_only?: boolean; // 只返回电商任务（M4 新增参数）
}): Promise<{ items: HistoryItem[] }>;
```

**前端集成点：**
- `src/pages/Ecommerce.tsx`：历史区增加搜索框 + 筛选 dropdown
- 「复用此配置」按钮：点击后将 `task_request.ecommerce` 的字段回填到表单
- 「批量下载（已选 N 项）」浮动操作栏

---

### 10.5 Prompt 工程系统（Prompt Engineering）

**当前状态：** 6 个固定模板，`style` + `scenarios` 字符串由模板预填或用户手动输入。  
**缺失：** 扩展风格库、Prompt 预览、自定义模板。

**M5 设计（风格扩展）：**
```typescript
// 现有 STYLE_TEMPLATES（6个）→ 扩展至 12+
// 新增类别：产品特写 / 白色极简 / 品牌大片 / 秋冬氛围 / 夏日清爽 / 东南亚异域

// 自定义模板（M5）
interface CustomStyleTemplate {
  id: string;           // 'custom_' + uuid
  name: string;
  style: string;        // 用户自定义 style prompt
  scenarios: string;
  savedAt: string;
  // 持久化：localStorage（MVP）→ 后端用户设置（M6）
}
```

**前端集成点：**
- `src/pages/Ecommerce.tsx`：STYLE_TEMPLATES 数组扩展
- `src/components/ecommerce/TemplatePicker.tsx`：支持「自定义风格」入口（输入 → 保存为自定义模板）

---

### 10.6 多模型路由（Multi-Model Routing）

**当前状态：** `EcommerceGeneratePayload.model` 字段存在但前端无选择器，默认使用后端配置的模型。  
**场景映射：**

| 场景 | 推荐模型 | 原因 |
|------|---------|------|
| 快速预览（批量生成） | gpt-image-1 standard | 速度快，成本低 |
| 正式主图（单张精出） | gpt-image-1 hd | 质量最高 |
| 高细节商品（珠宝/手表）| 模型 TBD | 细节保留 |

**M5 UI 设计：**
```typescript
// 生成参数区新增模型选择器
interface ModelOption {
  id: string;           // API model ID
  name: string;         // 显示名称：「标准」「高清」
  costMultiplier: number; // 相对成本倍数（用于预估显示）
  speed: 'fast' | 'medium' | 'slow';
  badge?: string;       // 「推荐」「最快」「最高质」
}
```

---

### 10.7 共享与发布（Sharing & Publishing）

**当前状态：** `publishHistory` 将图片发布到站内灵感图库（inspiration）。  
**缺失：** 外部分享链接、嵌入代码、品牌水印。

**M6 API 契约：**
```typescript
// 创建公开分享链接
// POST /api/history/{id}/share
// → { share_url: string; expires_at: string | null }

// 品牌水印（前端合成，Canvas API）
interface WatermarkConfig {
  logoUrl: string;      // 用户上传的 Logo URL
  position: 'bottom-right' | 'bottom-left' | 'bottom-center';
  opacity: number;      // 0.1~1.0
  scale: number;        // Logo 相对图片宽度的比例 0.05~0.25
}
// → Canvas 合成 → 导出 PNG/WebP
```

---

### 10.8 API 契约汇总（API Contract Summary）

> 前端已调用的 API 在 `src/api.ts` 中有类型定义。以下是 M3-M6 新增的接口。

| Milestone | 接口 | 方法 | 说明 |
|-----------|------|------|------|
| M3 | `/api/tasks/{id}` | DELETE | 取消生成任务 |
| M3 | `/api/images/remove-background` | POST | 自动抠图 |
| M3 | `/api/account` | GET | 生成后刷新余额（现有） |
| M4 | `/api/history` | GET + `ecommerce_only` param | 电商历史筛选 |
| M4 | `/api/tasks/batch-download` | POST | 多项目批量下载 |
| M6 | `/api/history/{id}/share` | POST | 创建分享链接 |
| M6 | `/api/history/{id}/share` | DELETE | 撤销分享链接 |

---

## 11. Milestone 详细规划（M3-M6）

### M3 — 生成管道强化 + 信用透明 + 抠图（2026-08）

**用户能做到什么：**
- 点击生成后看到真实进度百分比，而非永动旋转图标
- 生成前知道本次大约消耗多少积分
- 生成后余额自动更新，无需刷新页面
- 上传商品图后一键预览去白底效果，再决定是否用去底图生成

**功能清单：**

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P0 | 积分消耗预估 | 按钮旁显示「预计消耗 ~$X.XX」 |
| P0 | 生成后余额刷新 | 成功完成后重新 getAccount() |
| P0 | 真实进度条 | 后端返回 progress_pct，GenerationProgress 渲染 |
| P1 | 取消生成 | 「取消」按钮 → DELETE /api/tasks/{id} |
| P1 | 自动抠图 | 上传区「去背景」开关 + BackgroundRemovalPreview |
| P1 | 超时提示 | 60s 无进度变化 → 友好提示而非静默等待 |

**前端文件改动（≤ 6 个）：**
1. `src/api.ts` — 新增 `cancelImageTask`, `removeBackground`
2. `src/pages/Ecommerce.tsx` — 积分预估组件集成、取消按钮、余额刷新
3. `src/components/ecommerce/CreditEstimate.tsx` — 新建：积分消耗预估
4. `src/components/ecommerce/GenerationProgress.tsx` — 增强：显示 progress_pct + 超时文案
5. `src/components/ecommerce/BackgroundRemovalPreview.tsx` — 新建：原图 vs 去底对比

**验收标准：**
- [ ] 生成按钮旁显示预估消耗（基于 n × 单价估算）
- [ ] 生成完成后 `AccountInfo.balance.remaining` 自动更新
- [ ] 后端返回 `progress_pct` 时 GenerationProgress 显示真实百分比
- [ ] 超过 60s 未完成时显示「已等待 Xs，生成仍在进行中」
- [ ] 「去背景」开关打开时，上传图后调用 `/api/images/remove-background`，显示去底预览
- [ ] 抠图 API 不可用时静默降级，不阻塞生成流程

**预估工作量：** 3~4 天

---

### M4 — 用户资产管理升级（2026-09）

**用户能做到什么：**
- 在历史记录中搜索「手机壳」找到所有相关项目
- 一键「复用此配置」将历史项目的商品参数填回表单
- 选中多个项目后批量下载为 ZIP

**功能清单：**

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P1 | 历史搜索 | getHistory({ q }) + 搜索框 UI |
| P1 | 参数复用 | ProjectCard 增加「复用配置」按钮 |
| P1 | 批量下载 | 历史区浮动操作栏 + /api/tasks/batch-download |
| P2 | 筛选（模板/日期）| 按 style 字段分类筛选 |
| P2 | 项目重命名 | 编辑 product_name |

**前端文件改动（≤ 5 个）：**
1. `src/api.ts` — `getHistory` 增加 `ecommerce_only` 参数，新增 `batchDownload`
2. `src/pages/Ecommerce.tsx` — 历史区增加搜索框、复用按钮逻辑
3. `src/components/ecommerce/HistorySearchBar.tsx` — 新建
4. `src/components/ecommerce/BatchDownloadBar.tsx` — 新建：浮动多选操作栏

**验收标准：**
- [ ] 搜索框输入商品名后，历史区过滤显示匹配结果（客户端过滤或服务端 q 参数）
- [ ] ProjectCard 出现「复用配置」按钮，点击后将 `task_request.ecommerce` 字段回填表单
- [ ] 多选历史项目后出现浮动操作栏，「批量下载（N）」按钮可用
- [ ] `taskDownloadUrl` 下载单项 ZIP 保持原有功能不变

**预估工作量：** 2~3 天

---

### M5 — 多模型路由 + 风格扩展（2026-10）

**用户能做到什么：**
- 选择「快速」（便宜）或「高清」（贵）模式，清楚知道成本差异
- 从 12+ 个场景风格中选择，或保存自定义风格
- 批量生成时自动使用「快速」模式降低成本

**功能清单：**

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P2 | 模型选择器 | 速度 / 质量 / 成本三维显示 |
| P2 | 风格扩展（6→12+）| 新增：产品特写、品牌大片、秋冬氛围等 |
| P2 | 自定义风格 | 输入 style prompt → 保存到 localStorage |
| P2 | 批量模式自动降速 | 批量生成时建议切换到 standard 质量 |
| P3 | Shopify 商品图直拉 | OAuth 授权后从 Shopify 商品库选图 |

**前端文件改动（≤ 6 个）：**
1. `src/pages/Ecommerce.tsx` — STYLE_TEMPLATES 数组扩展，集成模型选择器
2. `src/components/ecommerce/ModelPicker.tsx` — 新建：模型选择 UI
3. `src/components/ecommerce/TemplatePicker.tsx` — 增加「自定义」入口和 localStorage 持久化
4. `src/components/ecommerce/CustomStyleModal.tsx` — 新建：自定义风格编辑弹窗

**验收标准：**
- [ ] 生成参数区显示模型选择器（「标准 ~$0.04」/ 「高清 ~$0.08」）
- [ ] 选择模型后积分预估（M3 实现的 CreditEstimate）同步更新
- [ ] TemplatePicker 显示 12+ 个模板（6 原有 + 6 新增）
- [ ] 「+ 自定义风格」按钮打开弹窗，保存后出现在 TemplatePicker 末尾
- [ ] 批量模式激活时，系统提示「建议使用标准质量以节省积分」

**预估工作量：** 3~4 天

---

### M6 — 共享 + 发布生态（2026-Q4）

**用户能做到什么：**
- 点击「分享」获得一个公开链接，发给客户查看生成结果
- 下载图片前可叠加品牌 Logo 水印
- 一键发布到站内灵感图库（现有）或 Shopify 商品图（新增）

**功能清单：**

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P2 | 分享链接 | POST /api/history/{id}/share → 公开 URL |
| P2 | 品牌水印 | Canvas API 本地合成 Logo + 图片 → 导出 |
| P3 | Shopify 图片推送 | 将生成图直接上传到 Shopify 商品的 images[] |
| P3 | Agent 模式原型 | 「我的商品是 XX，帮我生成一套主图」对话式 UX |

**前端文件改动（≤ 6 个）：**
1. `src/api.ts` — 新增 `createShareLink`, `deleteShareLink`
2. `src/pages/Ecommerce.tsx` — ProjectDetail 增加「分享」按钮
3. `src/components/ecommerce/SharePanel.tsx` — 新建：分享链接 + 复制 + 过期设置
4. `src/components/ecommerce/WatermarkEditor.tsx` — 新建：Logo 上传 + 位置调整 + Canvas 合成导出

**验收标准：**
- [ ] ProjectDetail 出现「分享」按钮，点击后显示可复制的公开链接
- [ ] 分享链接可访问原图（不含个人信息）
- [ ] WatermarkEditor 支持上传 Logo PNG，拖拽调整位置，预览后导出
- [ ] 水印合成完全在前端完成（Canvas API），不上传到服务器
- [ ] 「撤销分享」删除公开链接

**预估工作量：** 3~4 天

---

## 附录：文档引用

| 文档 | 用途 |
|------|------|
| `docs/competitive-teardown/ecommerce-image-gen-teardown.md` | 12维度评分、SWOT、行动计划原始数据 |
| `docs/ux-references/workflow-benchmark.md` | 9款一流工具工作流对标数据 |
| `plans/ecommerce-workflow-paradigm-shift.md` | Blueprint 执行记录（已完成） |
| `docs/workflow-design-system.md` | 3条设计原则、5种范式定义、Step Budget |

---

*v0.2 — 由 Claude Code product architect 模式扩展，新增 Section 10（系统架构设计）和 Section 11（M3-M6 详细规划）。M1/M2 已完成，M3 为下一个执行目标。*
