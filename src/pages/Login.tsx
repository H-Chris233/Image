import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { PublicAuthSettings, getAuthPublicSettings, loginAccount, loginAccount2FA } from '../api';
import { useAuth } from '../auth';
import { useNotifier } from '../notifications';
import { useSite } from '../site';

export default function Login() {
  const navigate = useNavigate();
  const { viewer, setViewer } = useAuth();
  const { t } = useSite();
  const { notifyError } = useNotifier();
  const [settings, setSettings] = useState<PublicAuthSettings | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAuthPublicSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (viewer?.authenticated) {
      navigate('/account', { replace: true });
    }
  }, [viewer, navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (tempToken) {
        const result = await loginAccount2FA({ temp_token: tempToken, totp_code: totpCode.trim() });
        if (result.viewer) {
          setViewer(result.viewer);
          navigate('/account', { replace: true });
        }
        return;
      }

      const result = await loginAccount({
        email: email.trim(),
        password,
      });
      if (result.requires_2fa && result.temp_token) {
        setTempToken(result.temp_token);
        setMaskedEmail(result.user_email_masked || email.trim());
        return;
      }
      if (result.viewer) {
        setViewer(result.viewer);
        navigate('/account', { replace: true });
      }
    } catch (err) {
      notifyError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 min-h-screen flex items-center">
      <section className="w-full rounded-xl border border-outline-variant bg-surface p-8 shadow-sm">
        <div className="text-xs text-secondary font-medium mb-2">
          {t('login_access')}
        </div>
        <h1 className="text-2xl font-bold text-on-surface mb-2">
          {tempToken ? t('login_title_2fa') : t('login_title')}
        </h1>
        <p className="text-sm text-on-surface-variant mb-8">
          {tempToken
            ? t('login_desc_2fa', { value: maskedEmail })
            : t('login_desc')}
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {!tempToken && (
            <>
              <Field label={t('login_email')}>
                <input className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label={t('login_password')}>
                <input className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </Field>
            </>
          )}

          {tempToken && (
            <Field label={t('login_totp')}>
              <input
                className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary transition-colors text-center tracking-widest"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </Field>
          )}

          <button
            className="w-full h-11 rounded-lg bg-primary text-on-primary font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={loading}
            type="submit"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : tempToken ? <ShieldCheck size={16} /> : <LockKeyhole size={16} />}
            {tempToken ? t('login_submit_2fa') : t('login_submit')}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-outline-variant text-sm text-on-surface-variant flex items-center justify-between gap-4">
          <span>{t('login_new')}</span>
          <Link className="text-primary font-medium hover:text-primary/80 transition-colors" to="/register">
            {t('top_register')}
          </Link>
        </div>
      </section>
    </div>
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
