import assert from 'node:assert/strict';
import {
  canManageTechnicalConfig,
  createAccountDomainModel,
  hasAvailableBalance,
  hasExternalRecharge,
} from './accountDomain';
import type { AccountInfo, BalanceInfo, SiteSettings, ViewerInfo } from './api';

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

const guestViewer: ViewerInfo = {
  authenticated: false,
  owner_id: 'guest:abc',
  guest_id: 'abc',
  api_key_source: 'manual',
  user: null,
};

const signedInViewer: ViewerInfo = {
  authenticated: true,
  owner_id: 'user:7',
  guest_id: 'abc',
  api_key_source: 'managed',
  user: {
    id: 7,
    email: 'demo@example.com',
    username: 'demo-user',
    role: 'user',
  },
};

const adminViewer: ViewerInfo = {
  ...signedInViewer,
  owner_id: 'user:1',
  user: {
    id: 1,
    email: 'admin@example.com',
    username: 'admin-user',
    role: 'admin',
  },
};

const availableBalance: BalanceInfo = {
  ok: true,
  remaining: 12.3456,
  raw: { source: 'provider' },
};

const unavailableBalance: BalanceInfo = {
  ok: false,
  remaining: null,
  message: 'balance unavailable',
  raw: null,
};

const signedInAccount: AccountInfo = {
  viewer: signedInViewer,
  user: {
    name: 'Demo Account',
    email: 'account@example.com',
    username: 'account-user',
    role: 'user',
    authenticated: true,
    guest: false,
    api_key_set: true,
    api_key_source: 'managed',
    model: 'gpt-image-2',
  },
  balance: availableBalance,
  stats: {
    edits: 1,
    last_generation_at: null,
    succeeded: 2,
    total: 3,
  },
};

const siteSettingsWithRecharge = {
  recharge_url: 'https://sub.chris233.qzz.io',
  viewer: {
    authenticated: true,
    is_admin: false,
  },
} satisfies Pick<SiteSettings, 'recharge_url' | 'viewer'>;

const siteSettingsWithoutRecharge = {
  recharge_url: '',
  viewer: {
    authenticated: true,
    is_admin: false,
  },
} satisfies Pick<SiteSettings, 'recharge_url' | 'viewer'>;

test('maps guest to guest identity and unavailable business states', () => {
  const model = createAccountDomainModel({ viewer: guestViewer, siteSettings: siteSettingsWithRecharge });

  assert.equal(model.identity.status, 'guest');
  assert.equal(model.identity.isSignedIn, false);
  assert.equal(model.balance.status, 'unavailable');
  assert.equal(model.balance.reason, 'guest');
  assert.equal(model.recharge.status, 'unavailable');
  assert.equal(model.recharge.reason, 'guest');
  assert.equal(model.technicalConfig.status, 'hidden');
  assert.equal(model.view.showSignInAction, true);
});

test('does not treat managed key plumbing as signed-in identity', () => {
  const model = createAccountDomainModel({
    viewer: {
      ...guestViewer,
      api_key_source: 'managed',
    },
  });

  assert.equal(model.identity.status, 'guest');
  assert.equal(model.identity.isSignedIn, false);
});

test('maps authenticated account payload to a signed-in AetherGenix account', () => {
  const model = createAccountDomainModel({
    account: signedInAccount,
    siteSettings: siteSettingsWithRecharge,
  });

  assert.equal(model.accountProduct, 'AetherGenix');
  assert.equal(model.identity.status, 'signed_in');
  assert.equal(model.identity.displayName, 'account-user');
  assert.equal(model.identity.ownerId, 'user:7');
  assert.equal(model.balance.status, 'available');
  assert.equal(model.recharge.status, 'available');
  assert.equal(model.recharge.mode, 'external_handoff');
});

test('maps signed-in account with balance and external recharge entry to available states', () => {
  const model = createAccountDomainModel({
    viewer: signedInViewer,
    balance: availableBalance,
    siteSettings: siteSettingsWithRecharge,
  });

  assert.equal(model.identity.status, 'signed_in');
  assert.equal(model.identity.displayName, 'demo-user');
  assert.equal(model.balance.status, 'available');
  assert.equal(hasAvailableBalance(model.balance), true);
  assert.equal(model.balance.formatted, '12.3456');
  assert.equal(model.recharge.status, 'available');
  assert.equal(hasExternalRecharge(model.recharge), true);
  assert.equal(model.recharge.externalUrl, 'https://sub.chris233.qzz.io');
  assert.equal(model.view.showRechargeAction, true);
  assert.deepEqual(Object.keys(model.view).sort(), ['showRechargeAction', 'showSignInAction', 'showTechnicalConfig']);
});

test('maps signed-in account with unavailable balance and missing recharge entry explicitly', () => {
  const model = createAccountDomainModel({
    viewer: signedInViewer,
    balance: unavailableBalance,
    siteSettings: siteSettingsWithoutRecharge,
  });

  assert.equal(model.identity.status, 'signed_in');
  assert.equal(model.balance.status, 'unavailable');
  assert.equal(model.balance.reason, 'not_synced');
  assert.equal(model.balance.message, 'balance unavailable');
  assert.equal(model.recharge.status, 'unavailable');
  assert.equal(model.recharge.reason, 'missing_external_url');
});

test('maps loading balance and recharge states explicitly', () => {
  const model = createAccountDomainModel({
    viewer: signedInViewer,
    balanceLoading: true,
    rechargeLoading: true,
    siteSettings: siteSettingsWithRecharge,
  });

  assert.equal(model.balance.status, 'loading');
  assert.equal(model.recharge.status, 'loading');
  assert.equal(model.view.showRechargeAction, false);
});

test('maps admin viewer to technical configuration permission', () => {
  const siteSettings = {
    viewer: {
      authenticated: true,
      is_admin: true,
    },
    recharge_url: '',
    upstream: null,
  } satisfies Pick<SiteSettings, 'viewer' | 'recharge_url' | 'upstream'>;

  const model = createAccountDomainModel({
    viewer: adminViewer,
    siteSettings,
  });

  assert.equal(model.identity.status, 'signed_in');
  assert.equal(model.technicalConfig.status, 'allowed');
  assert.equal(canManageTechnicalConfig(model.technicalConfig), true);
  assert.equal(model.view.showTechnicalConfig, true);
});

test('maps admin role to technical configuration permission without leaking it to ordinary viewers', () => {
  const adminModel = createAccountDomainModel({ viewer: adminViewer });
  const ordinaryModel = createAccountDomainModel({ viewer: signedInViewer });

  assert.equal(adminModel.identity.status, 'signed_in');
  assert.equal(adminModel.technicalConfig.status, 'allowed');
  assert.equal(adminModel.technicalConfig.reason, 'admin');
  assert.equal(ordinaryModel.identity.status, 'signed_in');
  assert.equal(ordinaryModel.technicalConfig.status, 'hidden');
  assert.equal(ordinaryModel.technicalConfig.reason, 'ordinary_viewer');
});
