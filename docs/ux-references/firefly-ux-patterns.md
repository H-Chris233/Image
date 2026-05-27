# Adobe Firefly — UX 模式提取

> 分析时间：2026-05
> 产品定位：企业级 AI 创意生成，面向设计师/创意团队，Adobe 生态集成

---

## 1. 首屏价值传递

**核心设计：Gallery 驱动的价值展示**

- 首屏展示一个滚动的"Trending"图库（12-18 张 AI 生成图），每张有生成该图的 prompt
- 用户不需要了解 AI 参数，直接看到"别人在生成什么"，建立感性认知
- 输入框空状态内有多行 Suggested Prompts（蓝色可点击），一键触发生成
- 无等待感：Gallery 本身就是内容，用户在"等待灵感"时并不感到空洞

---

## 2. 上传→结果最短路径（Text to Image）

```
进入页面
  → 看到 Suggested Prompt，点击一个
  → [5-8秒：生成]
  → 看到 4 张变体图
  → 点击喜欢的，保存/下载
```

**路径步数：2 步**（选 prompt → 看结果）

---

## 3. 空状态设计

| 状态 | 内容设计 |
|------|---------|
| 首次进入（无 prompt） | Gallery 展示 12 张 trending 示例，每张带可点击 prompt；输入框内有 placeholder + 多个 Suggested Prompts |
| 正在生成 | 进度条分 3 个阶段："Initializing → Generating → Finalizing"；4 个结果占位格同步出现，依次填入 |
| 生成完成 | 4 张变体并排展示，尺寸统一，下方有 Refresh / Edit / Save 等操作 |
| 生成失败 | "Something went wrong" + Retry 按钮 + 内容政策提示（如果涉及违规词）|
| 历史记录 | "Recent Creations" 面板，缩略图网格，按时间倒序 |

---

## 4. 结果反馈与迭代机制

- **四联图（Quad-Result）**：每次生成固定展示 4 张变体，用户对比选择，降低"这个结果是不是最好的"焦虑
- **Refresh 按钮**：同参数重新生成 4 张新变体，一键操作
- **微调参数**：生成结果旁边直接显示当前参数（Aspect Ratio / Style / Color Tone / Lighting），可点击修改后 Refresh
- **Prompt 编辑**：结果下方 prompt 可直接编辑，不需要回到输入框
- **Like/Dislike**：每张图可评分，用于模型反馈
- **Generate Similar**：点击某张图的"Generate Similar"，以它为基础风格生成新变体

---

## 5. 可复用 UX 模式

### P10 — Trending Gallery as Empty State（Trending 作为空状态）
> 空状态不是"空的"，而是一个内容丰富的灵感画廊。用户会主动浏览和点击，而不是被"空"感到困惑。

**Apply to AetherGenix**：在历史记录为空时，展示"平台精选效果图"（官方制作的高质量示例），替代当前的"暂无记录"文字。点击某个示例可一键加载其参数设置，帮助新用户快速上手。

### P11 — Quad-Result Display（四联图展示）
> 永远展示 N 张变体（而非 1 张），用户比较选择，减少对单一结果的质疑感。

**Apply to AetherGenix**：生成完成后，始终展示当次生成的所有图片（通常 4 张）并排，而非默认只看列表。当前已有 imageCount=4 的设置，但展示形式是历史卡片，需要点进去看大图。建议：在历史区展示图片网格时，同一批次的 4 张图直接以 2×2 grid 呈现。

### P12 — Stage Feedback During Generation（生成阶段反馈）
> 生成等待期间，显示具体的进度阶段（"分析商品 → 构建场景 → 精细渲染"），而非单纯 spinner。

**Apply to AetherGenix**：将现有的 `<Loader2 className="animate-spin" />` 扩展为 3 阶段进度条：
- 阶段 1：「正在分析商品特征…」（0-30%）
- 阶段 2：「正在构建场景合成…」（30-80%）
- 阶段 3：「正在精细渲染…」（80-100%）

### P13 — Clickable Suggested Prompts（可点击的建议提示）
> 输入框旁边展示 4-6 个可点击的预置建议，降低"不知道写什么"的心理门槛。

**Apply to AetherGenix**：在"视觉风格"文本框旁边展示 3 个风格标签可点击填入，如：
「高端简约 · 白底写真」「生活化场景 · 自然光」「商业海报 · 高对比度」

### P14 — Inline Parameter Tweaking（结果页内联参数调整）
> 不需要返回配置页，直接在结果旁边修改参数后重新生成。

**Apply to AetherGenix**：在生成结果卡片上添加快捷操作：「切换场景」「调整比例」「重新生成」，无需重新滚动到顶部的配置区。

---

## 6. Firefly 的局限性（不适合 AetherGenix 的部分）

| 模式 | 不适合原因 |
|------|-----------|
| Text-to-Image 纯文本驱动 | AetherGenix 是图生图（商品图→场景图），文本只是辅助参数 |
| Content Credentials 水印 | 电商场景需要干净无水印的输出 |
| 创意自由度优先 | AetherGenix 需要商品图高度保真，Firefly 更偏向创意发散 |

---

## 关键启示

> **Firefly 最重要的 UX 创新是：让"不知道 AI 能做什么"的用户，通过浏览别人的作品和 Suggested Prompts，在 30 秒内建立具体的使用预期。**  
> 空状态的内容质量决定了新用户转化率。一个没有示例的空白输入框 = 一扇没有门把手的门。
