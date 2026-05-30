# Batch 1 — 引导对齐（实施清单）

> 纯文案 + 轻交互 + 两处结构调整，零生成逻辑改动。
> 字符串均取自真机 DOM（与源码静态文本一致）。按文件逐条 before → after。
> 落地分支：`feat/create-flow-batch1-guidance`（基于 main）。

## A. 术语统一（场景 / 生意类型 / 商品图）— P2

### `src/pages/Create.tsx`
- 副标题（同时修"描述场景"不存在的步骤，P2+承诺对齐）
  - before: `一个向导走完：选类目、传商品图、描述场景，点生成即可，结果实时显示在下方。`
  - after:  `先选场景，再传商品图，最后微调出图——几步拿到能用的商品图，结果实时显示在下方。`
- Hero 标题
  - before: `用模板风格生成商品图`
  - after:  `按场景一键生成商品图`
- Hero 描述
  - before: `先按客户类型和场景挑一个专家模板，再上传商品图，按模板风格直接生成可继续编辑的结果。`
  - after:  `先按生意类型和场景选一个，再上传商品图，直接生成可继续编辑的结果。`
- 步骤①标题 `选择模板` → `选择场景`
- 步骤①描述 `按客户类型与场景挑专家模板` → `按生意类型和场景选一个`
- 步骤③描述 `调比例与数量，按模板风格一键出图` → `调比例与数量，一键出图`

### `src/components/ecommerce/SceneBrowser.tsx`
- 左侧导航 `aria-label="客户类型"` → `aria-label="生意类型"`
- （标题"想做哪种图？/ 先选你的生意类型…"已合规，不动）

### `src/components/ecommerce/CreateFlowWizard.tsx`（UploadStep / TuneStep）
- UploadStep 副标题 `已选模板「` → `已选场景「`
- UploadStep `（v1 暂只支持单图）` → `（目前支持单张商品图）`  ← 见 C
- TuneStep 文案中 `模板「…」已就绪` → `场景「…」已就绪`

## B. 删入口页：点「创作」直接进第 1 步 — P5（结构）

`src/pages/Create.tsx`：当前先渲染 CreateHero（营销卡 + 开始创作），点击后才 dispatch 进 wizard。
- 改为：进入 `/create` 直接渲染 `CreateFlowWizard` 的第 1 步（browse），移除中间 Hero 门槛。
- 若保留一句引导，压到第 1 步标题下方一行（用 A 的新副标题）。
- 注意：移除 `开始创作` 后，确认不残留对该按钮的引用/state。

## C. 去版本号 — P6

见 A 中 UploadStep：`（v1 暂只支持单图）` → `（目前支持单张商品图）`。

## D. 第 3 步默认值：1:1 + 1 张并高亮"推荐" — P1（轻交互）

`CreateFlowWizard.tsx` TuneStep：
- 初始 state：`aspectRatio: '1:1'`、`count: 1`（若已存在则确保有默认，不留空选）。
- 选中态：复用现有 lime 描边样式；在 `1:1` 与 `1 张` 上加"推荐"小标。
- 不改生成逻辑，仅初始化默认 + 视觉标注。

## E. 场景分类兜底（Batch 1 轻量版）— P1

`sceneCatalog.ts` / `SceneBrowser.tsx`：本批只做**轻量**，不重排五大类（重排放 Batch 2 配合真实样例图）：
- 在左侧"生意类型"列表顶部加一项 **「最常用 / 不确定从这开始」**，默认选中，聚合各类高频场景（如 白底主图 / 场景氛围图 / 促销海报）。
- 实现：新增一个虚拟 customer key（如 `popular`），`scenesOf('popular')` 返回精选若干 SceneTemplate（引用已有项，不新增数据轴）。

## 验收（DoD）
1. `npm run lint`（tsc --noEmit）通过
2. `npm run test:account`（含 CreateFlowWizard.test.tsx）通过——若快照/文案断言因改文案而失败，同步更新断言
3. 全流程不再出现 模板/类目/客户类型 字样（过 grep）
4. 1440 宽整页截图更新 `doc/UI/0X-*.png`
5. code-reviewer agent 过审
