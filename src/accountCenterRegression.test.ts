import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), 'utf8');
}

const ordinaryUserFiles = [
  'src/components/AccountCenterHeader.tsx',
  'src/components/SideNavBar.tsx',
  'src/components/BottomTabBar.tsx',
  'src/pages/Account.tsx',
  'src/pages/Recharge.tsx',
  'src/pages/Billing.tsx',
];

const ordinaryForbiddenTerms = [
  { label: 'Sub2API', pattern: /\bSub2API\b/i },
  { label: 'API Key', pattern: /\bAPI\s*Key\b/i },
  { label: 'backup access key', pattern: /\bbackup access key\b/i },
  { label: '备用访问密钥', pattern: /备用访问密钥/ },
  { label: 'provider URL', pattern: /\bprovider\s+(base\s+)?url\b/i },
  { label: 'provider_base_url', pattern: /\bprovider_base_url\b/i },
  { label: 'auth URL', pattern: /\bauth\s+(base\s+)?url\b/i },
  { label: 'auth_base_url', pattern: /\bauth_base_url\b/i },
  { label: '/v1/usage', pattern: /\/v1\/usage/i },
  { label: '测试连接', pattern: /测试连接/ },
  { label: 'Test Link', pattern: /\bTest Link\b/i },
  { label: 'test connection', pattern: /\btest connection\b/i },
  { label: 'Admin Token', pattern: /\bAdmin\s+Token\b/i },
  { label: 'JWT', pattern: /\bJWT\b/i },
];

test('ordinary account surfaces do not contain technical integration terms', () => {
  const leaks = ordinaryUserFiles.flatMap((path) => {
    const source = readProjectFile(path);
    return ordinaryForbiddenTerms
      .filter(({ pattern }) => pattern.test(source))
      .map(({ label }) => `${path}: ${label}`);
  });

  assert.deepEqual(leaks, []);
});

test('account center desktop and mobile navigation stay consolidated', () => {
  const header = readProjectFile('src/components/AccountCenterHeader.tsx');
  const account = readProjectFile('src/pages/Account.tsx');
  const desktop = readProjectFile('src/components/SideNavBar.tsx');
  const mobile = readProjectFile('src/components/BottomTabBar.tsx');

  assert.match(header, /ACCOUNT_CENTER_PATHS = \['\/account', '\/recharge', '\/config'\]/);
  assert.match(header, /key: 'overview'.*path: '\/account'/s);
  assert.match(header, /key: 'settings'.*path: '\/config'/s);
  assert.doesNotMatch(header, /key: 'billing'|path: '\/billing'|key: 'recharge'/);
  assert.doesNotMatch(account, /AccountCenterHeader|to="\/billing"|to="\/recharge"|to="\/config"|to="\/create"|account_open_billing|account_details/);
  assert.equal(account.match(/account_recharge_action/g)?.length ?? 0, 1);
  assert.doesNotMatch(account, /account_recharge_balance|account_recharge_after_login|account_guest_recharge_desc|account_simple_settings|account_open_settings|account_continue_create|account_start_create/);
  assert.match(desktop, /const accountItem: NavItem = \{ name: t\('account_center_title'\), path: '\/account'/);
  assert.match(desktop, /renderNavItem\(accountItem, isAccountCenterPath\(location\.pathname\)\)/);
  assert.match(mobile, /path: '\/account'.*isActive: isAccountCenterPath/s);
});

test('recharge route opens partner recharge in a new window and refreshes balance', () => {
  const recharge = readProjectFile('src/pages/Recharge.tsx');

  assert.match(recharge, /resolveExternalRechargeUrl\(siteSettings\)/);
  assert.match(recharge, /getBalance\(\)/);
  assert.match(recharge, /window\.addEventListener\('focus', onFocus\)/);
  assert.match(recharge, /window\.removeEventListener\('focus', onFocus\)/);
  assert.match(recharge, /window\.open\(rechargeUrl, '_blank', 'noopener,noreferrer'\)/);
  assert.match(recharge, /前往充值/);
  assert.match(recharge, /充值入口暂未配置，请联系管理员/);
  assert.doesNotMatch(recharge, /Navigate to="\/account" replace|<iframe|RECHARGE_URL|AccountCenterHeader|current="recharge"|recharge_open_external|recharge_continue_create/);
});

test('ordinary translation catalog does not keep in-site finance or checkout copy', () => {
  const site = readProjectFile('src/site.tsx');

  assert.doesNotMatch(site, /billing_|account_open_billing|account_details|config_ledger/);
  assert.doesNotMatch(site, /account_simple_settings|account_open_settings|account_continue_create|account_start_create|recharge_continue_create/);
  assert.doesNotMatch(site, /recharge_amount|recharge_method|recharge_order|recharge_payment|recharge_pay|recharge_create|recharge_summary|recharge_fee/);
  assert.doesNotMatch(site, /账单|财务|订单|支付方式|手续费|创建支付订单|二维码|站内充值|站内支付/);
  assert.doesNotMatch(site, /billing|finance|payment method|create order|fee summary|in-site recharge/i);
});

test('admin configuration keeps integration terms in site translations', () => {
  const site = readProjectFile('src/site.tsx');

  assert.match(site, /site_upstream:\s*'Sub2API 集成'/);
  assert.match(site, /site_admin_token:\s*'Sub2API 管理员 Admin API Key'/);
  assert.match(site, /site_admin_jwt:\s*'Sub2API 管理员 JWT'/);
  assert.match(site, /config_test:\s*'测试连接'/);
  assert.match(site, /site_upstream:\s*'Sub2API Integration'/);
  assert.match(site, /site_admin_token:\s*'Sub2API Admin API Key'/);
  assert.match(site, /site_admin_jwt:\s*'Sub2API Admin JWT'/);
});

test('Config page gates technical controls through the isAdmin branch', () => {
  const config = readProjectFile('src/pages/Config.tsx');

  assert.match(config, /const isAdmin = Boolean\(siteSettings\?\.viewer\.is_admin\);/);
  assert.match(config, /if \(!isAdmin\) \{\s*return <Navigate to="\/account" replace \/>;\s*\}/);
  assert.match(config, /isAdmin \? getConfig\(\) : Promise\.resolve\(null\)/);
  assert.match(config, /isAdmin \? getInspirationStats\(\) : Promise\.resolve\(null\)/);
  assert.match(config, /if \(!config \|\| !isAdmin\) return;/);
  assert.match(config, /if \(!isAdmin\) return;/);
  assert.match(config, /\{isAdmin \? \(/);
  assert.match(config, /\{!isAdmin \? \(/);
  assert.match(config, /t\('config_api_key'\)/);
  assert.match(config, /t\('config_test'\)/);
  assert.match(config, /t\('site_upstream'\)/);
  assert.match(config, /t\('site_admin_token'\)/);
  assert.match(config, /t\('site_admin_jwt'\)/);
});
