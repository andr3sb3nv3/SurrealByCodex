import React, { useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { Activity, BarChart2, Camera, LogIn, UserRound } from 'lucide-react';
import ClinicalDashboard from './views/ClinicalDashboard';
import PersonalCanvas from './views/PersonalCanvas';
import PersonalDevDashboard from './views/PersonalDevDashboard';
import SnapshotsCenter from './views/SnapshotsCenter';
import UserProfile from './views/UserProfile';
import { auth } from './services/firebase';
import { Language, Theme } from './types';
import { getTodayKey } from './utils/dateUtils';
import { clearIntegrationDemoData, seedIntegrationDemoData } from './utils/seedDemoData';

type View = 'canvas' | 'snapshots' | 'dashboard' | 'clinical' | 'profile';

export interface SurrealHorizonsAppProps {
  initialUser?: User | null;
  allowedEmail?: string;
  initialView?: View;
  onClose?: () => void;
}

const ALLOWED_EMAIL = 'aigurubenvenuto@gmail.com';

const SurrealHorizonsApp: React.FC<SurrealHorizonsAppProps> = ({
  initialUser,
  allowedEmail = ALLOWED_EMAIL,
  initialView = 'canvas',
  onClose,
}) => {
  const [authUser, setAuthUser] = useState<User | null>(initialUser ?? null);
  const [ready, setReady] = useState(Boolean(initialUser));
  const [view, setView] = useState<View>(initialView);
  const [currentDate, setCurrentDate] = useState(getTodayKey());
  const [language, setLanguage] = useState<Language>('es');
  const [theme, setTheme] = useState<Theme>('system');
  const [isPro, setIsPro] = useState(true);
  const [demoStatus, setDemoStatus] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);

  useEffect(() => {
    if (initialUser) return;
    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setReady(true);
    });
  }, [initialUser]);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', dark);
    };
    apply();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  const user = authUser;
  const allowed = useMemo(
    () => !allowedEmail || authUser?.email?.toLowerCase() === allowedEmail.toLowerCase(),
    [allowedEmail, authUser?.email]
  );

  const login = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const logout = async () => {
    await signOut(auth);
  };

  const generateDemo = async () => {
    if (!authUser || demoBusy) return;
    setDemoBusy(true);
    setDemoStatus('Generando demo...');
    const result = await seedIntegrationDemoData(authUser.uid, 3);
    setDemoBusy(false);
    if (result.success) {
      setDemoStatus(`Demo creado: ${result.daysGenerated} dias, ${result.verifiedClinicalLogs} registros clinicos.`);
      setCurrentDate(getTodayKey());
    } else {
      setDemoStatus(`Error: ${result.error ?? 'no se pudo generar el demo'}`);
    }
  };

  const clearDemo = async () => {
    if (!authUser || demoBusy) return;
    const accepted = window.confirm('Esto borra los datos demo de los ultimos 3 meses para este usuario. Continuar?');
    if (!accepted) return;
    setDemoBusy(true);
    setDemoStatus('Borrando demo...');
    const result = await clearIntegrationDemoData(authUser.uid, 3);
    setDemoBusy(false);
    setDemoStatus(result.success ? 'Demo borrado.' : `Error: ${result.error ?? 'no se pudo borrar el demo'}`);
  };

  const sharedProps = {
    user,
    authUser,
    onAuthRequest: login,
    onNavigateToProfile: () => setView('profile'),
    language,
    onToggleLanguage: setLanguage,
    theme,
    onSetTheme: setTheme,
    isPro,
    onTogglePro: () => setIsPro(prev => !prev),
    onLogout: logout,
  };

  if (!ready) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-900 text-slate-500">Cargando...</div>;
  }

  if (!authUser) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-900 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Surreal Horizons</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ingresá para controlar metricas, snapshots y perfil.</p>
          <button onClick={login} className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700">
            <LogIn size={18} /> Ingresar con Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <div>
      {!allowed && (
        <div className="bg-amber-100 text-amber-900 border-b border-amber-200 px-4 py-2 text-center text-sm font-bold">
          Usuario actual: {authUser.email}. Usuario esperado: {allowedEmail}.
        </div>
      )}

      <div className="sticky top-0 z-[80] bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
            <Activity size={14} /> Kit integrado
          </div>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setView('canvas')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${view === 'canvas' ? 'bg-white text-slate-950' : 'hover:bg-white/10'}`}>Metricas</button>
            <button onClick={() => setView('snapshots')} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${view === 'snapshots' ? 'bg-white text-slate-950' : 'hover:bg-white/10'}`}><Camera size={13} /> Snapshots</button>
            <button onClick={() => setView('dashboard')} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${view === 'dashboard' ? 'bg-white text-slate-950' : 'hover:bg-white/10'}`}><BarChart2 size={13} /> Historico</button>
            <button onClick={() => setView('clinical')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${view === 'clinical' ? 'bg-white text-slate-950' : 'hover:bg-white/10'}`}>Clinicas</button>
            <button onClick={() => setView('profile')} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${view === 'profile' ? 'bg-white text-slate-950' : 'hover:bg-white/10'}`}><UserRound size={13} /> Perfil</button>
            <button onClick={generateDemo} disabled={demoBusy} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-60">Demo 3 meses</button>
            <button onClick={clearDemo} disabled={demoBusy} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500 text-white hover:bg-rose-400 disabled:opacity-60">Borrar demo</button>
            {onClose && <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/10">Cerrar</button>}
          </div>
        </div>
      </div>

      {demoStatus && (
        <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 text-center text-xs font-bold text-slate-700 dark:text-slate-200">
          {demoStatus}
        </div>
      )}

      {view === 'canvas' && (
        <PersonalCanvas
          {...sharedProps}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onNavigateToDashboard={() => setView('snapshots')}
          onNavigateToComments={() => setView('dashboard')}
          showDevControls={false}
        />
      )}

      {view === 'snapshots' && (
        <SnapshotsCenter
          user={user}
          authUser={authUser}
          language={language}
          theme={theme}
          isPro={isPro}
          onBack={() => setView('canvas')}
          onAuthRequest={login}
          onNavigateToProfile={() => setView('profile')}
          onNavigateToDashboard={() => setView('dashboard')}
          onNavigateToClinicalMetrics={() => setView('clinical')}
          onLogout={logout}
          onToggleLanguage={setLanguage}
        />
      )}

      {view === 'dashboard' && (
        <PersonalDevDashboard
          {...sharedProps}
          onBack={() => setView('snapshots')}
          onNavigateToComments={() => setView('snapshots')}
          onNavigateToClinicalMetrics={() => setView('clinical')}
        />
      )}

      {view === 'clinical' && (
        <ClinicalDashboard
          {...sharedProps}
          onBack={() => setView('snapshots')}
        />
      )}

      {view === 'profile' && (
        <UserProfile
          {...sharedProps}
          onBack={() => setView('canvas')}
          onViewSharedProfile={() => {}}
          onNavigateToYearPixels={() => setView('dashboard')}
        />
      )}
    </div>
  );
};

export default SurrealHorizonsApp;
