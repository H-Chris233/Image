import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
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

const PROMPT_TRANSFER_KEY = 'aethergenix_pending_prompt';

export default function AuthModal() {
  const { open, tab, pendingPath, closeAuthModal, openAuthModal } = useAuthModal();
  const { setViewer } = useAuth();
  const navigate = useNavigate();
  const { t } = useSite();
  const { notifyError, notifySuccess } = useNotifier();
  const [settings, setSettings] = useState<PublicAuthSettings | null>(null);

  useEffect(() => {
    if (open) getAuthPublicSettings().then(setSettings).catch(() => setSettings(null));
  }, [open]);

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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={closeAuthModal} />

      {/* 弹窗背景光晕 */}
      <div className="absolute pointer-events-none w-[400px] h-[400px] rounded-full bg-[rgba(139,92,246,0.12)] blur-[80px]" />

      <div className="relative w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(13,20,40,0.92)] backdrop-blur-xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] animate-fade-in overflow-hidden">
        {/* 顶部渐变光带 */}
        <div className="absolute inset-x-0 top-0 h-px gradient-genesis" />

        <button
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl text-on-surface-variant hover:bg-[rgba(255,255,255,0.08)] transition-colors z-10"
          type="button"
          onClick={closeAuthModal}
        >
          <X size={15} />
        </button>

        {/* Logo + 标题 */}
        <div className="px-6 pt-8 pb-4 text-center">
          <p className="text-sm font-semibold text-gradient-genesis font-display tracking-tight">AetherGenix</p>
        </div>

        <div className="flex border-b border-[rgba(255,255,255,0.08)] mx-6">
          {(['login', 'register'] as const).map((t_) => (
            <button
              key={t_}
              type="button"
              onClick={() => openAuthModal(t_, pendingPath)}
              className={`flex-1 py-3 text-sm font-medium transition-all duration-200 ${
                tab === t_
                  ? 'text-[#00D4F0] border-b-2 border-[#00D4F0]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t_ === 'login' ? t('login_submit') : t('top_register')}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
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
          <Field label={t('login_totp')}>
            <input
              className={inputCls}
              inputMode="numeric"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </Field>
        </>
      ) : (
        <>
          <Field label={t('login_email')}>
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={t('login_password')}>
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </>
      )}
      <button className={submitCls} disabled={loading} type="submit">
        {loading ? <Loader2 className="animate-spin" size={16} /> : tempToken ? <ShieldCheck size={16} /> : <LockKeyhole size={16} />}
        {tempToken ? t('login_submit_2fa') : t('login_submit')}
      </button>
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
      <Field label={t('register_email')}>
        <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label={t('register_password')}>
        <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {settings?.email_verify_enabled && (
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <Field label={t('register_verify_code')}>
            <input className={inputCls} value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} />
          </Field>
          <button
            className="h-10 px-4 rounded-lg border border-outline-variant text-sm text-on-surface hover:bg-surface-container disabled:opacity-50 transition-colors flex items-center gap-1.5"
            disabled={sendingCode || !email.trim() || countdown > 0}
            type="button"
            onClick={handleSendCode}
          >
            {sendingCode ? <Loader2 className="animate-spin" size={13} /> : <Send size={13} />}
            {countdown > 0 ? `${countdown}s` : t('register_send_code')}
          </button>
        </div>
      )}
      {settings?.promo_code_enabled && (
        <Field label={t('register_promo')}>
          <input className={inputCls} value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
        </Field>
      )}
      {settings?.invitation_code_enabled && (
        <Field label={t('register_invitation')}>
          <input className={inputCls} value={invitationCode} onChange={(e) => setInvitationCode(e.target.value)} />
        </Field>
      )}
      <button className={submitCls} disabled={loading || !canRegister} type="submit">
        {loading ? <Loader2 className="animate-spin" size={16} /> : <MailPlus size={16} />}
        {t('register_submit')}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-on-surface-variant">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'h-10 w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-3 text-sm text-on-surface outline-none focus:border-[rgba(0,212,240,0.5)] focus:shadow-[0_0_0_3px_rgba(0,212,240,0.1)] transition-all placeholder:text-on-surface-variant/40';
const submitCls = 'w-full h-11 rounded-full gradient-genesis text-white font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-[0_0_16px_rgba(0,212,240,0.2)]';
