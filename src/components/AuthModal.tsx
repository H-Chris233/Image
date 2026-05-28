import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole, MailPlus, Send, ShieldCheck, X } from 'lucide-react';
import {
  PublicAuthSettings,
  getAuthPublicSettings,
  loginAccount,
  loginAccount2FA,
  registerAccount,
  sendVerifyCode,
} from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import { useNotifier } from '../notifications';
import { useSite } from '../site';
import { Field } from './design-system';

const PROMPT_TRANSFER_KEY = 'aethergenix_pending_prompt';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function AuthModal() {
  const { open, tab, pendingPath, actionContext, closeAuthModal, openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const { t } = useSite();
  const [settings, setSettings] = useState<PublicAuthSettings | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const modalTitleId = 'auth-modal-title';
  const modalDescriptionId = 'auth-modal-description';
  const modalTitle = tab === 'login' ? t('login_title') : t('register_title');
  const modalDescription = getAuthModalDescription(actionContext, tab, t);

  useEffect(() => {
    if (open) getAuthPublicSettings().then(setSettings).catch(() => setSettings(null));
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusTarget =
        dialog.querySelector<HTMLElement>('[data-auth-autofocus]') ??
        getFocusableElements(dialog)[0] ??
        dialog;
      focusTarget.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      const previous = previouslyFocusedElementRef.current;
      if (previous && document.contains(previous)) previous.focus();
      previouslyFocusedElementRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAuthModal();
        return;
      }

      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElements = getFocusableElements(dialog);
      if (!focusableElements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!(activeElement instanceof HTMLElement) || !dialog.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeAuthModal, open]);

  function handleSuccess() {
    closeAuthModal();
    if (pendingPath) {
      navigate(pendingPath, { replace: true });
    } else {
      navigate('/create', { replace: true });
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={closeAuthModal} />

      {/* 弹窗背景光晕 */}
      <div
        ref={dialogRef}
        aria-describedby={modalDescriptionId}
        aria-labelledby={modalTitleId}
        aria-modal="true"
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col rounded-2xl border border-white/[0.08] bg-[#1a1917] shadow-[0_24px_64px_rgba(0,0,0,0.7)] animate-fade-in overflow-hidden"
        role="dialog"
        tabIndex={-1}
      >
        {/* 顶部电石灰光带 */}
        <div className="absolute inset-x-0 top-0 h-px bg-[#E3FF74] opacity-60" />

        <button
          className="absolute right-3 top-3 z-10 flex h-[44px] w-[44px] items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-[rgba(255,255,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
          type="button"
          aria-label={t('modal_close')}
          onClick={closeAuthModal}
          title={t('modal_close')}
        >
          <X aria-hidden="true" size={15} />
        </button>

        {/* Logo + 标题 */}
        <div className="shrink-0 px-6 pt-8 pb-5 text-center">
          <p className="font-display text-sm font-semibold tracking-tight text-[#f0ede8]">AetherGenix</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#f0ede8]" id={modalTitleId}>{modalTitle}</h2>
          <p id={modalDescriptionId} className="mx-auto mt-2 max-w-sm text-sm leading-6 text-on-surface-variant">
            {modalDescription}
          </p>
        </div>

        <div className="mx-6 flex shrink-0 border-b border-[rgba(255,255,255,0.08)]">
          {(['login', 'register'] as const).map((t_) => (
            <button
              key={t_}
              type="button"
              onClick={() => openAuthModal(t_, pendingPath, actionContext)}
              aria-pressed={tab === t_}
              className={`min-h-11 flex-1 py-3 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35 ${
                tab === t_
                  ? 'text-[#E3FF74] border-b-2 border-[#E3FF74]'
                  : 'text-[#8a8680] hover:text-[#f0ede8]'
              }`}
            >
              {t_ === 'login' ? t('login_submit') : t('top_register')}
            </button>
          ))}
        </div>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          {tab === 'login' ? (
            <LoginForm settings={settings} onSuccess={handleSuccess} />
          ) : (
            <RegisterForm settings={settings} onSuccess={handleSuccess} />
          )}
        </div>
      </div>
    </div>
  );
}

function getAuthModalDescription(
  actionContext: ReturnType<typeof useAuthModal>['actionContext'],
  tab: ReturnType<typeof useAuthModal>['tab'],
  t: ReturnType<typeof useSite>['t'],
) {
  if (actionContext === 'history') return t('history_login_desc');
  if (actionContext === 'generate' || actionContext === 'reuse-prompt') return t('home_generation_login_required');
  return tab === 'login' ? t('login_desc') : t('register_desc');
}

function LoginForm({ settings: _settings, onSuccess }: { settings: PublicAuthSettings | null; onSuccess: () => void }) {
  const { setViewer } = useAuth();
  const { t } = useSite();
  const { notifyError } = useNotifier();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (tempToken) {
        const result = await loginAccount2FA({ temp_token: tempToken, totp_code: totpCode.trim() });
        if (result.viewer) { setViewer(result.viewer); onSuccess(); }
        return;
      }
      const result = await loginAccount({ email: email.trim(), password });
      if (result.requires_2fa && result.temp_token) {
        setTempToken(result.temp_token);
        setMaskedEmail(result.user_email_masked || email.trim());
        return;
      }
      // 兜底：上游声称需要 2FA 但没回 temp_token —— 之前两个分支都不命中，
      // loading 关掉、UI 无任何变化，用户像点了死按钮（#95）。
      if (result.requires_2fa && !result.temp_token) {
        throw new Error('2FA 验证服务异常：未返回临时令牌，请重试或联系站主');
      }
      if (result.viewer) { setViewer(result.viewer); onSuccess(); }
    } catch (err) {
      notifyError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {tempToken ? (
        <>
          <p className="text-sm text-on-surface-variant">{t('login_desc_2fa', { value: maskedEmail })}</p>
          <Field id="auth-login-totp" label={t('login_totp')}>
            {({ id }) => (
              <input
                id={id}
                className={inputCls}
                autoComplete="one-time-code"
                data-auth-autofocus
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            )}
          </Field>
        </>
      ) : (
        <>
          <Field id="auth-login-email" label={t('login_email')}>
            {({ id }) => (
              <input
                id={id}
                className={inputCls}
                autoComplete="email"
                data-auth-autofocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field id="auth-login-password" label={t('login_password')}>
            {({ id }) => (
              <input
                id={id}
                className={inputCls}
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
        </>
      )}
      <button className={submitCls} disabled={loading} type="submit">
        {loading ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : tempToken ? <ShieldCheck aria-hidden="true" size={16} /> : <LockKeyhole aria-hidden="true" size={16} />}
        {tempToken ? t('login_submit_2fa') : t('login_submit')}
      </button>
      {tempToken ? (
        // 2FA 卡死出口（#95）：temp_token 过期或输错时让用户能回到第一步重新输密码，否则只能关掉弹窗从头来。
        <button
          className="block w-full text-center text-sm text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:underline"
          disabled={loading}
          type="button"
          onClick={() => { setTempToken(''); setTotpCode(''); setMaskedEmail(''); }}
        >
          返回登录
        </button>
      ) : null}
    </form>
  );
}

function RegisterForm({ settings, onSuccess }: { settings: PublicAuthSettings | null; onSuccess: () => void }) {
  const { setViewer } = useAuth();
  const { t } = useSite();
  const { notifyError, notifySuccess } = useNotifier();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  useEffect(() => {
    if (!countdown) return;
    const timer = window.setTimeout(() => setCountdown((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const canRegister = useMemo(
    () => settings?.registration_enabled !== false && settings?.backend_mode_enabled !== true,
    [settings],
  );

  async function handleSendCode() {
    setSendingCode(true);
    try {
      const result = await sendVerifyCode({ email: email.trim() });
      notifySuccess(result.message);
      setCountdown(result.countdown || 60);
    } catch (err) { notifyError(err); }
    finally { setSendingCode(false); }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await registerAccount({
        email: email.trim(),
        password,
        verify_code: settings?.email_verify_enabled ? verifyCode.trim() : undefined,
        promo_code: settings?.promo_code_enabled ? promoCode.trim() || undefined : undefined,
        invitation_code: settings?.invitation_code_enabled ? invitationCode.trim() || undefined : undefined,
      });
      if (result.viewer) { setViewer(result.viewer); onSuccess(); }
    } catch (err) { notifyError(err); }
    finally { setLoading(false); }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {!canRegister && (
        <div className="rounded-lg border border-error/30 bg-error-container p-3 text-sm text-on-error-container">
          {t('register_disabled')}
        </div>
      )}
      <Field id="auth-register-email" label={t('register_email')}>
        {({ id }) => (
          <input
            id={id}
            className={inputCls}
            autoComplete="email"
            data-auth-autofocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>
      <Field id="auth-register-password" label={t('register_password')}>
        {({ id }) => (
          <input
            id={id}
            className={inputCls}
            autoComplete="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>
      {settings?.email_verify_enabled && (
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Field id="auth-register-verify-code" label={t('register_verify_code')}>
            {({ id }) => (
              <input
                id={id}
                className={inputCls}
                autoComplete="one-time-code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
              />
            )}
          </Field>
          <button
            className="flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-lg border border-outline-variant px-4 text-sm text-on-surface transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35 disabled:opacity-50"
            disabled={sendingCode || !email.trim() || countdown > 0}
            type="button"
            onClick={handleSendCode}
          >
            {sendingCode ? <Loader2 aria-hidden="true" className="animate-spin" size={13} /> : <Send aria-hidden="true" size={13} />}
            {countdown > 0 ? `${countdown}s` : t('register_send_code')}
          </button>
        </div>
      )}
      {settings?.promo_code_enabled && (
        <Field id="auth-register-promo" label={t('register_promo')}>
          {({ id }) => (
            <input
              id={id}
              className={inputCls}
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
            />
          )}
        </Field>
      )}
      {settings?.invitation_code_enabled && (
        <Field id="auth-register-invitation" label={t('register_invitation')}>
          {({ id }) => (
            <input
              id={id}
              className={inputCls}
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
            />
          )}
        </Field>
      )}
      <button className={submitCls} disabled={loading || !canRegister} type="submit">
        {loading ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <MailPlus aria-hidden="true" size={16} />}
        {t('register_submit')}
      </button>
    </form>
  );
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    const isVisible = element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0;
    return isVisible && !element.getAttribute('aria-hidden');
  });
}

const inputCls = 'min-h-[44px] w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-[#f0ede8] outline-none transition-all placeholder:text-[#4a4844] focus:border-[#E3FF74]/40 focus:bg-white/[0.06]';
const submitCls = 'mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#f0ede8] text-sm font-semibold text-[#1a1917] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35 disabled:opacity-50';
