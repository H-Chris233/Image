import { FormEvent, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Activity, BellRing, CreditCard, EyeOff, Globe2, Loader2, Megaphone, PlugZap, Save, Server, ShieldAlert, UserCircle } from 'lucide-react';
import {
  AccountInfo,
  AppConfig,
  InspirationStats,
  LedgerEntry as UsageLogEntry,
  formatBalance,
  formatDate,
  getAccount,
  getConfig,
  getInspirationStats,
  getLedger as getUsageLog,
  saveConfig,
  syncInspirations,
  testConfig,
  updateSiteSettings,
} from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import AccountCenterHeader from '../components/AccountCenterHeader';
import AvatarBadge from '../components/AvatarBadge';
import { Field } from '../components/design-system';
import { useNotifier } from '../notifications';
import { useSite } from '../site';

type LocaleValue = 'zh-CN' | 'en-US';

function normalizeLocale(locale: string | undefined): LocaleValue {
  return locale === 'en-US' ? 'en-US' : 'zh-CN';
}

export default function Config() {
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { setLocale, siteSettings, refreshSiteSettings, t, openAnnouncement } = useSite();
  const { notifyError, notifySuccess } = useNotifier();
  const isAdmin = Boolean(siteSettings?.viewer.is_admin);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [usageLog, setUsageLog] = useState<UsageLogEntry[]>([]);
  const [inspirationStats, setInspirationStats] = useState<InspirationStats | null>(null);
  const [siteDraft, setSiteDraft] = useState<{
    default_locale: LocaleValue;
    announcement_enabled: boolean;
    announcement_title: string;
    announcement_body: string;
    inspiration_sources: string;
    provider_base_url: string;
    auth_base_url: string;
    recharge_url: string;
    trial_balance_usd: string;
    sub2api_admin_token: string;
    sub2api_admin_jwt: string;
  }>({
    default_locale: 'zh-CN',
    announcement_enabled: false,
    announcement_title: '',
    announcement_body: '',
    inspiration_sources: '',
    provider_base_url: '',
    auth_base_url: '',
    recharge_url: '',
    trial_balance_usd: '',
    sub2api_admin_token: '',
    sub2api_admin_jwt: '',
  });
  const [saving, setSaving] = useState(false);
  const [siteSaving, setSiteSaving] = useState(false);
  const refreshIdRef = useRef(0);
  const isSignedIn = Boolean(viewer?.authenticated || account?.user.authenticated);
  const isManagedSession = isAdmin ? Boolean(config?.managed_by_auth) : isSignedIn;
  const displayName =
    account?.user.username ||
    account?.user.name ||
    viewer?.user?.username ||
    viewer?.user?.email ||
    (isSignedIn ? t('config_default_user_name') : t('config_mode_guest'));
  const displayEmail = account?.user.email || viewer?.user?.email;

  async function refresh() {
    const refreshId = refreshIdRef.current + 1;
    refreshIdRef.current = refreshId;
    const [configData, accountData, usageLogData, inspirationData] = await Promise.all([
      isAdmin ? getConfig() : Promise.resolve(null),
      getAccount(),
      isAdmin ? getUsageLog(8) : Promise.resolve({ items: [] }),
      isAdmin ? getInspirationStats() : Promise.resolve(null),
    ]);
    if (refreshId !== refreshIdRef.current) {
      return;
    }
    setConfig(configData);
    if (!configData) {
      setApiKey('');
    }
    setAccount(accountData);
    setUsageLog(usageLogData.items);
    setInspirationStats(inspirationData);
  }

  useEffect(() => {
    refresh().catch(notifyError);
  }, [viewer?.owner_id, isAdmin, notifyError]);

  useEffect(() => {
    if (!siteSettings) {
      return;
    }
    setSiteDraft({
      default_locale: normalizeLocale(siteSettings.default_locale),
      announcement_enabled: siteSettings.announcement.enabled,
      announcement_title: siteSettings.announcement.title,
      announcement_body: siteSettings.announcement.body,
      inspiration_sources: (siteSettings.inspiration_sources || []).join('\n'),
      provider_base_url: siteSettings.upstream?.provider_base_url || '',
      auth_base_url: siteSettings.upstream?.auth_base_url || '',
      recharge_url: siteSettings.upstream?.recharge_url || '',
      trial_balance_usd: String(siteSettings.upstream?.trial_balance_usd ?? 2),
      sub2api_admin_token: '',
      sub2api_admin_jwt: '',
    });
  }, [
    siteSettings?.default_locale,
    siteSettings?.announcement.enabled,
    siteSettings?.announcement.title,
    siteSettings?.announcement.body,
    siteSettings?.inspiration_sources,
    siteSettings?.upstream?.provider_base_url,
    siteSettings?.upstream?.auth_base_url,
    siteSettings?.upstream?.recharge_url,
    siteSettings?.upstream?.trial_balance_usd,
  ]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!config || !isAdmin) return;
    setSaving(true);
    try {
      const payload = {
        model: config.model,
        default_size: config.default_size,
        default_quality: config.default_quality,
        user_name: config.managed_by_auth ? undefined : config.user_name,
        api_key: config.api_key_editable ? apiKey.trim() || undefined : undefined,
      };
      const updated = await saveConfig(payload);
      setConfig(updated);
      setApiKey('');
      await refresh();
      notifySuccess(t('config_status_saved'));
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const result = await testConfig();
      notifySuccess(t('config_status_connected', { value: result.models.slice(0, 3).join(', ') || 'MODELS OK' }));
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncInspirations() {
    setSaving(true);
    try {
      const result = await syncInspirations();
      await refresh();
      notifySuccess(t('config_status_synced', { value: result.parsed }));
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetKey() {
    if (!config?.managed_by_auth) return;
    setSaving(true);
    try {
      const updated = await saveConfig({ clear_api_key: true });
      setConfig(updated);
      setApiKey('');
      await refresh();
      notifySuccess(t('config_status_restored'));
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSiteSettings() {
    if (!isAdmin) return;
    setSiteSaving(true);
    try {
      const updated = await updateSiteSettings({
        default_locale: siteDraft.default_locale,
        announcement_enabled: siteDraft.announcement_enabled,
        announcement_title: siteDraft.announcement_title.trim(),
        announcement_body: siteDraft.announcement_body.trim(),
        provider_base_url: siteDraft.provider_base_url.trim(),
        auth_base_url: siteDraft.auth_base_url.trim(),
        recharge_url: siteDraft.recharge_url.trim(),
        trial_balance_usd: Number(siteDraft.trial_balance_usd || 0),
        sub2api_admin_token: siteDraft.sub2api_admin_token.trim() || undefined,
        sub2api_admin_jwt: siteDraft.sub2api_admin_jwt.trim() || undefined,
        inspiration_sources: siteDraft.inspiration_sources
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setLocale(normalizeLocale(updated.default_locale));
      await refreshSiteSettings();
      notifySuccess(t('config_status_site_saved'));
    } catch (err) {
      notifyError(err);
    } finally {
      setSiteSaving(false);
    }
  }

  function handleLocaleChange(nextLocale: LocaleValue) {
    setLocale(nextLocale);
    setSiteDraft((current) => ({ ...current, default_locale: nextLocale }));
  }

  if (!siteSettings) {
    return null;
  }

  if (!isAdmin) {
    return <Navigate to="/account" replace />;
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      <AccountCenterHeader current="settings" />

      <section className="mb-6 flex flex-col items-start gap-4 border border-white/10 bg-black/20 p-4 md:flex-row md:items-center">
        <div className="w-24 h-24 border border-outline-variant relative bg-surface-container rounded-xl p-1">
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-secondary"></div>
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-secondary"></div>
          <AvatarBadge
            className="w-full h-full"
            textClassName="text-2xl"
            name={displayName}
            email={displayEmail}
            guestId={viewer?.guest_id}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-secondary uppercase font-bold tracking-widest flex items-center gap-2">
            <span className="w-4 h-[1px] bg-secondary"></span> {t('config_profile')}
          </div>
          <h1 className="text-3xl md:text-5xl text-on-surface font-bold">{displayName}</h1>
          <div className="flex items-center gap-4 text-xs mt-2 border border-white/10 bg-white/5 py-1 px-3 w-fit">
            <span className="text-white/50 uppercase">
              {t('config_mode')}:{' '}
              <span className={isManagedSession ? 'text-tertiary' : 'text-primary'}>
                {isManagedSession ? t('config_mode_user') : t('config_mode_guest')}
              </span>
            </span>
            <span className="text-white/20">|</span>
            <span className="text-primary uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> {t('config_balance', { value: formatBalance(account?.balance) })}
            </span>
          </div>
        </div>
      </section>

      {!isSignedIn && (
        <div className="mb-6 border border-primary/20 bg-primary/5 p-4 text-xs text-white/60 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>{t('config_guest_tip_plain')}</div>
          <div className="flex gap-3">
            <button className="btn-ghost" type="button" onClick={() => openAuthModal('login')}>
              {t('config_sign_in')}
            </button>
            <button className="btn-primary" type="button" onClick={() => openAuthModal('register')}>
              {t('config_register')}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className={`col-span-12 ${isAdmin ? 'lg:col-span-8' : 'lg:col-span-7'} bg-black border border-primary/20 p-6 md:p-8 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-3 text-[9px] text-primary/40 uppercase border-b border-l border-primary/20 bg-primary/5">AETHER_PROFILE</div>

          <h2 className="text-xl text-primary mb-8 uppercase flex items-center gap-3 font-bold border-b border-primary/20 pb-4">
            {isAdmin ? <Server className="text-primary" size={20} /> : <UserCircle className="text-primary" size={20} />}
            {isAdmin ? t('config_title') : t('config_account_settings')}
          </h2>

          <div className="bg-primary/5 border border-primary/20 border-l-2 border-l-tertiary p-5 mb-8 flex gap-4 relative">
            <ShieldAlert className="text-tertiary mt-1 shrink-0" size={20} />
            <div>
              <h3 className="text-white mb-1 font-bold tracking-widest text-[10px] uppercase">
                {isManagedSession ? t('config_session_user') : t('config_session_guest')}
              </h3>
              <p className="text-white/50 text-xs leading-relaxed">
                {isAdmin
                  ? config?.managed_by_auth ? t('config_user_desc') : t('config_guest_desc')
                  : isSignedIn
                    ? t('config_user_desc_plain')
                    : t('config_guest_desc_plain')}
              </p>
            </div>
          </div>

          {isAdmin ? (
            <div className="bg-secondary/5 border border-secondary/20 p-4 mb-8 text-xs text-white/50 flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-secondary uppercase tracking-widest text-[10px] mb-1">{t('config_cases')}</div>
                  <div>{t('config_cases_summary', { total: inspirationStats?.total ?? 0, time: formatDate(inspirationStats?.last_synced_at) })}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-white/30">
                    {t('config_cases_sources', { value: inspirationStats?.source_urls?.length || 0 })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="border border-primary/40 text-primary px-4 py-2 uppercase tracking-widest hover:bg-primary/10 transition-colors disabled:opacity-50"
                    type="button"
                    onClick={handleSaveSiteSettings}
                    disabled={siteSaving}
                  >
                    {siteSaving ? <Loader2 className="inline animate-spin mr-2" size={13} /> : null}
                    {t('config_save_case_sources')}
                  </button>
                  <button
                    className="border border-secondary/40 text-secondary px-4 py-2 uppercase tracking-widest hover:bg-secondary/10 transition-colors disabled:opacity-50"
                    type="button"
                    onClick={handleSyncInspirations}
                    disabled={saving}
                  >
                    {t('config_sync_cases')}
                  </button>
                </div>
              </div>

              <div className="border-t border-secondary/10 pt-4">
                <Field label={t('site_inspiration_sources_body')} variant="accent">
                  {({ id }) => (
                    <textarea
                      id={id}
                      className="min-h-28 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50 resize-y"
                      value={siteDraft.inspiration_sources}
                      onChange={(event) => setSiteDraft((current) => ({ ...current, inspiration_sources: event.target.value }))}
                    />
                  )}
                </Field>
                {inspirationStats?.source_counts?.length ? (
                  <div className="mt-4 grid grid-cols-1 gap-2 text-[10px] text-white/45 md:grid-cols-2">
                    {inspirationStats.source_counts.map((source) => (
                      <div key={source.source_url} className="flex items-center justify-between gap-3 border border-white/5 bg-black/20 px-3 py-2">
                        <span className="min-w-0 truncate">{source.source_url}</span>
                        <span className="shrink-0 text-primary">{source.count}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {isAdmin ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {isAdmin ? (
              <>
                <Field label={t('config_user_name')} variant="accent">
                  {({ id }) => (
                    <input
                      id={id}
                      className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
                      disabled={config?.managed_by_auth}
                      value={config?.user_name || ''}
                      onChange={(event) => setConfig((current) => current && { ...current, user_name: event.target.value })}
                    />
                  )}
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label={t('config_model')} variant="accent">
                    {({ id }) => (
                      <input id={id} className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50" value={config?.model || 'gpt-image-2'} onChange={(event) => setConfig((current) => current && { ...current, model: event.target.value })} />
                    )}
                  </Field>
                  <Field label={t('config_size')} variant="accent">
                    {({ id }) => (
                      <>
                        <input
                          id={id}
                          className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
                          list="image-size-options"
                          value={config?.default_size || '2K'}
                          onChange={(event) => setConfig((current) => current && { ...current, default_size: event.target.value })}
                        />
                        <datalist id="image-size-options">
                          <option value="1K" label="1K (1080p)" />
                          <option value="2K" label="2K (1440p)" />
                          <option value="4K" label="4K (2160p)" />
                        </datalist>
                      </>
                    )}
                  </Field>
                  <Field label={t('config_quality')} variant="accent">
                    {({ id }) => (
                      <select id={id} className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50" value={config?.default_quality || 'auto'} onChange={(event) => setConfig((current) => current && { ...current, default_quality: event.target.value })}>
                        <option>low</option>
                        <option>medium</option>
                        <option>high</option>
                        <option>auto</option>
                      </select>
                    )}
                  </Field>
                </div>
              </>
            ) : null}

            <div className="flex flex-col gap-2 relative">
              <label className="text-secondary text-[10px] uppercase tracking-widest font-bold mb-1" htmlFor="api_key">{t('config_api_key')}</label>
              <div className="relative">
                <input
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50 pr-12"
                  id="api_key"
                  placeholder={config?.api_key_set ? config.api_key_hint : 'sk-...'}
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-secondary transition-colors" type="button">
                  <EyeOff size={16} />
                </button>
              </div>
              <span className="text-[9px] text-white/30 text-right uppercase">
                {t('config_saved_key', { value: config?.api_key_set ? config.api_key_hint : 'NONE' })}{' '}
                {config?.api_key_source === 'managed'
                  ? `(${t('config_key_managed')})`
                  : config?.api_key_source === 'manual_override'
                    ? `(${t('config_key_override')})`
                    : `(${t('config_key_manual')})`}
              </span>
              {config?.managed_by_auth && config?.api_key_source === 'manual_override' && (
                <button
                  className="self-end text-[10px] uppercase tracking-widest text-secondary hover:text-white transition-colors"
                  type="button"
                  onClick={handleResetKey}
                >
                  {t('config_restore_key')}
                </button>
              )}
            </div>

            <div className="pt-6 flex flex-col sm:flex-row gap-3 justify-end border-t border-white/10 mt-4">
              <button
                className="border border-primary/30 text-primary font-bold px-8 py-3 uppercase tracking-widest hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 text-xs"
                type="button"
                onClick={handleTest}
                disabled={saving}
              >
                <PlugZap size={14} />
                {t('config_test')}
              </button>
              <button
                className="btn-primary px-8 disabled:opacity-50"
                type="submit"
                disabled={saving}
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                {t('config_save')}
              </button>
            </div>
          </form>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
                  <UserCircle size={15} />
                  {t('config_account_profile')}
                </div>
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/35">{t('config_display_name')}</div>
                    <div className="mt-1 text-base font-semibold text-on-surface">{displayName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/35">{t('config_email')}</div>
                    <div className="mt-1 text-white/70">{displayEmail || t('config_email_after_login')}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/35">{t('config_account_status')}</div>
                    <div className="mt-1 text-white/70">{isSignedIn ? t('config_status_signed_in') : t('config_status_guest')}</div>
                  </div>
                </div>
              </div>

              <div className="border border-primary/20 bg-primary/5 p-5">
                <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <CreditCard size={15} />
                  {t('config_balance_status')}
                </div>
                <div className="text-3xl font-bold text-on-surface">{formatBalance(account?.balance)}</div>
                <div className="mt-2 text-xs leading-6 text-white/50">{t('config_balance_status_desc')}</div>
              </div>

              <div className="border border-white/10 bg-white/[0.03] p-5 md:col-span-2">
                <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
                  <Activity size={15} />
                  {t('config_usage_summary')}
                </div>
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                  <div className="border border-white/5 bg-black/20 p-3">
                    <div className="text-white/35">{t('config_usage_total')}</div>
                    <div className="mt-1 text-lg font-bold text-on-surface">{account?.stats.total ?? 0}</div>
                  </div>
                  <div className="border border-white/5 bg-black/20 p-3">
                    <div className="text-white/35">{t('config_usage_succeeded')}</div>
                    <div className="mt-1 text-lg font-bold text-on-surface">{account?.stats.succeeded ?? 0}</div>
                  </div>
                  <div className="border border-white/5 bg-black/20 p-3">
                    <div className="text-white/35">{t('config_usage_last')}</div>
                    <div className="mt-1 text-sm font-bold text-on-surface">{formatDate(account?.stats.last_generation_at)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`col-span-12 ${isAdmin ? 'lg:col-span-4' : 'lg:col-span-5'} flex flex-col gap-6`}>
          <div className="bg-black border border-white/10 p-6 relative">
            <h3 className="text-primary mb-6 uppercase flex items-center gap-2 font-bold tracking-wider text-[10px] border-b border-primary/20 pb-4">
              <Globe2 size={16} />
              {t('config_site_title')}
            </h3>

            <p className="mb-5 text-xs leading-6 text-white/50">
              {isAdmin ? t('config_site_desc') : t('config_site_desc_user')}
            </p>

            <div className="space-y-5">
              <Field label={t('lang_label')} variant="accent">
                {({ id }) => (
                  <select
                    id={id}
                    className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
                    value={siteDraft.default_locale}
                    onChange={(event) => handleLocaleChange(event.target.value as LocaleValue)}
                  >
                    <option value="zh-CN">{t('lang_zh')}</option>
                    <option value="en-US">{t('lang_en')}</option>
                  </select>
                )}
              </Field>

              {!isAdmin ? (
                <div className="border border-secondary/20 bg-secondary/5 p-4">
                  <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-secondary">
                    <Megaphone size={15} />
                    {t('config_announcement_pref')}
                  </div>
                  <div className="text-sm font-semibold text-on-surface">
                    {siteSettings?.announcement.enabled ? siteSettings.announcement.title || t('top_announcement') : t('config_announcement_disabled')}
                  </div>
                  <p className="mt-2 text-xs leading-6 text-white/50">
                    {siteSettings?.announcement.enabled
                      ? siteSettings.announcement.body || t('config_announcement_empty_enabled')
                      : t('config_announcement_placeholder')}
                  </p>
                  {siteSettings?.announcement.enabled ? (
                    <button
                      className="mt-4 border border-secondary/40 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-secondary transition-colors hover:bg-secondary/10"
                      type="button"
                      onClick={openAnnouncement}
                    >
                      {t('config_view_announcement')}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {isAdmin ? (
                <div className="border border-primary/20 bg-primary/5 p-4">
                  <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary">
                    <PlugZap size={15} />
                    {t('site_upstream')}
                  </div>
                  <p className="mb-4 text-xs leading-6 text-white/45">{t('site_upstream_hint')}</p>

                  <div className="space-y-4">
                    <Field label={t('site_provider_base_url')} variant="accent">
                      {({ id }) => (
                        <>
                          <input
                            id={id}
                            className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
                            placeholder={siteSettings.upstream?.effective_provider_base_url || 'https://example.com/v1'}
                            value={siteDraft.provider_base_url}
                            onChange={(event) => setSiteDraft((current) => ({ ...current, provider_base_url: event.target.value }))}
                          />
                          <div className="mt-1 text-[9px] uppercase tracking-widest text-white/30">
                            {t('site_upstream_effective', { value: siteSettings.upstream?.effective_provider_base_url || '-' })}
                          </div>
                        </>
                      )}
                    </Field>

                    <Field label={t('site_auth_base_url')} variant="accent">
                      {({ id }) => (
                        <>
                          <input
                            id={id}
                            className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
                            placeholder={siteSettings.upstream?.effective_auth_base_url || 'https://example.com'}
                            value={siteDraft.auth_base_url}
                            onChange={(event) => setSiteDraft((current) => ({ ...current, auth_base_url: event.target.value }))}
                          />
                          <div className="mt-1 text-[9px] uppercase tracking-widest text-white/30">
                            {t('site_upstream_effective', { value: siteSettings.upstream?.effective_auth_base_url || '-' })}
                          </div>
                        </>
                      )}
                    </Field>

                    <Field label={t('site_recharge_url')} variant="accent">
                      {({ id }) => (
                        <>
                          <input
                            id={id}
                            className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
                            placeholder={siteSettings.upstream?.effective_recharge_url || siteSettings.upstream?.effective_auth_base_url || 'https://sub2api.example.com'}
                            value={siteDraft.recharge_url}
                            onChange={(event) => setSiteDraft((current) => ({ ...current, recharge_url: event.target.value }))}
                          />
                          <div className="mt-1 text-[9px] uppercase tracking-widest text-white/30">
                            {t('site_upstream_effective', { value: siteSettings.upstream?.effective_recharge_url || '-' })}
                          </div>
                        </>
                      )}
                    </Field>

                    <Field label={t('site_admin_token')} variant="accent">
                      {({ id }) => (
                        <>
                          <input
                            id={id}
                            className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
                            placeholder={siteSettings.upstream?.sub2api_admin_token_hint || 'admin-...'}
                            type="password"
                            value={siteDraft.sub2api_admin_token}
                            onChange={(event) => setSiteDraft((current) => ({ ...current, sub2api_admin_token: event.target.value }))}
                          />
                          <div className="mt-1 text-[9px] uppercase tracking-widest text-white/30">
                            {t('site_admin_token_saved', { value: siteSettings.upstream?.sub2api_admin_token_set ? siteSettings.upstream.sub2api_admin_token_hint || 'SET' : 'NONE' })}
                          </div>
                        </>
                      )}
                    </Field>

                    <Field label={t('site_admin_jwt')} variant="accent">
                      {({ id }) => (
                        <>
                          <input
                            id={id}
                            className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
                            placeholder={siteSettings.upstream?.sub2api_admin_jwt_hint || 'eyJ...'}
                            type="password"
                            value={siteDraft.sub2api_admin_jwt}
                            onChange={(event) => setSiteDraft((current) => ({ ...current, sub2api_admin_jwt: event.target.value }))}
                          />
                          <div className="mt-1 text-[9px] uppercase tracking-widest text-white/30">
                            {t('site_admin_token_saved', { value: siteSettings.upstream?.sub2api_admin_jwt_set ? siteSettings.upstream.sub2api_admin_jwt_hint || 'SET' : 'NONE' })}
                          </div>
                        </>
                      )}
                    </Field>

                    <Field label={t('site_trial_balance_usd')} variant="accent">
                      {({ id }) => (
                        <>
                          <input
                            id={id}
                            className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
                            min="0"
                            step="0.01"
                            type="number"
                            value={siteDraft.trial_balance_usd}
                            onChange={(event) => setSiteDraft((current) => ({ ...current, trial_balance_usd: event.target.value }))}
                          />
                          <div className="mt-1 text-[9px] uppercase tracking-widest text-white/30">
                            {t('site_trial_balance_effective', { value: siteSettings.upstream?.trial_balance_usd ?? 0 })}
                          </div>
                        </>
                      )}
                    </Field>

                    <p className="text-[10px] leading-5 text-white/35">{t('site_admin_token_hint')}</p>
                  </div>
                </div>
              ) : null}

              {isAdmin ? (
                <div className="border border-secondary/20 bg-secondary/5 p-4">
                  <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-secondary">
                    <BellRing size={15} />
                    {t('site_announcement')}
                  </div>

                  <label className="mb-4 flex items-center gap-3 text-xs text-white/70">
                    <input
                      className="h-4 w-4 accent-secondary"
                      type="checkbox"
                      checked={siteDraft.announcement_enabled}
                      onChange={(event) => setSiteDraft((current) => ({ ...current, announcement_enabled: event.target.checked }))}
                    />
                    {t('site_announcement_enabled')}
                  </label>

                  <div className="space-y-4">
                    <Field label={t('site_announcement_title')} variant="accent">
                      {({ id }) => (
                        <input
                          id={id}
                          className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
                          value={siteDraft.announcement_title}
                          onChange={(event) => setSiteDraft((current) => ({ ...current, announcement_title: event.target.value }))}
                        />
                      )}
                    </Field>

                    <Field label={t('site_announcement_body')} variant="accent">
                      {({ id }) => (
                        <textarea
                          id={id}
                          className="min-h-32 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50 resize-y"
                          value={siteDraft.announcement_body}
                          onChange={(event) => setSiteDraft((current) => ({ ...current, announcement_body: event.target.value }))}
                        />
                      )}
                    </Field>
                  </div>
                </div>
              ) : null}

              {isAdmin ? (
                <button
                  className="w-full bg-secondary text-white font-bold px-6 py-3 uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                  type="button"
                  onClick={handleSaveSiteSettings}
                  disabled={siteSaving}
                >
                  {siteSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  {t('site_settings_save')}
                </button>
              ) : null}
            </div>
          </div>

          {isAdmin ? (
            <div className="bg-black border border-white/10 p-6 relative flex-1">
              <h3 className="text-primary mb-6 uppercase flex items-center gap-2 font-bold tracking-wider text-[10px] border-b border-primary/20 pb-4">
                <Activity size={16} />
                {t('config_usage_log')}
              </h3>

              <div className="flex flex-col gap-0 text-xs">
                {usageLog.length === 0 && <div className="py-6 text-white/40 uppercase">{t('config_usage_log_empty')}</div>}
                {usageLog.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-3 border-b border-white/5">
                    <div className="flex flex-col">
                      <span className="flex flex-wrap items-center gap-2 text-white">
                        <span>{item.description}</span>
                        {isActualUsageLogEntry(item) && <span className="text-[8px] uppercase tracking-widest text-secondary">{t('config_usage_actual')}</span>}
                        {isEstimatedUsageLogEntry(item) && <span className="text-[8px] uppercase tracking-widest text-tertiary">{t('config_usage_estimated')}</span>}
                      </span>
                      <span className="text-[9px] text-white/40 mt-1 uppercase">{formatDate(item.created_at)}</span>
                    </div>
                    <span className="text-secondary">{item.amount.toFixed(4)} {item.currency}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function isEstimatedUsageLogEntry(item: UsageLogEntry) {
  const source = String(item.metadata?.cost_source || '');
  return source.startsWith('local_image_price');
}

function isActualUsageLogEntry(item: UsageLogEntry) {
  return item.metadata?.cost_source === 'sub2api_actual_cost';
}
