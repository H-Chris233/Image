# ADR 0004 · External Recharge Handoff Only

**状态**：已接受
**日期**：2026-05-18
**关联**：GitHub Issue #20「配置充值运行模式和外部充值入口策略」
**上游约束**：ADR 0003 · AetherGenix Account & Credits Domain Model

## 背景

ADR 0003 已决定：普通用户只理解 **AetherGenix 账户**、**AetherGenix 可用余额**和**AetherGenix 生成扣费**；Sub2API 是底层登录、注册、余额、充值、Key 托管和 OpenAI-compatible `/v1` 代理能力提供方。

后续业务澄清进一步确认：

- AetherGenix 不需要在站内实现复杂充值、支付订单、账单中心或财务管理。
- 唯一余额 source of truth 是 Sub2API 用户余额。
- 充值发生在 Sub2API/统一账户服务那边。
- AetherGenix 只负责登录注册、展示当前可用余额、提供充值入口、生成图片时直接使用同一余额扣费。
- 普通用户不需要自己生成 Key、复制 Key 或在 AetherGenix 填入 Key。

## 决策

选择 **外部充值 handoff 作为唯一普通用户充值路径**。

AetherGenix 不在普通用户界面提供站内金额选择、支付方式选择、创建支付订单、二维码支付、订单轮询或财务账单中心。普通用户充值时，只从 AetherGenix 打开配置好的充值入口；充值完成后回到 AetherGenix 刷新余额并继续生成。

## 普通用户边界

普通用户可以看到：

- 当前可用余额
- 登录/注册入口
- 前往充值
- 刷新余额
- 继续创作
- 简单偏好设置

普通用户不应该看到：

- 站内支付表单
- 支付方式选择
- 手续费汇总
- 创建支付订单
- 支付二维码弹窗
- 订单轮询状态
- 财务管理或复杂账单中心
- API Key、备用访问密钥、Admin Token、JWT、provider/auth URL、测试连接等技术词

## 管理员边界

管理员配置页仍然可以保留 Sub2API 技术词和运维设置，包括：

- Sub2API auth base URL
- Sub2API provider base URL
- RECHARGE_URL / recharge_url
- Admin API Key / `SUB2API_ADMIN_TOKEN`
- Admin JWT / `SUB2API_ADMIN_JWT`
- 新用户试用余额 `TRIAL_BALANCE_USD` / `trial_balance_usd`
- 测试连接

这些属于站主和运维配置，不进入普通用户心智。

## 实现要求

- `/recharge` 是轻量入口页，只展示可用余额、刷新按钮、外部充值入口和继续创作。
- `/billing` 不作为普通用户导航或财务中心；兼容旧路由时应回到 `/account`。
- 账户页不承担财务管理，只展示身份、可用余额、最近生成摘要和少量动作入口。
- 充值入口 URL 由配置驱动，优先使用 public `recharge_url`，再使用管理员配置的有效 `recharge_url`。
- 如果充值入口未配置，页面提示联系站主，不显示站内支付替代方案。

## 仍需运营确认

1. `RECHARGE_URL` 最终指向哪里。
2. 外部充值页是否已经说明这是为 AetherGenix 账户充值。
3. 充值完成后的余额同步/刷新预期。
4. 新用户试用余额是否继续自动发放，以及 Admin Token/JWT 是否已配置。

## 2026-05-18 最终实现修订

外部充值 handoff 仍然是唯一充值模式，但普通用户不再进入独立 `/recharge` 页面。

- `/account` 承载唯一的余额与充值 handoff UI。
- `/recharge` 只保留为 legacy redirect，避免旧链接失效。
- 余额同步只在 `/account` 发生，避免“我的”和“充值”两处重复同步同一份余额。
- 普通用户不再看到设置入口、继续创作入口或任何站内充值/财务视觉结构。
- 充值完成后，用户回到 `/account` 刷新余额即可。
