# /create 6-Lens Design Panel — Consolidated Review

> Review-only. 6 specialist agents (Apple HIG / 信息架构 / 视觉系统 / 无障碍 WCAG / 移动端 / 转化心理) scored against `README.md` north star, then synthesized + deduped vs the prior solo HIG pass.
> **Panel consensus verdict: NO — do not ship to the first paying merchant yet.** (All 6 lenses individually said "ship-with-fixes"; combined, two blockers make it a NO.)

## Per-lens scores (0–10) & verdict

| Lens | clarity | ia | hierarchy | burden↑=lower | mental | verdict |
|---|---|---|---|---|---|---|
| Apple HIG | 7 | 7 | 6 | 8 | 7 | ship-with-fixes |
| 信息架构 | 6 | **4** | 7 | 7 | 5 | ship-with-fixes |
| 视觉系统 | 6 | 6 | **4** | 6 | 6 | ship-with-fixes |
| 无障碍 WCAG | 6 | 7 | 6 | 5 | 6 | ship-with-fixes |
| 移动端 | 6 | 5 | 6 | 5 | 6 | ship-with-fixes |
| 转化心理 | 7 | 7 | 6 | 6 | **5** | ship-with-fixes |

最弱维度：**信息架构 / 心智模型 / 视觉层级**。

## 🔴 BLOCKERS (consensus → NO ship)

**B1 · 失败态泄漏原始报错 + 失败卡内无重试** — 提出方：prior-HIG, HIG, 转化, 移动, 无障碍（5/7）
`Create.tsx` TaskResultRow(~L417) 直接渲染 `{run.task?.error || '生成失败，请重试'}`，wizard `handleGenerate` 把 `errorMessage(error)`(原始 Error.message)塞进 state.error。`test-05-after-generate-503.png` 证明 503 路径真实发生。付费+上传后的非技术店主会看到 `Sub2API/ConnectError/HTTP 503`→读作"坏了/被骗"→退款流失。重试只在侧栏"相同设置重生成"，手机上在折叠线下方。**违反 P4 + DoD#5。这是上线头号阻断。**

**B2 · 付费+登录在"看到任何成果之前"** — 提出方：转化(blocker), HIG, IA, 移动
向导对所有人自动打开，但 `runGeneration` 在点「生成」那一刻才弹登录墙，紧接可能弹充值墙。此前唯一的"信心资产"是 6 张 Unsplash 别人的图 + 静态 sampleImage，**从没出现"你这张图会变成啥"**。"怕花钱看不到结果"的目标用户做完全部投入、情感已承诺，却被要求先注册先付费且零证明。**违反 P3。**

## 🟠 HIGH (跨多视角共识)

**H3 · 自动全屏弹窗 = 伏击 + CreateHero 没真删 + 它根本不是 dialog**
HIG/视觉/转化：进 /create 直接被全屏 `fixed inset-0 z-50` 接管（没主动触发），关闭(X)又回落到本应删除的 CreateHero（带另一个"开始创作"重开同弹窗=循环）；且 `handleStartCreate` 走的是先 gating 再开，与自动打开**两套相反的门**。无障碍：该 overlay 是裸 div——无 `role=dialog`/`aria-modal`/焦点陷阱/Esc/打开时移焦/关闭还焦，键盘&读屏用户会 Tab 到背后的页面。（HIG modality / WCAG 4.1.2·2.4.3 / P5）

**H4 · 分类轴混乱，「最常用」只是膏药** — IA(ia=4/10) + 转化 + 移动
`CUSTOMERS` 混了 3+ 轴：渠道(跨境/国内电商)、业态(实体店·餐饮)、内容(公众号·自媒体)、垃圾桶(中小SaaS·实业把软件和实业揉一起)。**README §1 点名的"小红书店主"在分类里根本没有**。同名场景(白底主图/促销海报/场景氛围图)跨多个桶但 prompt 不同→用户以为左栏没用。点开膏药仍第一个撞见"亚马逊/独立站"。（P1/P2 结构层）

**H5 · 第1步没默认场景 + 选中态太弱 + 卡片黑话** — 视觉/IA/转化/移动/无障碍
只默认了"分类"没默认"场景"，6 张卡仍是硬决策；选中态只有 2px lime 边压在深色照片上(最弱信号)；"精修主图 vs 白底主图"无一句人话；触屏上"使用→"是 hover 才出(手机永不出现)；首屏主按钮 disabled。（P1）

**H6 · lime 强调色失控** — 视觉(hierarchy=4/10)
一屏 4+ 处实心 lime（步骤点 / 分类 tab / 选中卡环+角标 / 主按钮）；filter tab 和 SegmentedControl 用**同款 lime pill**，"筛选视图"和"提交取值"两种语义视觉等同。主操作没有唯一锚点。（README §2 强调色纪律）

**H7 · 对比度不达标 + 颜色单一区分状态** — 无障碍
`text-white/45`、helper token `#8a8680` 在深底 < 4.5:1（上传指引/0-300 计数/场景 tagline 大面积用它）；失败/完成主要靠红 vs lime 区分。（WCAG 1.4.3 / 1.4.1）

**H8 · 「推荐」标没做** — HIG/IA/转化
BATCH1.md §D 承诺 1:1 / 1张 加"推荐"小标，代码没实现；默认值只在 state，用户眼睛看不到"已替你选好"。（P1）

**H9 · 移动端硬伤** — 移动
分类条横向滚动无溢出提示(360px 只露 1-2 类，餐饮/自媒体看不见)；上传文案"拖放"(手机不能拖)、file input 无 `capture` 相机入口；各步主 CTA 不 sticky、沉在 320px 拖拽区/双 SegmentedControl 之下；比例 5 选在 360px 过挤易误触。

## 🟡 MEDIUM / LOW
- 上传步看不到所选场景样图，P3 在投入步断档
- Unsplash 盗链：离线/被墙即裂图 + CLS（应换本地 `public/scene-samples` 真图 before/after）
- 结果页双 lime 主按钮(两个"新建创作")稀释主操作；结果/失败页"下载/重试"没拿到强调色
- 术语微漂：上传商品/上传商品图、图片比例/画面比例、`1张/1 张`
- 返回浏览清空已选类目(forgiveness)
- `doc/UI/*.png` 截图过期(DoD#4 未补) + 根目录散落 test-*/flow-* png 应清

## 比单 HIG 新增（6人团的增量）
- **无障碍整层**：wizard 非 dialog / 对比度 / SegmentedControl 应为 radiogroup+方向键 / 进度条无 `role=progressbar` / 错误非 `aria-live`
- **移动端整层**：横滚溢出、拖放 vs 相机、sticky CTA、比例过挤、关闭键在右上最难触达
- **IA 结构判断**：小红书目标用户缺席、SaaS·实业垃圾桶、三轴混合、同名场景
- **视觉**：lime 失控 + 选中态过弱 + filter/取值视觉语义冲突
- **转化**：auto-open 与 handleStartCreate 两套相反 gating；费用用 credit 而非"约 X 元/还能出 N 次"

## 唯一最该改（panel biggestSingleChange）
**先把失败态做对**：所有生成错误经一个用户向翻译层（人话标题 + 一句原因 + 「详情」折叠原始信息），并在**失败卡内**放醒目「重试」。把这条从 Batch 2 提到**上线前必做**。
