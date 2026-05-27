# Pebblely — UX 模式提取（补充分析）

> 分析时间：2026-05
> 产品定位：AI 商品场景图生成，面向电商商家，与 AetherGenix 最直接竞争
> 视觉设计参考已存于：`docs/design-references/pebblely-design-system.html`

---

## 1. 首屏价值传递

**核心设计：3 步流程 + 真实场景预览**

- Headline: "Generate beautiful product photos with AI in seconds"
- 首屏副标题：直接展示 3 步流程图（Upload Product → Choose Background → Download）
- 首屏图片：多个不同品类商品在不同场景中的合成效果（不是 AI 概念图，是可购买商品）
- 免费试用：10 张免费生成，无需信用卡，仅需邮箱注册

---

## 2. 上传→结果最短路径

```
上传商品图（或从 URL 导入）
  → [自动背景移除]
  → 选择场景模板（可选；跳过则用 AI 推荐）
  → 点击 Generate
  → [10-20秒]
  → 查看 3-4 张变体，选择下载
```

**路径步数：3 步**（上传 → 选模板 → 生成）

---

## 3. 空状态设计

| 状态 | 内容设计 |
|------|---------|
| 项目列表为空 | "Create your first product photo" + "Upload Product Image" 大按钮 |
| 未选择背景 | 场景选择区展示所有模板，顶部有"Let AI choose"选项（不强制选择） |
| 生成中 | 全屏遮罩 + 进度条 + "Generating your product photos…" |
| 生成完成 | 3-4 张结果并排，下方有"Generate More"和"Download All" |
| 免费额度耗尽 | 内联 Paywall，不打断已有结果的浏览 |

---

## 4. 模板设计细节（最重要的差异）

Pebblely 的模板缩略图是**真实场景照片，不是颜色或渐变**：
- "Marble Table" — 大理石纹理桌面，左后方有自然光
- "Coffee Shop" — 咖啡厅木桌，模糊背景
- "Garden" — 绿植环绕，自然光，户外感
- "Bedroom" — 白色床品，枕头背景

每个模板缩略图会在右下角标注**适用品类标签**（Food / Beauty / Electronics / Fashion），帮助用户快速匹配。

**模板分类**：
- By Color（白底、黑底、彩色…）
- By Style（简约、生活化、商业感…）
- By Season（节日、春夏秋冬…）
- By Platform（亚马逊、Shopify 推荐尺寸…）

---

## 5. 可复用 UX 模式

### P15 — Numbered Step Progress（编号步骤进度）
> 将整个使用流程拆分为 3 个明确编号的步骤，随时可见当前在哪一步。

**Apply to AetherGenix**：在配置区顶部添加步骤指示器：
① 上传商品图 → ② 选择风格 → ③ 生成场景图
当用户完成每步后，对应步骤标记为完成（✓），引导注意力移向下一步。

### P16 — "Let AI Decide" Escape Hatch（AI 自动决策逃生口）
> 每个需要选择的环节都有"让 AI 帮我选"的默认选项，用户不需要做所有决策。

**Apply to AetherGenix**：风格模板选择区加入"AI 自动推荐"卡片（排第一位）：上传商品图后，AI 自动分析商品类型并推荐最合适的场景，用户可以一键接受推荐。

### P17 — Real Photo Template Thumbnails（真实照片模板缩略图）
> 模板缩略图使用真实场景照片，而非颜色/渐变，让用户有直观的"这就是我想要的效果"感受。

**Apply to AetherGenix**：为 6 个风格模板创建真实场景缩略图（可用样品商品合成，或使用已有生成图作为示例），替代当前的纯渐变色背景。这是 Pebblely vs AetherGenix 体验差距最大的单点。

### P18 — Platform-Specific Output Sizing（平台专属输出尺寸）
> 格式选择不是"1:1 / 4:5 / 16:9"，而是"淘宝主图（800×800）/ 抖音方图（1080×1080）/ 微信朋友圈（1080×1350）"。

**Apply to AetherGenix**：将 FormatPicker 的标签从技术参数（"1:1"）改为平台场景（"主图"，下方标注"800×800"），降低决策认知成本。当前已有这个方向，但可以更进一步加入平台 Logo 图标。

---

## 6. Pebblely 的核心设计哲学

| 原则 | 描述 |
|------|------|
| Show, Don't Tell | 所有能用图片说明的地方绝不用文字 |
| Progressive Commitment | 先免费体验，再付费；先简单路径，再高级配置 |
| AI as Collaborator | AI 帮你填默认值，你随时可以覆盖 |
| Platform Awareness | 始终以"发布到哪个平台"为核心决策轴 |

---

## 关键启示

> **Pebblely 证明：同样的 AI 能力，用「运营工具」的设计思维包装，比用「创意工具」思维包装，更能获得电商商家的信任。**  
> 商家不关心"AI 背后的技术"，只关心"能不能快速出一张能用的图"。  
> 每个设计决策都应该问：**这个决策让商家快了还是慢了？**
