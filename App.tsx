import React, { useState, useEffect, useMemo, useRef } from 'react';
import { onAuthStateChanged, User, signOut, getRedirectResult, IdTokenResult } from 'firebase/auth';
import { setDoc, doc, collection, query, where, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { Loader2, AlertCircle, Copy, Check, Users, ChevronUp, ChevronDown, LogIn, LogOut } from 'lucide-react';
import { auth, db } from './services/firebase';
import AuthModal from './components/AuthModal';
import PersonalCanvas from './views/PersonalCanvas';
import PersonalDevDashboard from './views/PersonalDevDashboard';
import MonthlyReflections from './views/MonthlyReflections';
import UserProfile from './views/UserProfile';
import LandingPage from './views/LandingPage';
import UserOnboarding from './components/UserOnboarding';
import ProfileCompletion from './components/ProfileCompletion';
import YearInPixels from './views/YearInPixels';
import ClinicalDashboard from './views/ClinicalDashboard';
import { Language, Theme } from './types';
import { TRANSLATIONS } from './translations';
import Toast from './components/ui/Toast';
import { useToast } from './utils/useToast';
import { getTodayKey } from './utils/dateUtils';
import { FIRESTORE_RULES } from './utils/firestoreRules';

interface DemoUserSeed {
  uid: string;
  displayName: string;
  email: string;
  creationTime: string;
}

const createDemoUser = ({ uid, displayName, email, creationTime }: DemoUserSeed): User => ({
  uid,
  displayName,
  email,
  isAnonymous: false,
  photoURL: null,
  providerData: [],
  emailVerified: true,
  metadata: {
    creationTime,
    lastSignInTime: new Date().toISOString(),
  },
  phoneNumber: null,
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => '',
  getIdTokenResult: async () => ({
    claims: {},
    token: '',
    authTime: '',
    issuedAtTime: '',
    expirationTime: '',
    signInProvider: null,
    signInSecondFactor: null,
  } as IdTokenResult),
  reload: async () => {},
  toJSON: () => ({}),
} as unknown as User);

const DEMO_USER = createDemoUser({
  uid: 'JDzx9vojl2dlKs5sg0gInEhRiHF3',
  displayName: 'Usuario Demo 1',
  email: 'demo@surreal.horizons',
  creationTime: new Date(2024, 9, 15).toISOString(),
});

const DEMO_USER_4 = createDemoUser({
  uid: 'InconsistentStreak2025',
  displayName: 'Demo Clínico 0110000000',
  email: 'demo4@surreal.horizons',
  creationTime: new Date(2024, 11, 31).toISOString(),
});

// Demo 5 — UID termina en 10 dígitos = '1111111111' que activa los 10
// módulos clínicos (parseEnabledModules lee esa porción del displayName/uid).
const DEMO_USER_5 = createDemoUser({
  uid: 'DemoMetricas1111111111',
  displayName: 'Demo Clínico 0001000001',
  email: 'demo5@surreal.horizons',
  creationTime: new Date(Date.now() - 366 * 86400000).toISOString(),
});

const DEMO_USER_6 = createDemoUser({
  uid: 'DemoMetricas2222222222',
  displayName: 'Demo Clínico 1111111111',
  email: 'demo6@surreal.horizons',
  creationTime: new Date(Date.now() - 366 * 86400000).toISOString(),
});

export default function App() {
  const [view, setView] = useState<'landing' | 'canvas' | 'dashboard' | 'comments' | 'profile' | 'yearPixels' | 'clinical'>('canvas');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentRealUser, setCurrentRealUser] = useState<User | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  
  // State for the Demo Mode: 0 = Off, 1 = Demo 1, 4 = Demo 4, 5 = Demo 5, 6 = Demo 6
  const [demoMode, setDemoMode] = useState<number>(4);

  // State for Pro Membership (Default to true as requested)
  const [isPro, setIsPro] = useState(true);

  // State for Shared Profile Viewing (Read Only Mode)
  const [sharedUserViewing, setSharedUserViewing] = useState<User | null>(null);

  const { toast, showToast, clearToast } = useToast();
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dev Controls Visibility State - Default false (minimized)
  const [showDevControls, setShowDevControls] = useState(false);

  const SUPPORTED_LANGS: Language[] = ['es', 'en', 'fr', 'de', 'it', 'ru', 'zh'];

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang') as Language | null;
    return saved && SUPPORTED_LANGS.includes(saved) ? saved : 'es';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('app_theme');
    return (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system';
  });

  const handleToggleLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app_lang', lang);
  };

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
  };

  const openLoginModal = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  // Apply Theme Effect
  useEffect(() => {
    const applyTheme = () => {
      const root = window.document.documentElement;
      const isDark = 
        theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);
  
  const t = TRANSLATIONS[language];

  // Logic to handle Demo Mode switching and Onboarding State
  useEffect(() => {
    if (demoMode === 1) {
      // Demo 1 is ALWAYS treated as a new user starting the app
      setIsOnboarding(true);
      setNeedsProfile(false);
    } else if (demoMode === 4 || demoMode === 5 || demoMode === 6) {
      // Demos 4..6 skip onboarding (Historical data views)
      setIsOnboarding(false);
      setNeedsProfile(false);
    } else if (currentRealUser) {
       // If switching back to Real User, re-check DB status
       const checkRealUserStatus = async () => {
          if (!db) return;
          try {
            const prefRef = doc(db, 'users', currentRealUser.uid, 'user_settings', 'preferences');
            const prefSnap = await getDoc(prefRef);
            const prefs = prefSnap.exists() ? prefSnap.data() : null;
            const email = currentRealUser.email?.toLowerCase() ?? '';
            const isUsernameMode = email.endsWith('@user.local');
            const hasRecovery = !!(prefs && prefs.recoveryEmail);
            setNeedsProfile(isUsernameMode && !hasRecovery);
            setIsOnboarding(!prefs || !prefs.onboardingCompleted);
          } catch (e) {
            console.warn("Error checking user status", e);
          }
       };
       checkRealUserStatus();
    }
  }, [demoMode, currentRealUser]);

  // Procesa el resultado del flujo de redirect (fallback cuando el popup está bloqueado).
  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth).catch((err) => {
      if (err?.code && err.code !== 'auth/no-auth-event') {
        console.error('Error resolviendo redirect de auth:', err);
        showToast('No se pudo completar el inicio de sesión con Google.', 'error');
      }
    });
  }, [showToast]);

  // Auth Listener
  useEffect(() => {
    if (auth) {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setCurrentRealUser(u);
            
            // Register in public directory if real user
            if (u && !u.isAnonymous && u.email && db) {
              try {
                // 1. Register Email
                await setDoc(doc(db, 'public_emails', u.email.toLowerCase()), {
                  uid: u.uid,
                  email: u.email.toLowerCase(),
                  displayName: u.displayName || 'Usuario'
                });

                // 2. Check Onboarding + Profile Completion (Only if not in Demo Mode)
                if (demoMode === 0) {
                  const prefRef = doc(db, 'users', u.uid, 'user_settings', 'preferences');
                  const prefSnap = await getDoc(prefRef);
                  const prefs = prefSnap.exists() ? prefSnap.data() : null;

                  // Username mode users tienen email sintético @user.local; la primera vez
                  // que entran les pedimos nombre real + email de recuperación.
                  const isUsernameMode = !!u.email && u.email.toLowerCase().endsWith('@user.local');
                  const hasRecovery = !!(prefs && prefs.recoveryEmail);
                  setNeedsProfile(isUsernameMode && !hasRecovery);

                  if (!prefs || !prefs.onboardingCompleted) {
                    setIsOnboarding(true);
                  } else {
                    setIsOnboarding(false);
                  }
                }

              } catch (e) {
                console.warn("Public directory or onboarding check failed:", e);
              }
            } else {
              // Guest or Demo Mode handled by side effect above
              if (demoMode === 0) setIsOnboarding(false);
            }

            setIsAuthReady(true);

            // If we are not in demo mode and a real user logs in, close modal
            if (u && demoMode === 0) {
              setIsAuthModalOpen(false);
              setView(prev => prev === 'landing' ? 'canvas' : prev);
            }
        });
        return () => unsubscribe();
    } else {
        setIsAuthReady(true);
    }
  }, [demoMode]); 

  // Real-time Pending Invites Listener
  useEffect(() => {
    if (!currentRealUser || !currentRealUser.email || demoMode !== 0 || !db) return;

    const email = currentRealUser.email.toLowerCase();
    const q = query(collection(db, 'pending_invites'), where("toEmail", "==", email));

    const unsubscribeInvites = onSnapshot(q, async (snapshot) => {
      let processedCount = 0;
      
      for (const d of snapshot.docs) {
         const invite = d.data();
         
         if (invite.fromUid) {
            try {
                // 1. Create the incoming connection (Accept Invite)
                await setDoc(doc(db, 'users', currentRealUser.uid, 'incoming_connections', invite.fromUid), {
                  ownerUid: invite.fromUid,
                  displayName: invite.fromName || 'Usuario',
                  email: invite.fromEmail || '',
                  initial: (invite.fromName || 'U')[0].toUpperCase()
                });
                
                // 2. Delete the pending invite
                await deleteDoc(d.ref);
                processedCount++;
            } catch (err) {
                console.error("Error processing invite:", err);
            }
         }
      }

      if (processedCount > 0) {
         showToast(`${t.invitationProcessed} (${processedCount})`, 'success');
      }
    });

    return () => unsubscribeInvites();
  }, [currentRealUser, demoMode, language, showToast, t.invitationProcessed]);

  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayKey());

  // Direct patient URL handler — allows the clinician's own app to deep-link
  // into a specific patient's dashboard via ?p={patientUid}. Access is
  // validated against the clinician's own incoming_connections so only
  // patients who explicitly shared can be opened. The intent survives a
  // login round-trip via sessionStorage.
  const PATIENT_INTENT_KEY = 'pendingPatientAccess';
  const patientAccessResolving = useRef(false);

  useEffect(() => {
    if (!isAuthReady) return;

    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get('p');
    const fromStorage = sessionStorage.getItem(PATIENT_INTENT_KEY);
    const patientUid = fromQuery || fromStorage;

    if (!patientUid) return;
    if (patientAccessResolving.current) return;

    if (!currentRealUser) {
      sessionStorage.setItem(PATIENT_INTENT_KEY, patientUid);
      if (fromQuery) {
        url.searchParams.delete('p');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      }
      openLoginModal();
      return;
    }

    patientAccessResolving.current = true;
    sessionStorage.removeItem(PATIENT_INTENT_KEY);
    if (fromQuery) {
      url.searchParams.delete('p');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }

    (async () => {
      try {
        if (!db) throw new Error('db not ready');
        const connRef = doc(db, 'users', currentRealUser.uid, 'incoming_connections', patientUid);
        const snap = await getDoc(connRef);
        if (!snap.exists()) {
          showToast(t.patientAccessDenied, 'error');
          return;
        }
        const data = snap.data() as { ownerUid?: string; displayName?: string; email?: string };
        handleViewSharedProfile(
          data.ownerUid || patientUid,
          data.displayName || 'Paciente',
          data.email || ''
        );
      } catch (err) {
        console.error('Direct patient access error', err);
        showToast(t.patientAccessError, 'error');
      } finally {
        patientAccessResolving.current = false;
      }
    })();
  }, [isAuthReady, currentRealUser, showToast, t.patientAccessDenied, t.patientAccessError]);

  const activeUser = useMemo(() => {
    if (sharedUserViewing) return sharedUserViewing;
    switch (demoMode) {
      case 1: return DEMO_USER;
      case 4: return DEMO_USER_4;
      case 5: return DEMO_USER_5;
      case 6: return DEMO_USER_6;
      default: return currentRealUser;
    }
  }, [sharedUserViewing, demoMode, currentRealUser]);

  const handleViewSharedProfile = (uid: string, name: string, email: string) => {
    const mockSharedUser = {
      uid,
      displayName: name,
      email,
      isAnonymous: false,
      photoURL: null,
      metadata: {},
      providerData: [],
    } as unknown as User;

    setSharedUserViewing(mockSharedUser);
    setView('dashboard');
    showToast(`${t.viewingProfileOf} ${name}`, 'success');
  };

  const handleExitSharedView = () => {
    setSharedUserViewing(null);
    setView('profile');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('landing');
      setSharedUserViewing(null);
      setDemoMode(0);
    } catch (error) {
      console.error("Error signing out", error);
      showToast("Error al cerrar sesión", 'error');
    }
  };

  const copyRules = async () => {
    try {
      await navigator.clipboard.writeText(FIRESTORE_RULES);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Clipboard copy failed", error);
      showToast("No se pudo copiar al portapapeles", 'error');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-slate-400">...</p>
        </div>
      </div>
    );
  }

  // Gate 1 (antes del onboarding): si es un usuario real que se registró en
  // modo anónimo (email sintético @user.local) y todavía no cargó nombre
  // real + email de recuperación, se lo pedimos una única vez.
  const shouldShowProfile = (
    currentRealUser && demoMode === 0 && !sharedUserViewing && needsProfile
  );

  if (shouldShowProfile) {
    return (
      <ProfileCompletion
        user={currentRealUser!}
        language={language}
        onComplete={() => setNeedsProfile(false)}
      />
    );
  }

  const shouldShowOnboarding = (
    ((currentRealUser && demoMode === 0) || demoMode === 1) &&
    !sharedUserViewing &&
    isOnboarding
  );

  if (shouldShowOnboarding) {
    const targetUser = demoMode === 1 ? DEMO_USER : currentRealUser!;
    return (
      <UserOnboarding
        user={targetUser}
        language={language}
        onComplete={() => setIsOnboarding(false)}
      />
    );
  }

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        initialIsLogin={authModalMode === 'login'}
        onClose={() => setIsAuthModalOpen(false)}
      />
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

      {/* Rules Help Modal */}
      {showRulesModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rules-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-in zoom-in-95">
             <div className="flex items-center gap-3 mb-4 text-red-600">
               <AlertCircle size={32} />
               <h3 id="rules-modal-title" className="text-xl font-bold">{t.seedErrorPermissions}</h3>
             </div>
             <p className="text-slate-600 mb-4">{t.firestoreRulesHelp}</p>

             <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs font-mono overflow-auto max-h-80 relative group">
                <button onClick={copyRules} className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors flex items-center gap-2">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copiado' : 'Copiar Reglas'}</span>
                </button>
                <pre>{FIRESTORE_RULES}</pre>
             </div>

             <div className="mt-6 flex justify-end">
               <button onClick={() => setShowRulesModal(false)} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors">
                 Cerrar
               </button>
             </div>
          </div>
        </div>
      )}

      {!sharedUserViewing && (
        <div className="fixed bottom-6 left-6 z-[60] flex flex-col items-start gap-2">
          {showDevControls && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 w-64 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 mb-2">
                Demos
              </p>
              <div className="flex flex-col gap-1">
                {[
                  { mode: 1, label: 'Demo 1 · Onboarding', hint: 'Flujo de nuevo usuario' },
                  { mode: 4, label: 'Demo 4 · Depresión + Bipolar', hint: 'Últimos 3 meses' },
                  { mode: 5, label: 'Demo 5 · Psicótico + Consumo', hint: '365 días imperfectos' },
                  { mode: 6, label: 'Demo 6 · Completo', hint: '365 días · todos los trastornos' },
                ].map(({ mode, label, hint }) => {
                  const active = demoMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setDemoMode(mode)}
                      className={`text-left px-3 py-2 rounded-lg transition-colors ${
                        active
                          ? 'bg-blue-500 text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="text-sm font-semibold">{label}</div>
                      <div className={`text-xs ${active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {hint}
                      </div>
                    </button>
                  );
                })}
                {currentRealUser && (
                  <button
                    onClick={() => setDemoMode(0)}
                    className={`text-left px-3 py-2 rounded-lg transition-colors border-t border-slate-200 dark:border-slate-700 mt-1 pt-2 ${
                      demoMode === 0
                        ? 'bg-emerald-500 text-white'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="text-sm font-semibold">Mi cuenta</div>
                    <div className={`text-xs ${demoMode === 0 ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {currentRealUser.email || currentRealUser.displayName}
                    </div>
                  </button>
                )}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                {currentRealUser ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>
                ) : (
                  <button
                    onClick={openLoginModal}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <LogIn size={16} />
                    Iniciar sesión
                  </button>
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => setShowDevControls(v => !v)}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-xl pl-3 pr-4 py-2 flex items-center gap-2 hover:scale-105 transition-transform"
            aria-label="Alternar selector de demos"
          >
            <Users size={18} />
            <span className="text-sm font-semibold">Demos</span>
            {showDevControls ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      )}

      {view === 'landing' && (
        <LandingPage
          onLogin={() => {
            openLoginModal();
          }}
          onRegister={() => {
            setAuthModalMode('register');
            setIsAuthModalOpen(true);
          }}
        />
      )}

      {view === 'canvas' && (
        <PersonalCanvas
           onNavigateToDashboard={() => setView('dashboard')}
           onNavigateToComments={() => setView('comments')}
           currentDate={selectedDate}
           onDateChange={setSelectedDate}
           user={activeUser}
           authUser={currentRealUser}
           onAuthRequest={openLoginModal}
           onNavigateToProfile={() => setView('profile')}
           language={language}
           onToggleLanguage={handleToggleLanguage}
           theme={theme}
           onSetTheme={handleSetTheme}
           isPro={isPro}
           onTogglePro={() => setIsPro(!isPro)}
           showDevControls={showDevControls}
           onLogout={handleLogout}
        />
      )}
      {view === 'dashboard' && (
        <PersonalDevDashboard
           key={`dashboard-${activeUser?.uid ?? 'none'}`}
           onBack={() => sharedUserViewing ? handleExitSharedView() : setView('canvas')}
           user={activeUser}
           authUser={currentRealUser}
           onNavigateToComments={() => setView('comments')}
           onNavigateToClinicalMetrics={() => setView('clinical')}
           onAuthRequest={openLoginModal}
           onNavigateToProfile={() => setView('profile')}
           language={language}
           onToggleLanguage={handleToggleLanguage}
           theme={theme}
           onSetTheme={handleSetTheme}
           isPro={isPro}
           onTogglePro={() => setIsPro(!isPro)}
           readOnly={!!sharedUserViewing}
           viewingFriendName={sharedUserViewing?.displayName || undefined}
           onExitSharedView={handleExitSharedView}
           onLogout={handleLogout}
        />
      )}
      {view === 'clinical' && (
        <ClinicalDashboard
           key={`clinical-${activeUser?.uid ?? 'none'}`}
           onBack={() => setView('dashboard')}
           user={activeUser}
           authUser={currentRealUser}
           onAuthRequest={openLoginModal}
           onNavigateToProfile={() => setView('profile')}
           language={language}
           onToggleLanguage={handleToggleLanguage}
           theme={theme}
           onSetTheme={handleSetTheme}
           isPro={isPro}
           onTogglePro={() => setIsPro(!isPro)}
           readOnly={!!sharedUserViewing}
           viewingFriendName={sharedUserViewing?.displayName || undefined}
           onExitSharedView={handleExitSharedView}
           onLogout={handleLogout}
        />
      )}
      {view === 'comments' && (
        <MonthlyReflections
           onBack={() => setView('canvas')}
           user={activeUser}
           authUser={currentRealUser}
           onAuthRequest={openLoginModal}
           onNavigateToProfile={() => setView('profile')}
           language={language}
           onToggleLanguage={handleToggleLanguage}
           theme={theme}
           onSetTheme={handleSetTheme}
           isPro={isPro}
           onTogglePro={() => setIsPro(!isPro)}
           readOnly={!!sharedUserViewing}
           viewingFriendName={sharedUserViewing?.displayName || undefined}
           onExitSharedView={handleExitSharedView}
           onLogout={handleLogout}
        />
      )}
      {view === 'profile' && activeUser && (
        <UserProfile
           key={`profile-${activeUser.uid}`}
           onBack={() => setView('canvas')}
           user={activeUser}
           authUser={currentRealUser}
           onAuthRequest={openLoginModal}
           onNavigateToProfile={() => {}} 
           language={language}
           onToggleLanguage={handleToggleLanguage}
           theme={theme}
           onSetTheme={handleSetTheme}
           isPro={isPro}
           onTogglePro={() => setIsPro(!isPro)}
           onViewSharedProfile={handleViewSharedProfile}
           onShowRules={() => setShowRulesModal(true)}
           onNavigateToYearPixels={() => setView('yearPixels')}
           onLogout={handleLogout}
        />
      )}
      {view === 'yearPixels' && (
        <YearInPixels
           onBack={() => setView('profile')}
           user={activeUser}
           authUser={currentRealUser}
           onAuthRequest={openLoginModal}
           onNavigateToProfile={() => setView('profile')} 
           language={language}
           onToggleLanguage={handleToggleLanguage}
           theme={theme}
           onSetTheme={handleSetTheme}
           isPro={isPro}
           onTogglePro={() => setIsPro(!isPro)}
           onLogout={handleLogout}
        />
      )}
    </>
  );
}
