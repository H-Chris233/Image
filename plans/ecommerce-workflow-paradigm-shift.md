# Blueprint: /ecommerce 工作流范式升级
## 从「表单驱动 + 异步任务」→「Template-First + 内联结果」

> **目标：** 将用户从首张结果所需步骤从 7+ 步缩短到 ≤ 3 步  
> **参考规范：** `docs/workflow-design-system.md` · `docs/ux-references/workflow-benchmark.md`  
> **模式：** Direct 模式（无 git，直接编辑文件）  
> **创建时间：** 2026-05-25  
> **状态：** COMPLETE ✅ (2026-05-25)

---

## 依赖图

```
Step 1 (内联结果面板)
    ↓
Step 2 (双栏布局重构) ← 依赖 Step 1 中新增的 ResultPanel 组件
    ↓
Step 3 (上传即响应 + 模板真实图) ← 依赖 Step 2 的双栏布局
    ↓
Step 4 (Template-First 流程 + 步骤预算验证) ← 依赖所有前序步骤
```

Steps 1~4 必须串行，每步独立可部署。

---

## Step 1 — 内联结果面板（ResultPanel 组件）

### 目标
解决最核心问题：生成结果不在视口内。在页面配置区下方、历史区上方，新增一个「本次生成结果面板」，实时接收最新的任务结果，直接内联显示。不改变现有历史区逻辑。

### 背景
执行此 step 的 agent 需要了解：
- `src/pages/Ecommerce.tsx` 是目标文件（约 1380 行）
- `useTasks()` 返回 `{ taskHistoryItems, addTask, openDrawer }` 
  - `taskHistoryItems: HistoryItem[]` — 实时任务队列的已完成历史
  - 每次任务完成后，该数组更新，条目包含 `.task_request?.ecommerce` 标记
- `handleSubmit` 调用链：`generateEcommerceImages` → `addTask(task)` → `openDrawer()`
- `mergedHistory` = `mergeHistoryItems([...taskHistoryItems.filter(ecommerce), ...historyItems])`
- 生成结果图：`HistoryItem` 上有 `images: { url: string }[]` 或 `image_url: string`
- 设计 token：`--ag-lime: #E3FF74`，已有 `GenerationProgress` 组件可复用

### 任务清单

#### 1a. 新建 `ResultPanel` 组件
**文件：** `src/components/ecommerce/ResultPanel.tsx`

Props interface：
```ts
interface ResultPanelProps {
  /** 最新一组生成结果的图片 URL 列表 */
  images: string[];
  /** 是否正在生成（显示 skeleton） */
  loading: boolean;
  /** 请求的图片数量（skeleton 格子数） */
  expectedCount: number;
  /** 点击图片回调（打开全屏预览） */
  onPreview: (url: string, index: number) => void;
  /** 基于这组结果重新生成（快速重试） */
  onRetry?: () => void;
  /** 下载单张图片 */
  onDownload?: (url: string) => void;
}
```

布局规则：
- 空状态（loading=false, images=[]）：展示 SampleGallery（已有组件），title="效果示例"
- 加载中（loading=true）：渲染 `expectedCount` 个 skeleton 格子，`animate-pulse`，格子比例与 `aspectRatio` 一致（可先用 aspect-square 固定）
- 有结果（loading=false, images 非空）：`grid grid-cols-2 gap-3`，每张图片：
  - `<RetryImage>` 组件（已存在于 `src/components/RetryImage.tsx`）
  - 悬停显示操作按钮（Download + Preview）
  - 右上角显示图片序号

关键样式：
```tsx
// 结果图片卡片（参考 design-system.html token）
<div className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/50 cursor-pointer"
     onClick={() => onPreview(url, index)}>
  <RetryImage src={url} alt={`生成图 ${index + 1}`}
    className="w-full object-cover transition-transform duration-300 group-hover:scale-105" />
  {/* 悬停 overlay */}
  <div className="absolute inset-0 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-gradient-to-t from-black/70">
    <span className="text-[9px] text-white/70">#{index + 1}</span>
    <div className="flex gap-1">
      {onDownload && <button onClick={e => { e.stopPropagation(); onDownload(url); }}><Download size={14} /></button>}
    </div>
  </div>
</div>
```

#### 1b. 修改 `Ecommerce.tsx`：接入 ResultPanel

**新增 state（在现有 state 列表末尾追加）：**
```tsx
const [latestImages, setLatestImages] = useState<string[]>([]);
// 正在等待结果的任务 ID（不能复用 loading，因为 loading 在 handleSubmit finally 块中即刻变 false）
const [awaitingTaskId, setAwaitingTaskId] = useState<string | null>(null);
// 挂载时已存在的 task_id 集合，用于过滤历史任务（防止 mount 时 useEffect 误触发）
const seenTaskIds = useRef<Set<string>>(new Set());
```

**初始化 `seenTaskIds`（在现有 `useEffect(loadHistory)` 之后追加）：**
```tsx
// 记录挂载时已有的 task_id，避免 taskHistoryItems 初始填充时误更新结果面板
useEffect(() => {
  const ids = new Set(taskHistoryItems.map(item => item.task_id ?? item.id));
  seenTaskIds.current = ids;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // 仅执行一次
```

**修改 `handleSubmit`（try 块内，addTask 之后）：**
```tsx
const task = await generateEcommerceImages(...);
setSelectedPlan(null);
addTask(task);
// addTask 内部会 setDrawerOpen(true)，立即关闭以保持用户在当前页
closeDrawer();
setLatestImages([]);          // 清空上次结果，ResultPanel 进入 skeleton 状态
setAwaitingTaskId(task.id);   // 标记正在等待此任务的结果
notifyInfo('✓ 正在生成…');
// 不再 openDrawer()，不再 scrollIntoView
```

注意：`closeDrawer` 需从 `useTasks()` 解构（已在 tasks.tsx:253 中存在）：
```tsx
const { addTask, openDrawer, closeDrawer, taskHistoryItems } = useTasks();
```

**新增 `useEffect` 监听 taskHistoryItems（在 seenTaskIds useEffect 下方）：**
```tsx
useEffect(() => {
  if (!awaitingTaskId) return;

  // 获取最新完成的电商任务组（用 groupHistoryItems 正确处理多图 task_id）
  const ecomItems = taskHistoryItems.filter(
    item => Boolean(item.task_request?.ecommerce) && !seenTaskIds.current.has(item.task_id ?? item.id)
  );
  if (ecomItems.length === 0) return;

  // 找到 awaitingTaskId 对应的所有图片（同一 task_id 的多个 HistoryItem）
  const taskItems = ecomItems.filter(item => item.task_id === awaitingTaskId);
  if (taskItems.length === 0) return;

  const urls = taskItems
    .filter(item => item.image_url)
    .sort((a, b) => (a.batch_index || 0) - (b.batch_index || 0))
    .map(item => item.image_url as string);

  if (urls.length > 0) {
    setLatestImages(urls);
    setAwaitingTaskId(null); // 结果已到达，停止等待
    // 将新 task_id 加入 seen 集合，防止下次 mount 重复触发
    taskItems.forEach(item => seenTaskIds.current.add(item.task_id ?? item.id));
  }
}, [taskHistoryItems, awaitingTaskId]);
```

**在 JSX 中插入 ResultPanel（在配置 section 和 AI 分析 section 之间）：**
```tsx
{/* 内联结果面板 — Step 1 新增 */}
<section className="mb-8">
  <ResultPanel
    images={latestImages}
    loading={awaitingTaskId !== null}  {/* skeleton 由 awaitingTaskId 驱动，非 loading */}
    expectedCount={parseInt(imageCount, 10)}
    onPreview={(url, index) => setPreviewItem({ imageUrl: url, prompt: `生成图 ${index + 1}` })}
    onRetry={latestImages.length > 0 ? handleSubmit : undefined}
    onDownload={(url) => window.open(url, '_blank')}
  />
</section>
```

### 验证步骤
1. `cd Image && npm run build` — TypeScript 零错误
2. `npm run dev` → 访问 `/ecommerce`
3. 未生成时：结果区显示 SampleGallery（效果示例 6 张卡片）
4. 上传商品图 → 点击「✦ 生成场景图」→ 结果区立即切换为 skeleton（不再弹出侧边抽屉）
5. 任务完成后，结果图出现在配置区下方，无需滚动即可看到
6. 点击结果图 → 全屏预览正常打开

### 退出标准
- [ ] `npm run build` 零错误
- [ ] 生成结果出现在配置区下方（无需滚动）
- [ ] loading 状态下显示 skeleton 格子（数量 = imageCount）
- [ ] 原有历史卡片区仍然正常工作（不退化）
- [ ] `openDrawer()` 调用已移除（不再强制打开侧边抽屉）

---

## Step 2 — 双栏布局重构

### 目标
将页面改为桌面端左右双栏：左侧（360px 固定）= 配置区，右侧（flex-1）= 结果面板。结果始终与配置并排，无需滚动。

### 背景
执行此 step 的 agent 需要了解：
- Step 1 已完成：`ResultPanel` 组件存在于 `src/components/ecommerce/ResultPanel.tsx`
- 当前配置 section 使用 `grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr_auto]`（三栏：商品图 | 参数 | 按钮）
- 当前 Ecommerce.tsx 结构：`配置 section` → `AI 分析 section` → `历史 section`
- AI 分析区（EcommerceAnalysisPanel）是高级功能，使用频率低，可折叠
- 目标布局见 `docs/workflow-design-system.md` 第 5.1 节

### 任务清单

#### 2a. 重构外层布局为双栏

**关键设计决策：** `ProjectDetail`（项目详情全屏视图）在 `selectedGroupKey != null` 时渲染为全宽布局，不套入双栏。双栏只在「配置 + 结果」模式下生效。

将 `return (...)` 内部改为：

```tsx
<div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
  {/* 页面标题区 — 保持不变 */}
  <div className="mb-6 ...">...</div>

  {/* ─── ProjectDetail 全宽模式（selectedGroupKey 时跳出双栏） ─── */}
  {selectedGroup ? (
    <section ref={historySectionRef}>
      <button ... onClick={() => setSelectedGroupKey(null)}>
        <ArrowLeft size={14} /> {t('ecom_back_projects')}
      </button>
      <ProjectDetail ... />
    </section>
  ) : (
    /* ─── 主双栏模式 ─── */
    <div className="lg:grid lg:grid-cols-[360px_1fr] lg:gap-6 lg:items-start">

      {/* 左列：配置 + AI 分析（折叠） */}
      <div className="mb-8 lg:mb-0 space-y-3">
        {/* 现有配置 section，移除外层 mb-8 */}
        <section className="border bg-black/55 p-3 ...">...</section>

        {/* AI 分析区：<details> 折叠，默认收起 */}
        <details className="border border-secondary/20 bg-black/55">
          <summary className="flex cursor-pointer items-center gap-2 p-3 text-[10px] font-bold uppercase tracking-widest text-secondary">
            <Sparkles size={13} />
            {t('ecom_ai_designer')}
          </summary>
          <div className="p-4">
            {/* 现有 AI 分析区内容（analyzeProduct 按钮 + EcommerceAnalysisPanel） */}
          </div>
        </details>
      </div>

      {/* 右列：结果面板 + 历史卡片（常驻，sticky） */}
      <div className="lg:sticky lg:top-6 space-y-6">
        {/* Step 1 新增的 ResultPanel */}
        <ResultPanel
          images={latestImages}
          loading={awaitingTaskId !== null}
          expectedCount={parseInt(imageCount, 10)}
          onPreview={...}
          onRetry={latestImages.length > 0 ? handleSubmit : undefined}
          onDownload={...}
        />

        {/* 历史卡片网格（非全屏，保留在右栏底部） */}
        <section ref={historySectionRef}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-white">{t('ecom_projects')}</h2>
            <button ... onClick={() => loadHistory()}>...</button>
          </div>
          {groups.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {groups.map(group => <ProjectCard key={group.key} ... />)}
            </div>
          ) : (
            /* 空状态 SampleGallery */
            ...
          )}
        </section>
      </div>

    </div>
  )}
</div>
```

**注意：** `historySectionRef` 保留在历史卡片 section 上，`scrollIntoView` 逻辑已在 Step 1 中移除，此处 ref 仅保留以防其他地方引用。

#### 2b. 调整配置 section 内部布局

配置 section 内部现在是 `grid-cols-[220px_1fr_auto]`（商品图 | 参数 | 按钮）。  
在双栏布局下，配置区已是固定 360px，内部改为 `grid-cols-1 gap-3`（全宽垂直堆叠），按钮放在配置区底部。

需要调整的具体改动：
- 商品图上传区：从 `lg:grid-cols-[220px_1fr_auto]` 中解放出来，独占全宽（更宽的上传区域）
- 模板选择器：在 360px 宽度内，`grid-cols-3` 显示 6 个模板（每个约 100px）
- 格式选择卡片（FormatPicker）：在 360px 宽度内，4 张卡片水平排列，每张 ~82px
- 生成按钮：宽度 100%（`w-full`），高度 `h-12`
- 重置按钮：宽度 100%，高度 `h-9`，在生成按钮下方

#### 2c. 移动端处理

移动端（< lg）维持现有单栏流式布局（与 Step 1 保持一致）：配置区 → 结果面板（全宽）→ 历史区。

#### 2d. ResultPanel 固定高度

给 ResultPanel 的外容器设置 `min-h-[480px]`，防止配置区与结果区高度不对齐产生跳动。

### 验证步骤
1. `npm run build` — 零错误
2. 桌面端（≥ 1024px）：左右双栏并排，左侧 360px，右侧弹性
3. 移动端（< 1024px）：垂直堆叠，正常工作
4. 生成结果出现在右栏，无需任何滚动即可与配置区同屏可见
5. AI 分析区折叠后不占用主视口空间
6. 历史记录正常，可展开查看

### 退出标准
- [ ] `npm run build` 零错误
- [ ] 桌面端双栏布局正确（Playwright 截图验证）
- [ ] 结果面板与配置面板同屏可见
- [ ] 历史区已折叠在结果面板下方
- [ ] 移动端不破坏

---

## Step 3 — 上传即响应 + 模板真实示例图

### 目标
解决「上传无响应」和「模板缩略图无意义」两个问题。

### 背景
执行此 step 的 agent 需要了解：
- Steps 1~2 已完成：双栏布局存在，ResultPanel 在右栏
- `selectImageFile` 函数是文件选择的统一入口（src/pages/Ecommerce.tsx:241）
- `applyStyleTemplate` 函数在选择模板时同步更新 form.style 和 form.scenarios（src/pages/Ecommerce.tsx:360）
- `TemplatePicker` 接收 `templates` prop，每个模板有 `previewGradient` 字段（CSS gradient string）
- `analyzeEcommerceProduct` API 存在，但调用需要认证且消耗积分——**本 step 不自动触发分析**
- 设计规范：`docs/workflow-design-system.md` Pattern 2（上传即响应）

### 任务清单

#### 3a. 上传后视觉确认反馈

在 `selectImageFile` 函数中，当图片选择成功后，增加以下视觉响应：

```tsx
// 在 setProductImage(image) 之后
// 1. 右栏结果面板切换到「准备就绪」状态（显示上传的商品图大图 + 提示「选择风格后点击生成」）
setUploadedImageReadyHint(true); // 新增 state
// 2. 平滑滚动到模板选择区（如果在移动端视口以外）
templateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
```

新增 `uploadedImageReadyHint` state：  
当 `productImage != null && latestImages.length === 0 && !loading` 时，ResultPanel 右栏显示：
- 左侧：用户上传的商品图（大图预览，`object-contain`）
- 右侧：文字提示「✓ 商品图已就绪 — 选择右侧风格后点击生成」
- 这给用户一个「上传成功 + 下一步引导」的即时反馈

更新 `ResultPanel` 以支持此状态：新增 `uploadedImageUrl?: string` prop，当 `images.length === 0 && !loading && uploadedImageUrl` 时，显示商品图预览 + 引导文案。

#### 3b. 模板选中后预览提示

在 `applyStyleTemplate` 中，模板选中后在 ResultPanel 上方显示一行提示：
```
「${tpl.name} 风格已选择 — 点击「生成场景图」查看效果」
```
可以通过 `selectedTemplate` state（已存在）在 ResultPanel 内部实现：当 `selectedTemplate != null && images.length === 0 && !loading` 时，在面板内显示模板名称的提示标签。

#### 3c. 模板真实示例图（TemplatePicker 升级）

为 `STYLE_TEMPLATES` 的每个模板在 `previewGradient` 旁边新增 `exampleImageUrl` 可选字段：

```ts
interface StyleTemplate {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  style: string;
  scenarios: string;
  previewGradient: string;
  exampleImageUrl?: string; // 真实生成示例图 URL（可为 undefined，降级到渐变色块）
}
```

更新 `TemplatePicker.tsx` 组件：当 `template.exampleImageUrl` 存在时，用 `<img>` 替代渐变色块背景；当不存在时，降级使用现有渐变背景（向后兼容）。

**注意：本 step 不提供真实 exampleImageUrl 的值**（需要产品团队用真实商品生成后填入）。只做接口升级，`STYLE_TEMPLATES` 中 `exampleImageUrl` 字段保持 `undefined`，渲染效果与现在相同。这是为「内容升级」预留的接口，代码层面已准备好。

#### 3d. 为商品图上传区增加「示例商品体验」入口

在上传区下方（商品图未上传时）添加：
```tsx
{!productPreview && (
  <button
    type="button"
    className="mt-1.5 w-full text-[9px] text-white/35 hover:text-primary transition-colors"
    onClick={() => {
      // 加载预置示例商品图（使用 /public 目录中的静态图片）
      // 本 step 先用一个内联提示替代实际加载，避免引入新的静态资源依赖
      notifyInfo('示例商品功能即将上线，请上传您的商品图开始体验');
    }}
  >
    → 没有商品图？先用示例体验
  </button>
)}
```

### 验证步骤
1. `npm run build` — 零错误
2. 上传商品图后：右栏立即显示「商品图已就绪」预览状态
3. 选择模板后：ResultPanel 内显示模板名称提示标签
4. TemplatePicker 在 `exampleImageUrl` 为 undefined 时，视觉效果与 Step 2 之前相同

### 退出标准
- [ ] `npm run build` 零错误
- [ ] 上传图片后 ResultPanel 有即时视觉响应（不再静默）
- [ ] 模板选中后有视觉确认
- [ ] `TemplatePicker` 接口已升级，向后兼容
- [ ] TypeScript 无 any

---

## Step 4 — Template-First 流程 + 步骤预算验证

### 目标
将页面的「视觉权重」从「上传区」转移到「模板选择区」，实现 Template-First 范式。验证步骤数 ≤ 3。

### 背景
执行此 step 的 agent 需要了解：
- Steps 1~3 已完成：双栏布局，ResultPanel，上传响应
- 当前配置区顺序：商品图上传（顶部） → 模板选择 → 格式 → 数量 → 参数
- Template-First 范式要求：**模板选择先于上传**，用户先「选场景」再「放商品」
- 参考：Pebblely 工作流 = 先浏览模板 → 选中 → 上传商品
- `docs/workflow-design-system.md` 第 4.3 节：目标 3 步路径
  - 步骤1：选择场景模板
  - 步骤2：上传商品图
  - 步骤3：点击生成

### 任务清单

#### 4a. 调整配置区内部顺序

将左栏配置区的 JSX 顺序改为：

```
1. [步骤 1] 场景模板选择（TemplatePicker — 移到顶部，增大视觉权重）
   ↳ 标签改为：「① 选择场景风格」（更明确的步骤引导）

2. [步骤 2] 商品图上传区（移到模板下方）
   ↳ 标签改为：「② 上传商品图」（步骤序号引导）

3. [可选] 格式 + 数量
   ↳ 保持 FormatPicker + CountChips，标签不变

4. [可选] 商品名称（productName，★ 必填）

5. [折叠] 高级选项（现有 showAdvanced）

6. 生成按钮（宽 100%）
```

关键视觉改动：
- TemplatePicker 容器增加 padding + border（`border border-white/10 rounded-xl p-3`），强调其为「第一步」
- 上传区缩略图高度从 `h-32` 调整为 `h-40`（更宽的 360px 左栏中稍高一点）
- 步骤序号标签：`① ②` 使用 lime 色（`style={{ color: 'var(--ag-lime)' }}`）

#### 4b. 生成按钮 disabled 状态提示

当前 disabled 条件：`disabled={loading || !productImage}`  
调整为：在按钮 disabled 时显示「缺少什么」的提示：

```tsx
<button
  className="btn-commerce w-full h-12"
  type="button"
  disabled={loading || !productImage}
  onClick={handleSubmit}
  title={!productImage ? '请先上传商品图（步骤②）' : undefined}
>
  {loading ? <Loader2 .../> : !productImage ? '请先上传商品图 ↑' : `✦ 生成场景图 (${imageCount})`}
</button>
```

#### 4c. 快速重试按钮（在 ResultPanel 内）

更新 `ResultPanel` 以在有结果时显示「🔄 用相同参数再生成一次」按钮：
- 点击后调用 `onRetry()` prop（已在 Step 1 中定义）
- 位置：结果网格上方右侧

#### 4d. 步骤预算验证（Playwright 实测）

用 Playwright 录制从「打开 /ecommerce」到「首张结果出现」的操作，计算步骤数。

预期流程（目标 3 步）：
1. 选中「室内生活」模板（1 次点击）
2. 点击上传区 → 选择商品图（1 次操作，包含文件选择）
3. 点击「✦ 生成场景图 (1)」（1 次点击）
4. 结果内联出现在右栏（无需任何额外操作）

若实测超过 3 步，在本 step 内修复到 ≤ 3 步后再标记完成。

### 验证步骤
1. `npm run build` — 零错误
2. 打开页面，第一眼看到的是模板选择器（不是上传区）
3. 按照 4d 的 Playwright 脚本实测步骤数 ≤ 3
4. 按钮在未上传图片时显示「请先上传商品图 ↑」
5. 有结果后「再生成一次」按钮可用

### 退出标准
- [ ] `npm run build` 零错误
- [ ] 模板选择器是页面第一个交互元素（视觉权重最高）
- [ ] 实测步骤数 ≤ 3（Playwright 截图记录）
- [ ] 快速重试按钮功能正常
- [ ] 与 `docs/workflow-design-system.md` Step Budget 表中「电商 ≤3 步」目标对齐

---

## 不变量（每步执行后必须成立）

1. `npm run build` 零错误（TypeScript 严格模式）
2. 现有 `/create` 页不受影响
3. `handleSubmit` 的 API 调用链不变（`generateEcommerceImages` → `addTask`）
4. 现有历史区（ProjectCard / ProjectDetail）正常渲染
5. 认证检查（`viewer?.authenticated`）不得绕过
6. 移动端（375px）工作正常

---

## 回滚策略

每步改动均为增量添加（新组件 + 现有 JSX 调整）。

- Step 1 回滚：删除 `ResultPanel.tsx`，恢复 `handleSubmit` 中的 `openDrawer()` 和 `scrollIntoView` 调用
- Step 2 回滚：恢复外层 div 的 grid 类名到 `max-w-7xl`（无双栏）
- Step 3 回滚：删除 `uploadedImageReadyHint` state 和 ResultPanel 的相关 prop
- Step 4 回滚：恢复配置区 JSX 顺序（模板 ↔ 上传互换位置）

---

## 执行指令

每步开始时，在对话中输入：
```
执行 ecommerce-workflow-paradigm-shift Step N
```

每步完成后运行 `/verify` 确认行为符合「退出标准」，再继续下一步。

---

*计划由 Blueprint skill 生成，2026-05-25。*
