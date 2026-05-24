# AetherGenix Account & Credits Domain Model · Issue Drafts

来源：ADR 0003 和 ADR 0004
状态：已发布到 GitHub Issues；本地实现已按“外部充值 handoff only”方向收敛
默认标签：AFK issue 使用 `ready-for-agent`，HITL issue 使用 `ready-for-human`

## Published Issues

| Issue | Type | Label | Blocked by |
|---|---|---|---|
| [#15 建立账户与额度领域状态模型](https://github.com/H-Chris233/Image/issues/15) | AFK | `ready-for-agent` | None |
| [#16 统一账户中心路由、导航和普通用户词汇边界](https://github.com/H-Chris233/Image/issues/16) | AFK | `ready-for-agent` | #15 |
| [#17 实现充值状态机和支付不可用兜底](https://github.com/H-Chris233/Image/issues/17) | AFK | `ready-for-agent` | #15 |
| [#18 统一余额与明细展示的一致性](https://github.com/H-Chris233/Image/issues/18) | AFK | `ready-for-agent` | #15 |
| [#19 收紧管理员与普通用户配置边界](https://github.com/H-Chris233/Image/issues/19) | AFK | `ready-for-agent` | #16 |
| [#20 配置充值运行模式和外部充值入口策略](https://github.com/H-Chris233/Image/issues/20) | HITL | `ready-for-human` | #17 |
| [#21 补齐账户、额度、充值的端到端回归测试](https://github.com/H-Chris233/Image/issues/21) | AFK | `ready-for-agent` | #16, #17, #18, #19 |

## Local Execution Status

| Issue | Local status | Notes |
|---|---|---|
| #15 | Implemented, simplified | `src/accountDomain.ts` now models AetherGenix identity, balance, external recharge handoff, and admin-only technical config. It no longer models in-site checkout. |
| #16 | Implemented | Desktop and mobile navigation expose one Account Center entry. Account Center tabs are Account, Recharge, Settings. |
| #17 | Superseded by #20 | In-site checkout states were removed. Recharge is now a simple external handoff page. |
| #18 | Simplified | Balance copy is unified. Separate Billing/finance center is removed from ordinary UX; `/billing` redirects to `/account`. |
| #19 | Implemented | Ordinary users see profile, language, announcement, balance status, and usage summary. Sub2API integration controls remain admin-only. |
| #20 | Accepted external-only | ADR 0004 records the final operating mode: Sub2API/统一账户服务 owns recharge and balance; AetherGenix only links out. |
| #21 | Implemented | `npm run test:account` covers account domain, external recharge URL resolution, ordinary-user vocabulary boundaries, and account-center navigation. |

## Current Product Slices

1. **Account identity and balance model**

   Build a single domain model that answers:

   - Is the visitor a guest or signed-in AetherGenix account?
   - Is balance loading, available, or temporarily unavailable?
   - Is there a configured external recharge entry?
   - Can this viewer see admin-only Sub2API technical configuration?

   Acceptance criteria:

   - Signed-in Sub2API users are represented to ordinary UI as signed-in AetherGenix accounts.
   - Managed Key state is not used as product identity.
   - The recharge model is external handoff only.
   - No view flag or UI model implies a separate Billing/finance center.

2. **Account Center navigation and copy**

   Keep account-related UX inside one lightweight module.

   Acceptance criteria:

   - Desktop navigation exposes one Account Center entry.
   - Mobile navigation has Create, History, Favorites, Me.
   - Account Center tabs are Account, Recharge, Settings.
   - `/billing` redirects to `/account`.
   - Ordinary pages do not display Sub2API, API Key, backup access key, provider URL, auth URL, usage path, upstream system, test connection, payment configuration, billing, finance, or order language.

3. **External recharge handoff**

   AetherGenix does not run checkout. It shows the current balance and links to the configured recharge page.

   Acceptance criteria:

   - Guest users see a sign-in prompt.
   - Signed-in users see current balance and a refresh button.
   - If a recharge URL exists, the page opens it in a new tab/window.
   - If no recharge URL exists, the page tells the user to contact the site owner.
   - No amount picker, payment picker, fee summary, create-order button, QR modal, polling, order list, or finance panel exists in ordinary UX.

4. **Ordinary settings versus admin integration**

   Ordinary settings are preferences. Admin settings are integration controls.

   Acceptance criteria:

   - Ordinary users cannot see or edit API Key, backup access key, model/provider integration, Sub2API URLs, Admin Token/JWT, or test connection controls.
   - Ordinary settings do not fetch or show usage log/ledger data.
   - Admin users can configure Sub2API provider URL, auth URL, recharge URL, trial balance, Admin API Key, and JWT.
   - Admin-only usage log remains a small diagnostic panel, not a user-facing finance center.

5. **Regression coverage**

   Keep the simplified model from drifting back into a complex checkout/accounting product.

   Acceptance criteria:

   - `npm run test:account` passes.
   - Lint/build pass.
   - Regression scans fail if ordinary user routes reintroduce forbidden technical or finance terms.
   - Browser smoke verifies `/account`, `/recharge`, and `/billing` redirect behavior.

## Issue #20 Implementation Note · 2026-05-18

- Simplified `src/pages/Recharge.tsx` to balance, refresh, external recharge link, and continue-creating action.
- Added `resolveExternalRechargeUrl(...)` in `src/rechargeDomain.ts`.
- Removed ordinary navigation to Billing/finance.
- Redirected `/billing` to `/account`.
- Simplified `src/accountDomain.ts` so recharge means external handoff, not checkout.
- Removed ordinary Settings ledger fetch; only admins load the small usage log.
- Cleaned ordinary user translations so no billing/order/payment wording remains.

## Final Consolidation Note · 2026-05-18

- Merged the external recharge handoff into `/account`; ordinary users now have one balance surface.
- Changed `/recharge` to a legacy redirect to `/account`.
- Changed non-admin `/config` access to redirect to `/account`; admin configuration remains available for site owners.
- Removed ordinary account page cards/actions for settings and continue-creating because global navigation already covers those workflows.
- Updated regression tests so ordinary account UI cannot reintroduce duplicate `/recharge`, `/config`, or `/create` visual entrances.
