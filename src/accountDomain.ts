import type { AccountInfo, BalanceInfo, SiteSettings, ViewerInfo } from './api';
import { resolveExternalRechargeUrl } from './rechargeDomain';

export type AccountIdentityStatus = 'guest' | 'signed_in';

export type AccountBalanceStatus = 'loading' | 'available' | 'unavailable';

export type AccountRechargeStatus = 'loading' | 'available' | 'unavailable';

export type AccountBalanceUnavailableReason = 'guest' | 'sync_failed' | 'not_synced';

export type AccountRechargeUnavailableReason = 'guest' | 'missing_external_url';

export type TechnicalConfigVisibilityReason = 'admin' | 'guest' | 'ordinary_viewer';

export type AccountIdentityState = {
  status: AccountIdentityStatus;
  isSignedIn: boolean;
  ownerId: string | null;
  guestId: string | null;
  userId: number | null;
  displayName: string;
  email: string | null;
  username: string | null;
  role: string | null;
};

export type AvailableAccountBalanceState = {
  status: 'available';
  remaining: number;
  formatted: string;
  canGenerate: boolean;
};

export type LoadingAccountBalanceState = {
  status: 'loading';
  remaining: null;
  formatted: string;
};

export type UnavailableAccountBalanceState = {
  status: 'unavailable';
  remaining: null;
  formatted: string;
  reason: AccountBalanceUnavailableReason;
  message: string | null;
};

export type AccountBalanceState =
  | AvailableAccountBalanceState
  | LoadingAccountBalanceState
  | UnavailableAccountBalanceState;

export type AvailableAccountRechargeState = {
  status: 'available';
  mode: 'external_handoff';
  externalUrl: string;
};

export type LoadingAccountRechargeState = {
  status: 'loading';
  mode: 'external_handoff';
  externalUrl: '';
};

export type UnavailableAccountRechargeState = {
  status: 'unavailable';
  mode: 'external_handoff';
  externalUrl: '';
  reason: AccountRechargeUnavailableReason;
};

export type AccountRechargeState =
  | AvailableAccountRechargeState
  | LoadingAccountRechargeState
  | UnavailableAccountRechargeState;

export type TechnicalConfigPermission = {
  status: 'allowed' | 'hidden';
  canManageTechnicalConfig: boolean;
  reason: TechnicalConfigVisibilityReason;
};

export type AccountDomainViewFlags = {
  showSignInAction: boolean;
  showRechargeAction: boolean;
  showTechnicalConfig: boolean;
};

export type AccountDomainModel = {
  accountProduct: 'AetherGenix';
  identity: AccountIdentityState;
  balance: AccountBalanceState;
  recharge: AccountRechargeState;
  technicalConfig: TechnicalConfigPermission;
  view: AccountDomainViewFlags;
};

export type AccountDomainInput = {
  viewer?: ViewerInfo | null;
  account?: AccountInfo | null;
  balance?: BalanceInfo | null;
  balanceLoading?: boolean;
  balanceError?: boolean | Error | null;
  rechargeLoading?: boolean;
  siteSettings?: Pick<SiteSettings, 'viewer' | 'recharge_url' | 'upstream'> | null;
  adminCapability?: boolean | null;
};

export type AccountIdentityInput = Pick<AccountDomainInput, 'viewer' | 'account'>;

export type AccountBalanceInput = Pick<AccountDomainInput, 'account' | 'balance' | 'balanceLoading' | 'balanceError'> & {
  identity: AccountIdentityState;
};

export type AccountRechargeInput = Pick<AccountDomainInput, 'siteSettings' | 'rechargeLoading'> & {
  identity: AccountIdentityState;
};

export type TechnicalConfigInput = Pick<AccountDomainInput, 'viewer' | 'account' | 'siteSettings' | 'adminCapability'> & {
  identity: AccountIdentityState;
};

const EMPTY_BALANCE_TEXT = '--';
const ADMIN_ROLES = new Set(['admin', 'owner', 'super_admin']);

export function createAccountDomainModel(input: AccountDomainInput = {}): AccountDomainModel {
  const identity = deriveAccountIdentity(input);
  const balance = deriveAccountBalance({ ...input, identity });
  const recharge = deriveAccountRecharge({ ...input, identity });
  const technicalConfig = deriveTechnicalConfigPermission({ ...input, identity });

  return {
    accountProduct: 'AetherGenix',
    identity,
    balance,
    recharge,
    technicalConfig,
    view: {
      showSignInAction: !identity.isSignedIn,
      showRechargeAction: identity.isSignedIn && recharge.status !== 'loading',
      showTechnicalConfig: technicalConfig.canManageTechnicalConfig,
    },
  };
}

export const buildAccountDomainModel = createAccountDomainModel;

export function deriveAccountIdentity(input: AccountIdentityInput = {}): AccountIdentityState {
  const viewer = input.viewer ?? null;
  const account = input.account ?? null;
  const accountUser = account?.user ?? null;
  const viewerUser = viewer?.user ?? null;

  // Identity deliberately ignores managed Key fields. Those are provider plumbing, not product account state.
  const isSignedIn = Boolean(accountUser?.authenticated ?? viewer?.authenticated);
  const role = accountUser?.role ?? viewerUser?.role ?? null;
  const username = accountUser?.username ?? viewerUser?.username ?? null;
  const email = accountUser?.email ?? viewerUser?.email ?? null;
  const fallbackName = isSignedIn ? 'AetherGenix account' : 'Guest';

  return {
    status: isSignedIn ? 'signed_in' : 'guest',
    isSignedIn,
    ownerId: account?.viewer.owner_id ?? viewer?.owner_id ?? null,
    guestId: account?.viewer.guest_id ?? viewer?.guest_id ?? null,
    userId: isSignedIn ? viewerUser?.id ?? null : null,
    displayName: username || accountUser?.name || email || fallbackName,
    email,
    username,
    role,
  };
}

export function deriveAccountBalance(input: AccountBalanceInput): AccountBalanceState {
  const rawBalance = input.balance ?? input.account?.balance ?? null;
  const balanceMessage = rawBalance?.message ?? null;

  if (!input.identity.isSignedIn) {
    return unavailableBalance('guest', balanceMessage);
  }

  if (input.balanceLoading) {
    return {
      status: 'loading',
      remaining: null,
      formatted: EMPTY_BALANCE_TEXT,
    };
  }

  if (isBalanceAvailable(rawBalance)) {
    return {
      status: 'available',
      remaining: rawBalance.remaining,
      formatted: formatAccountBalance(rawBalance.remaining),
      canGenerate: rawBalance.remaining > 0,
    };
  }

  return unavailableBalance(input.balanceError ? 'sync_failed' : 'not_synced', balanceMessage);
}

export function deriveAccountRecharge(input: AccountRechargeInput): AccountRechargeState {
  if (!input.identity.isSignedIn) {
    return unavailableRecharge('guest');
  }

  if (input.rechargeLoading) {
    return {
      status: 'loading',
      mode: 'external_handoff',
      externalUrl: '',
    };
  }

  const externalUrl = resolveExternalRechargeUrl(input.siteSettings);
  if (!externalUrl) {
    return unavailableRecharge('missing_external_url');
  }

  return {
    status: 'available',
    mode: 'external_handoff',
    externalUrl,
  };
}

export function deriveTechnicalConfigPermission(input: TechnicalConfigInput): TechnicalConfigPermission {
  const explicitCapability = input.adminCapability ?? input.siteSettings?.viewer.is_admin;
  const canManageTechnicalConfig = explicitCapability ?? isAdminRole(input.identity.role);

  if (canManageTechnicalConfig) {
    return {
      status: 'allowed',
      canManageTechnicalConfig: true,
      reason: 'admin',
    };
  }

  return {
    status: 'hidden',
    canManageTechnicalConfig: false,
    reason: input.identity.isSignedIn ? 'ordinary_viewer' : 'guest',
  };
}

export function formatAccountBalance(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY_BALANCE_TEXT;
  }
  return value.toFixed(4);
}

export function hasAvailableBalance(balance: AccountBalanceState): balance is AvailableAccountBalanceState {
  return balance.status === 'available';
}

export function hasExternalRecharge(recharge: AccountRechargeState): recharge is AvailableAccountRechargeState {
  return recharge.status === 'available';
}

export function canManageTechnicalConfig(permission: TechnicalConfigPermission): boolean {
  return permission.canManageTechnicalConfig;
}

function unavailableBalance(reason: AccountBalanceUnavailableReason, message: string | null): UnavailableAccountBalanceState {
  return {
    status: 'unavailable',
    remaining: null,
    formatted: EMPTY_BALANCE_TEXT,
    reason,
    message,
  };
}

function unavailableRecharge(reason: AccountRechargeUnavailableReason): UnavailableAccountRechargeState {
  return {
    status: 'unavailable',
    mode: 'external_handoff',
    externalUrl: '',
    reason,
  };
}

function isBalanceAvailable(balance: BalanceInfo | null): balance is BalanceInfo & { remaining: number } {
  return Boolean(balance?.ok && typeof balance.remaining === 'number' && Number.isFinite(balance.remaining));
}

function isAdminRole(role: string | null): boolean {
  return role ? ADMIN_ROLES.has(role.toLowerCase()) : false;
}
