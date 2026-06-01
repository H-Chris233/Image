# /create — Single Backlog (THE ordered to-do)

> 唯一权威待办。换窗口/新 agent **先读这里**决定做什么，再读对应页 md + PANEL-REVIEW.md 看细节。
> 来源：`PANEL-REVIEW.md`(6 视角评审团) + prior solo HIG + Batch 1 复盘。每项标 状态 / 批次 / 谁提的。
> 状态：☐ 待做 · ◐ 进行中 · ☑ 已做并验证 · ⛔ 待你决策(不可擅自实现)。

## ⛔ 必须你先拍板的决策（未决 = 禁止实现，否则又会打架）

- **D1 入口模型（三选一，互斥）**：
  (a) 保留进 /create 自动弹全屏向导，但 X 退回上一路由/结果列表；
  (b) 第 1 步**内联**进页面、不做全屏接管；
  (c) 先展示 CreateHero（带真实样例证明）+ 单一 CTA，按用户意图才打开向导。
  现状：Batch 1 选了"自动直进 + 关闭回落 CreateHero"，评审团判定为 H3（伏击+循环+两套相反 gating）。**默认倾向 (c)**，但等你定。
- **D2 「最常用」方向**：(IA 派) 按产出去重 + 按用户业务信号选 prompt　vs　(转化派) 预高亮一个推荐场景一键用。冲突点：硬编码 cross-border prompt 会坑国内卖家(provenance 陷阱 H4b)。
- **D3 分类轴**：继续贴"最常用"默认膏药　vs　上线前重构成单一"按你要啥图"轴（主图/场景氛围/海报/模特/细节/封面），业态降为次级筛选。

## 🔴 上线前必做（panel 共识 = 不修不能给付费用户上）

- ☐ **F1 失败态人话化 + 失败卡内联重试**　[blocker · 提出:prior-HIG,HIG,转化,移动,无障碍]
  生成错误经统一翻译层(人话标题 + 一句原因 + 「详情」折叠原始信息)；失败卡内放醒目「重试」；**永不外泄** `Sub2API/ConnectError/HTTP`。涉及 `Create.tsx` TaskResultRow(~L417)、`CreateFlowWizard.handleGenerate`。违反 P4+DoD#5。**最高优先。**
- ☐ **F2 先证明后付费**　[blocker · 提出:转化,移动]
  至少：首张免费/水印预览让用户看到"自己产品"被处理后再要登录；或把"登录后生成·首张免费"前置到第 1 步框架。别在生成点才弹登录墙+充值墙。违反 P3。
- ☐ **F3 入口与无障碍最关键项**（依赖 D1）：wizard 补 `role=dialog/aria-modal/焦点陷阱/Esc/移焦还焦`；按 D1 定的模型统一入口、消除两套相反 gating。
- ☐ **F4 重截 `doc/UI/0X-*.png`（1440 真机新构建）+ 删根目录散落 test-*/flow-* png**（DoD#4）。

## 🟠 Batch 2（信心与可用，决定留存）

- ☐ B2-1 真实"你自己产品"before→after 样图替换 Unsplash 盗链(本地 `public/scene-samples`)；上传步回显所选场景样图。[rank3]
- ☐ B2-2 第 1 步预选一个"推荐"场景 + 每卡一句人话副标题；补 1:1/1张 的「推荐」小标(BATCH1 §D 欠账)。[rank7/8]
- ☐ B2-3 选中态改 lime 描边+浅底填充(别只 2px 边)；强调色收回到"一屏唯一主操作"，filter tab 与取值 Segmented 视觉分家。[rank8]
- ☐ B2-4 移动端：分类条溢出提示/换可换行 chip；上传"拍照/相册"为主、加 `capture`；主 CTA sticky 沉底；比例手机端收到 2–3 个。[rank10]
- ☐ B2-5 无障碍补齐：对比度 ≥4.5:1(弃 text-white/45、提亮 #8a8680)；状态加图标非纯色；进度 `role=progressbar`；错误 `role=alert`；SegmentedControl 改 `radiogroup`+方向键。[rank9/12]
- ☐ B2-6 「最常用」按 D2 落地(去重/标 provenance)。

## 🟡 Batch 3（打磨）

- ☐ 分类轴按 D3 重构(若选重构)。[rank6]
- ☐ 结果页单一 lime 主操作(下载为主)；费用用"约 X 元/还能出 N 次"。[rank11]
- ☐ 术语统一最后一公里：上传商品/上传商品图、图片比例/画面比例、`1张` 空格、第1步三种框架(图种/生意/场景)收一个。[rank13]
- ☐ 返回浏览保留已选类目。

## 已完成（Batch 1, PR #157）

- ☑ 术语统一 场景/生意类型/商品图（验证：tsc + test:account 绿）
- ☑ 副标题去"描述场景"、去"v1"版本号
- ◐ "删入口页" → 实为"默认直进 + 关闭回落 CreateHero"（**未真删**，引出 D1，见 F3）
- ◐ 场景"最常用"兜底（已加，但有 provenance 陷阱，见 D2/B2-6）
- ☑ 第3步默认 1:1/1张（state 已有）；✗ 但"推荐"视觉信号未做（见 B2-2）
