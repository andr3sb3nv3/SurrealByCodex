import React, { useState } from 'react';
import { User, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { User as UserIcon, Mail, Lock, ArrowRight, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { db } from '../services/firebase';
import { Language } from '../types';

interface Props {
  user: User;
  language: Language;
  onComplete: () => void;
}

const STR: Record<'es' | 'en', {
  title: string;
  subtitle: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailHint: string;
  save: string;
  saving: string;
  nameRequired: string;
  emailRequired: string;
  emailInvalid: string;
  errorGeneric: string;
  whyTitle: string;
  whyBullet1: string;
  whyBullet2: string;
  whyBullet3: string;
}> = {
  es: {
    title: '¡Bienvenido a Surreal Horizons!',
    subtitle: 'Primer paso antes de tus métricas: confirmá tu nombre de usuario y cargá un email de recuperación.',
    usernameLabel: 'Nombre de usuario',
    usernamePlaceholder: 'Ej. ana_2025',
    emailLabel: 'Email de recuperación',
    emailPlaceholder: 'ana@ejemplo.com',
    emailHint: 'Sólo lo usaremos para recuperar tu contraseña si la olvidás. Nunca enviaremos promociones.',
    save: 'Guardar y continuar',
    saving: 'Guardando...',
    nameRequired: 'Tu nombre de usuario es obligatorio.',
    emailRequired: 'El email es obligatorio.',
    emailInvalid: 'El email no parece válido.',
    errorGeneric: 'No se pudo guardar. Intentá de nuevo.',
    whyTitle: 'Por qué te pedimos esto',
    whyBullet1: 'Para identificar tu cuenta con el nombre de usuario correcto.',
    whyBullet2: 'Para poder recuperar tu contraseña si la olvidás.',
    whyBullet3: 'Tu username y tu código clínico siguen siendo anónimos.',
  },
  en: {
    title: 'Welcome to Surreal Horizons!',
    subtitle: 'First step before choosing metrics: confirm your username and add a recovery email.',
    usernameLabel: 'Username',
    usernamePlaceholder: 'e.g. ana_2025',
    emailLabel: 'Recovery email',
    emailPlaceholder: 'ana@example.com',
    emailHint: "We'll only use it to recover your password if you forget. No marketing, ever.",
    save: 'Save and continue',
    saving: 'Saving...',
    nameRequired: 'Your username is required.',
    emailRequired: 'Email is required.',
    emailInvalid: 'Email does not look valid.',
    errorGeneric: 'Could not save. Please try again.',
    whyTitle: 'Why we ask',
    whyBullet1: 'To identify your account by your username.',
    whyBullet2: 'So you can recover your password if forgotten.',
    whyBullet3: 'Your username and clinical code remain anonymous.',
  },
};

const pickLang = (language: Language): 'es' | 'en' => (language === 'es' ? 'es' : 'en');

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RX = /^[a-zA-Z0-9._-]{3,30}$/;

const ProfileCompletion: React.FC<Props> = ({ user, language, onComplete }) => {
  const t = STR[pickLang(language)];
  const [username, setUsername] = useState(user.displayName ?? '');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    const trimmedName = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !USERNAME_RX.test(trimmedName)) { setError(t.nameRequired); return; }
    if (!trimmedEmail) { setError(t.emailRequired); return; }
    if (!EMAIL_RX.test(trimmedEmail)) { setError(t.emailInvalid); return; }
    if (!db) { setError(t.errorGeneric); return; }

    setSaving(true);
    try {
      // El displayName del perfil queda alineado al username elegido.
      await updateProfile(user, { displayName: trimmedName });

      // Firestore: metadata para el psiquiatra + recovery email.
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          displayName: trimmedName,
          recoveryEmail: trimmedEmail,
          profileCompletedAt: Date.now(),
        },
        { merge: true }
      );
      await setDoc(
        doc(db, 'users', user.uid, 'user_settings', 'preferences'),
        {
          recoveryEmail: trimmedEmail,
          username: trimmedName,
          profileCompletedAt: Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      onComplete();
    } catch (err: any) {
      console.error('ProfileCompletion save error', err);
      setError(t.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="relative bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white">
          <div className="absolute top-4 right-4 opacity-20">
            <Sparkles size={80} />
          </div>
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30">
            <UserIcon size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-2">{t.title}</h1>
          <p className="text-indigo-100/90 text-sm leading-relaxed">{t.subtitle}</p>
        </div>

        <div className="p-8 space-y-5">
          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider group-focus-within:text-indigo-600 transition-colors">
              {t.usernameLabel}
            </label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                placeholder={t.usernamePlaceholder}
              />
            </div>
          </div>

          <div className="space-y-1.5 group">
            <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider group-focus-within:text-indigo-600 transition-colors">
              {t.emailLabel}
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                placeholder={t.emailPlaceholder}
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed ml-1 mt-1.5 flex items-start gap-1.5">
              <Lock size={12} className="shrink-0 mt-0.5 text-slate-400" />
              {t.emailHint}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-medium rounded-xl flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t.saving}
              </>
            ) : (
              <>
                {t.save}
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mt-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-indigo-700 mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={12} /> {t.whyTitle}
            </p>
            <ul className="space-y-1.5 text-xs text-indigo-900/90">
              <li>• {t.whyBullet1}</li>
              <li>• {t.whyBullet2}</li>
              <li>• {t.whyBullet3}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletion;
