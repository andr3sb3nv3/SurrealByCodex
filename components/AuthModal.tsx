import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, User as UserIcon, Mail, Lock, ArrowRight, Sparkles, LogIn, AtSign, VenetianMask, LifeBuoy, Send } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  updateProfile,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  EmailAuthProvider
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Dominio interno para mapear "usuario" → email sintético en Firebase Auth.
// El usuario nunca lo ve.
const ANON_EMAIL_DOMAIN = 'user.local';
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${ANON_EMAIL_DOMAIN}`;

type AuthMode = 'username' | 'email';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('username');
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [sendingRecovery, setSendingRecovery] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [showRecoveryBox, setShowRecoveryBox] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setRecoveryMessage(null);
      setLoading(false);
      setPassword('');
      setShowRecoveryBox(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError("No se pudo conectar con el servicio de autenticación.");
      return;
    }

    if (authMode === 'username' && !USERNAME_REGEX.test(username)) {
      setError('El usuario debe tener entre 3 y 30 caracteres y solo puede contener letras, números, punto, guión bajo o medio.');
      return;
    }

    setLoading(true);
    setError(null);

    const effectiveEmail = authMode === 'username' ? usernameToEmail(username) : email;
    const effectiveDisplayName = authMode === 'username' ? username.trim() : name;

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, effectiveEmail, password);
      } else {
        if (auth.currentUser && auth.currentUser.isAnonymous) {
          const credential = EmailAuthProvider.credential(effectiveEmail, password);
          await linkWithCredential(auth.currentUser, credential);
          if (effectiveDisplayName) {
            await updateProfile(auth.currentUser, { displayName: effectiveDisplayName });
          }
        } else {
          const userCredential = await createUserWithEmailAndPassword(auth, effectiveEmail, password);
          if (effectiveDisplayName) {
            await updateProfile(userCredential.user, { displayName: effectiveDisplayName });
          }
        }
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let msg = "Error de autenticación.";
      if (err.code === 'auth/email-already-in-use') {
        msg = authMode === 'username'
          ? 'Ese usuario ya está registrado. Probá otro o iniciá sesión.'
          : 'Este correo ya está registrado. Intentá iniciar sesión.';
      }
      if (err.code === 'auth/credential-already-in-use') msg = "Esta cuenta ya existe.";
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = authMode === 'username' ? 'Usuario o contraseña incorrectos.' : 'Credenciales incorrectas.';
      }
      if (err.code === 'auth/weak-password') msg = "La contraseña es muy débil (mínimo 6 caracteres).";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    // Recuperación por email únicamente (sin pedir username).
    if (!EMAIL_REGEX.test(recoveryEmail)) {
      setError('Ingresá un email de recuperación válido.');
      return;
    }

    setSendingRecovery(true);
    setError(null);
    setRecoveryMessage(null);

    try {
      const requestPasswordRecovery = httpsCallable(functions, 'requestPasswordRecovery');
      const result = await requestPasswordRecovery({
        recoveryEmail: recoveryEmail.trim().toLowerCase(),
      });
      const data = result.data as { message?: string };
      setRecoveryMessage(data?.message || 'Te enviamos un email para restablecer tu contraseña.');
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code?.includes('not-found') || code?.includes('permission-denied')) {
        setError('No existe una cuenta con esos datos.');
      } else {
        setError('No pudimos enviar el email de recuperación. Intentá de nuevo.');
      }
    } finally {
      setSendingRecovery(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth) {
      setError("No se pudo conectar con el servicio de autenticación.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const isPopupIssue = (code?: string) =>
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment';

      try {
        if (auth.currentUser && auth.currentUser.isAnonymous) {
          try {
            await linkWithPopup(auth.currentUser, provider);
          } catch (linkError: any) {
            if (linkError.code === 'auth/credential-already-in-use') {
              await signInWithPopup(auth, provider);
            } else {
              throw linkError;
            }
          }
        } else {
          await signInWithPopup(auth, provider);
        }
        onClose();
      } catch (popupErr: any) {
        if (isPopupIssue(popupErr.code)) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }
    } catch (err: any) {
      console.error("Social Auth Error:", err);
      let msg = "No se pudo iniciar sesión con Google.";

      if (err.code === 'auth/account-exists-with-different-credential') msg = "Ya existe una cuenta con el mismo email pero diferentes credenciales.";
      if (err.code === 'auth/credential-already-in-use') msg = "Esta cuenta de Google ya está vinculada a otro usuario.";
      if (err.code === 'auth/unauthorized-domain') msg = "Este dominio no está autorizado en Firebase Auth. Agregalo en Authentication → Settings → Authorized domains.";

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
      <div
        className="bg-white text-slate-900 rounded-[28px] shadow-2xl max-w-md w-full overflow-hidden relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col my-auto max-h-[calc(100vh-1rem)]"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Decorative Header */}
        <div className={`relative px-6 pt-8 pb-6 text-white transition-colors duration-500 ${isLogin ? 'bg-gradient-to-br from-indigo-600 to-violet-600' : 'bg-gradient-to-br from-slate-800 to-slate-900'}`}>
           <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors backdrop-blur-sm"
            type="button"
          >
            <X size={20} />
          </button>

           <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/30 text-white">
              {isLogin ? <LogIn size={24} /> : <Sparkles size={24} />}
           </div>

           <h2 className="text-3xl font-bold tracking-tight mb-2">
             {isLogin ? 'Bienvenido' : 'Crear Cuenta'}
           </h2>
           {!isLogin && (
             <p className="text-indigo-100/80 text-sm font-medium leading-relaxed max-w-xs">
                Únete para comenzar tu viaje de crecimiento personal.
             </p>
           )}
        </div>

        {/* Form Body */}
        <div className="p-6 bg-white flex-1 overflow-y-auto">

          {/* Auth Mode Tabs */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mb-4">
            <button
              type="button"
              onClick={() => { setAuthMode('username'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                authMode === 'username'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <VenetianMask size={16} />
              100% Anónimo
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('email'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                authMode === 'email'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Mail size={16} />
              Email
            </button>
          </div>

          {authMode === 'username' && (
            <div className="mb-5 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <VenetianMask size={14} /> Ingreso anónimo con usuario y contraseña
              </p>
              <p className="text-indigo-800/80">
                Sin email de login ni teléfono. Elegí un usuario y una contraseña. Después te pediremos un email de recuperación para casos de olvido.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email + Name (modo email, registro) */}
            {authMode === 'email' && !isLogin && (
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider group-focus-within:text-indigo-600 transition-colors">Nombre</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input
                    type="text"
                    required
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>
            )}

            {/* Campo de identidad */}
            {authMode === 'username' ? (
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider group-focus-within:text-indigo-600 transition-colors">Usuario</label>
                <div className="relative">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input
                    type="text"
                    required
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="ej: ana_2025"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 group">
                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider group-focus-within:text-indigo-600 transition-colors">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input
                    type="email"
                    required
                    name="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="hola@ejemplo.com"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider group-focus-within:text-indigo-600 transition-colors">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input
                  type="password"
                  required
                  name="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-4 py-4 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-[0.98] transition-all flex justify-center items-center gap-2 ${isLogin ? 'bg-gradient-to-r from-indigo-600 to-violet-600' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              {loading && !error ? <Loader2 size={20} className="animate-spin" /> : (
                <>
                   {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'} <ArrowRight size={20} className="opacity-80" />
                </>
              )}
            </button>

            {isLogin && authMode === 'username' && (
              <div className="mt-2 p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <LifeBuoy size={14} /> Olvidé contraseña
                </p>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="Email de recuperación"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={sendingRecovery}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {sendingRecovery ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Enviar recuperación
                </button>
                {recoveryMessage && (
                  <p className="text-xs text-emerald-700 font-medium">{recoveryMessage}</p>
                )}
              </div>
            )}
          </form>

          {/* Social Logins */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px bg-slate-100 flex-1"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">O continúa con</span>
            <div className="h-px bg-slate-100 flex-1"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border border-slate-200 rounded-2xl text-slate-700 text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 font-medium">
              {isLogin ? "¿Nuevo aquí? " : "¿Ya tienes cuenta? "}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors ml-1 underline decoration-2 underline-offset-2 decoration-indigo-100 hover:decoration-indigo-300"
              >
                {isLogin ? "Regístrate gratis" : "Inicia sesión"}
              </button>
            </p>
            {isLogin && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowRecoveryBox((prev) => !prev)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 underline underline-offset-2 font-semibold inline-flex items-center gap-1"
                >
                  <LifeBuoy size={12} />
                  Olvidé mi contraseña
                </button>

                {showRecoveryBox && (
                  <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-left">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="Tu email"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={sendingRecovery}
                      className="w-full py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {sendingRecovery ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Enviar correo de recuperación
                    </button>
                    {recoveryMessage && (
                      <p className="text-xs text-emerald-700 font-medium">{recoveryMessage}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
