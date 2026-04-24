import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, User as UserIcon, Mail, Calendar, CreditCard, 
  Settings, Bell, Globe, Lock, LogOut, Crown, Camera, Flame, 
  Activity, Award, Tag, UploadCloud, CheckCircle, Trash2, Search,
  Shield, UserPlus, Info, Users, Eye, Loader2, Link2, Check, ChevronDown, ListChecks, Key, Grid, Plus, Moon, Sun, Monitor
} from 'lucide-react';
import { signOut, updateProfile } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, getDoc, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import CompanyHeader from '../components/CompanyHeader';
import { UserProfileProps, Language, Theme, IncomingConnection, OutgoingConnection } from '../types';
import Toast from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { TRANSLATIONS } from '../translations';
import { setEncryptionKey, isEncryptionActive } from '../utils/encryption';
import { useToast } from '../utils/useToast';
import { formatDateKey, subDays } from '../utils/dateUtils';

// Map for Demo Users to allow reciprocal deletion client-side
// Normalizing keys to lowercase to avoid case-sensitivity issues
const DEMO_UID_MAP: Record<string, string> = {
  'demo@surreal.horizons': 'JDzx9vojl2dlKs5sg0gInEhRiHF3', // Demo 1 UID
  'demo4@surreal.horizons': 'InconsistentStreak2025', // Demo 4 UID
  'demo5@surreal.horizons': 'DemoMetricas1111111111', // Demo 5 UID
  'demo6@surreal.horizons': 'DemoMetricas2222222222' // Demo 6 UID
};

// Demo 1 Metadata for Simulation
const DEMO_1_META = {
  uid: 'JDzx9vojl2dlKs5sg0gInEhRiHF3',
  displayName: 'Usuario Demo 1',
  email: 'demo@surreal.horizons',
  initial: 'D1'
};

const COLLECTIONS = {
  users: 'users',
  dailyLogs: 'daily_logs',
  outgoing: 'outgoing_connections',
  incoming: 'incoming_connections',
  preferences: 'user_settings',
  preferencesDoc: 'preferences',
  publicEmails: 'public_emails',
  pendingInvites: 'pending_invites',
} as const;

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
];

const THEMES: { code: Theme; icon: React.ComponentType<{ size?: number; className?: string }>; labelKey: string }[] = [
  { code: 'light', icon: Sun, labelKey: 'light' },
  { code: 'dark', icon: Moon, labelKey: 'dark' },
  { code: 'system', icon: Monitor, labelKey: 'system' },
];

const UserProfile: React.FC<UserProfileProps> = ({ onBack, user, authUser, onAuthRequest, onNavigateToProfile, language, onToggleLanguage, theme, onSetTheme, isPro, onTogglePro, onViewSharedProfile, onShowRules, onNavigateToYearPixels, onLogout }) => {
  const [avatar, setAvatar] = useState<string | null>(user?.photoURL || null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast, showToast, clearToast } = useToast();
  
  // Stats State
  const [streak, setStreak] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  
  // Modals
  const [showManageModal, setShowManageModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showSecurityInfoModal, setShowSecurityInfoModal] = useState(false);
  
  // Settings State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Encryption State
  const [hasKey, setHasKey] = useState(isEncryptionActive());
  const [keyInput, setKeyInput] = useState("");

  // Sharing State
  const [shareEmail, setShareEmail] = useState("");
  const [sharedUsers, setSharedUsers] = useState<string[]>([]); // Outgoing
  const [incomingShares, setIncomingShares] = useState<IncomingConnection[]>([]); // Incoming
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[language];

  // Keep avatar aligned with currently selected user
  useEffect(() => {
    setAvatar(user?.photoURL || null);
  }, [user?.uid, user?.photoURL]);

  // Calculate Streak & Fetch Data
  useEffect(() => {
    if (!user || !db) return;
    let cancelled = false;
    const currentUid = user.uid;

    const fetchStats = async () => {
      try {
        const logsRef = collection(db, COLLECTIONS.users, currentUid, COLLECTIONS.dailyLogs);
        const snapshot = await getDocs(logsRef);
        if (cancelled) return;
        
        const datesSet = new Set<string>();
        snapshot.forEach(doc => {
            // Document ID is the date YYYY-MM-DD
            datesSet.add(doc.id);
        });

        if (cancelled) return;
        setTotalLogs(datesSet.size);

        // Calculate Streak
        let currentStreak = 0;
        const today = new Date();
        const todayStr = formatDateKey(today);
        const yesterdayStr = formatDateKey(subDays(today, 1));
        
        // Determine start point: 
        // If today is logged, start from today.
        // If today is NOT logged, but Yesterday IS, start from yesterday (streak is still alive).
        // If neither, streak is 0.
        let checkDate = today;
        
        if (!datesSet.has(todayStr)) {
            if (datesSet.has(yesterdayStr)) {
                checkDate = subDays(today, 1);
            } else {
                if (!cancelled) setStreak(0);
                return; 
            }
        }

        // Iterate backwards
        // We use a loop to check consecutive days
        while (true) {
            const dateStr = formatDateKey(checkDate);
            if (datesSet.has(dateStr)) {
                currentStreak++;
                checkDate = subDays(checkDate, 1);
            } else {
                break;
            }
        }
        
        if (!cancelled) setStreak(currentStreak);

      } catch (error) {
        console.error("Error calculating streak:", error);
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Fetch Connections on Load
  useEffect(() => {
    if (!user || !db) return;
    
    // Clear state immediately to prevent stale data from previous user
    setIncomingShares([]);
    setSharedUsers([]);
    setIsLoadingConnections(true);
    
    // 1. Listen to Outgoing Shares (Who I shared with) -> 'outgoing_connections'
    const outgoingRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.outgoing);
    const unsubOutgoing = onSnapshot(outgoingRef, (snapshot) => {
        const emails: string[] = [];
        snapshot.forEach(doc => {
            const data = doc.data() as Partial<OutgoingConnection>;
            if (typeof data.email === 'string' && data.email.trim() !== '') {
              emails.push(data.email);
            }
        });
        setSharedUsers(emails);
    }, (error) => console.error("Error fetching outgoing:", error));

    // 2. Listen to Incoming Shares (Who shared with me) -> 'incoming_connections'
    const incomingRef = collection(db, COLLECTIONS.users, user.uid, COLLECTIONS.incoming);
    const unsubIncoming = onSnapshot(incomingRef, (snapshot) => {
        const shares: IncomingConnection[] = [];
        snapshot.forEach(doc => {
            const data = doc.data() as Partial<IncomingConnection>;
            // Ensure we have minimal data to display
            if (typeof data.ownerUid === 'string') {
                shares.push({
                  ownerUid: data.ownerUid,
                  displayName: data.displayName,
                  email: data.email,
                  initial: data.initial,
                });
            }
        });
        setIncomingShares(shares);
        setIsLoadingConnections(false);
    }, (error) => console.error("Error fetching incoming:", error));

    return () => {
        unsubOutgoing();
        unsubIncoming();
    };
  }, [user]); // 'user' prop change (via App.tsx key) triggers this clean

  if (!user) return null;

  const joinDate = user.metadata.creationTime 
    ? new Date(user.metadata.creationTime).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })
    : 'Octubre 2024';
  
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast("Max 5MB", 'error');
        return;
      }
      
      setIsUploading(true);
      setTimeout(() => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const image = reader.result as string;
          setAvatar(image);
          try {
            await updateProfile(user, { photoURL: image });
            if (db) {
              await setDoc(doc(db, COLLECTIONS.users, user.uid), { photoURL: image }, { merge: true });
              await setDoc(doc(db, COLLECTIONS.users, user.uid, COLLECTIONS.preferences, COLLECTIONS.preferencesDoc), { photoURL: image, updatedAt: Date.now() }, { merge: true });
            }
          } catch (error) {
            console.error('Error saving photo', error);
          }
          setIsUploading(false);
          showToast(t.uploadPhoto, 'success');
        };
        reader.readAsDataURL(file);
      }, 1000);
    }
  };

  const handleCancelSubscription = () => {
    onTogglePro(); 
    setShowManageModal(false);
    showToast(t.subscriptionCanceled, 'success');
  };

  const handleSaveKey = () => {
    if (keyInput.length < 4) {
      showToast("La clave debe tener al menos 4 caracteres", 'error');
      return;
    }
    setEncryptionKey(keyInput);
    setHasKey(true);
    setKeyInput("");
    setShowSecurityModal(false);
    showToast("Clave guardada. Tus datos futuros se encriptarán.", 'success');
  };

  const handleClearKey = () => {
    setEncryptionKey("");
    setHasKey(false);
    setShowSecurityModal(false);
    showToast("Clave eliminada del dispositivo.", 'warning');
  };

  const handleAddSharedUser = async () => {
    if (shareEmail && shareEmail.includes('@') && db && user) {
      const normalizedEmail = shareEmail.trim().toLowerCase();
      
      // Check if already added (case insensitive check)
      if (!sharedUsers.some(u => u.toLowerCase() === normalizedEmail)) {
        setIsSearchingUser(true);
        
        try {
            const createPendingInvite = async () => {
              await addDoc(collection(db, COLLECTIONS.pendingInvites), {
                toEmail: normalizedEmail,
                fromUid: user.uid,
                fromName: user.displayName || 'Usuario',
                fromEmail: user.email || '',
                createdAt: Date.now()
              });
            };

            // 1. Write to local outgoing collection
            // Stores the entered email as the ID for easy lookup/deletion by email
            await setDoc(doc(db, COLLECTIONS.users, user.uid, COLLECTIONS.outgoing, normalizedEmail), {
                email: normalizedEmail,
                addedAt: Date.now()
            });

            // 2. RECIPROCAL WRITE
            
            // Step A: Check for Demo User
            let targetUid = DEMO_UID_MAP[normalizedEmail];
            let foundInPublic = false;
            
            // Step B: If not demo, try to find in 'public_emails' directory
            if (!targetUid) {
              try {
                const publicDoc = await getDoc(doc(db, COLLECTIONS.publicEmails, normalizedEmail));
                if (publicDoc.exists()) {
                  targetUid = publicDoc.data().uid;
                  foundInPublic = true;
                }
              } catch (e) {
                console.warn("Could not lookup public email:", e);
              }
            }

            // Step C: If user found, try direct write
            let reciprocalSuccess = false;
            if (targetUid) {
               try {
                   await setDoc(doc(db, COLLECTIONS.users, targetUid, COLLECTIONS.incoming, user.uid), {
                     ownerUid: user.uid,
                     displayName: user.displayName || 'Usuario',
                     email: user.email || '',
                     initial: (user.displayName || 'U')[0].toUpperCase()
                   });
                   reciprocalSuccess = true;
               } catch (reciprocalError) {
                   console.error("Reciprocal write failed (Permission?):", reciprocalError);
               }
            }
            
            setShareEmail("");
            setShowShareModal(false);

            // FEEDBACK LOGIC
            if (targetUid && reciprocalSuccess) {
                showToast(t.userAdded, 'success');
            } else if (targetUid && !reciprocalSuccess) {
                // Found but direct write blocked by rules (common when sharing from
                // demo user to a real user). Fallback to pending invite so the
                // recipient can be linked asynchronously.
                try {
                  await createPendingInvite();
                  showToast(t.invitationSent, 'success');
                  setTimeout(() => showToast(t.invitationSentDesc, 'success'), 2500);
                } catch (inviteError) {
                  console.error("Invite fallback creation failed:", inviteError);
                  showToast("Usuario agregado, pero falló el envío de invitación automática.", 'warning');
                }
            } else {
                // NOT FOUND (New User / Not Logged In) -> Create Pending Invitation
                try {
                  // Using addDoc allows Firestore to generate a safe ID, avoiding character issues with emails
                  await createPendingInvite();
                  showToast(t.invitationSent, 'success');
                  setTimeout(() => showToast(t.invitationSentDesc, 'success'), 2500);
                } catch (inviteError) {
                  console.error("Invite creation failed:", inviteError);
                  const code = (inviteError as { code?: string } | null)?.code;
                  if (code === 'permission-denied') {
                    if (onShowRules) onShowRules();
                    showToast("Error de permisos. Copia las reglas que aparecen en pantalla.", 'error');
                  } else {
                    showToast("Fallo al enviar la invitación.", 'error');
                  }
                }
            }

        } catch (error) {
            console.error("Error adding user:", error);
            showToast(t.error, 'error');
        } finally {
            setIsSearchingUser(false);
        }
      } else {
        showToast("Usuario ya agregado", 'error');
      }
    }
  };

  const handleRemoveSharedUser = async (email: string) => {
    if (!db || !user) return;
    const normalizedEmail = email.trim().toLowerCase();

    try {
        // 1. Remove from my 'outgoing' list
        await deleteDoc(doc(db, COLLECTIONS.users, user.uid, COLLECTIONS.outgoing, normalizedEmail));
        
        // 2. RECIPROCAL DELETE: Remove from recipient's 'incoming' list
        let recipientUid = DEMO_UID_MAP[normalizedEmail];
        
        // Try public lookup if not demo
        if (!recipientUid) {
           try {
              const publicDoc = await getDoc(doc(db, COLLECTIONS.publicEmails, normalizedEmail));
              if (publicDoc.exists()) recipientUid = publicDoc.data().uid;
           } catch(e) {}
        }
        
        if (recipientUid) {
            try {
                // Delete the document in the recipient's incoming_connections that corresponds to ME (sender UID)
                await deleteDoc(doc(db, COLLECTIONS.users, recipientUid, COLLECTIONS.incoming, user.uid));
            } catch (reciprocalError) {
                console.error("Reciprocal delete failed:", reciprocalError);
                // We don't block the UI if this fails
            }
        }

        showToast(t.userRemoved, 'success');
    } catch (e) {
        console.error("Revoke error:", e);
        showToast(t.error, 'error');
    }
  };

  const handleRemoveIncomingShare = async (ownerUid: string) => {
      if (!db || !user) return;
      try {
          // Removes the shared profile from "Shared With Me"
          await deleteDoc(doc(db, COLLECTIONS.users, user.uid, COLLECTIONS.incoming, ownerUid));
          showToast(t.incomingShareRemoved, 'success');
      } catch (e) {
          console.error("Error removing incoming share:", e);
          showToast(t.error, 'error');
      }
  };

  const handleSimulateIncomingShare = async () => {
    if (!db || !user) return;
    try {
      // 1. Write to My Incoming Connections (From Demo 1)
      await setDoc(doc(db, COLLECTIONS.users, user.uid, COLLECTIONS.incoming, DEMO_1_META.uid), {
         ownerUid: DEMO_1_META.uid,
         displayName: DEMO_1_META.displayName,
         email: DEMO_1_META.email,
         initial: DEMO_1_META.initial
      });

      // 2. Write to Demo 1 Outgoing Connections (To Me)
      if (user.email) {
          await setDoc(doc(db, COLLECTIONS.users, DEMO_1_META.uid, COLLECTIONS.outgoing, user.email.toLowerCase()), {
             email: user.email.toLowerCase(),
             addedAt: Date.now()
          });
      }

      showToast("Demo 1 ahora te comparte su perfil.", 'success');

    } catch (error) {
      console.error("Simulation failed:", error);
      const code = (error as { code?: string } | null)?.code;
      if (code === 'permission-denied') {
         if (onShowRules) onShowRules();
         showToast("Error de permisos. Copia las reglas que aparecen en pantalla.", 'error');
      } else {
         showToast("Error al simular compartir (Revisar Reglas Firestore)", 'error');
      }
    }
  };

  const handleViewSharedProfile = (share: IncomingConnection) => {
    if (share.ownerUid && onViewSharedProfile) {
        onViewSharedProfile(share.ownerUid, share.displayName || share.email || 'Usuario', share.email || '');
    }
  };

  // Check if current user is a real user (not a demo user) to show the simulation button
  const isRealUser = user.uid !== DEMO_1_META.uid && user.uid !== 'K9xL2vPq5mZ8jR3wT7nB4cE1aD6s';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans pb-10 transition-colors duration-300">
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
      
      {/* Manage Subscription Modal */}
      <Modal 
        isOpen={showManageModal} 
        title={t.manageSubscription} 
        onCancel={() => setShowManageModal(false)}
        onConfirm={handleCancelSubscription}
        confirmText={t.cancelSubscription}
        cancelText={t.keepSubscription}
      >
        <p className="text-slate-600 mb-2">{t.cancelSubscriptionDesc}</p>
      </Modal>

      {/* Security Info Modal (Explanation) */}
      <Modal
        isOpen={showSecurityInfoModal}
        title="Protección de Datos"
        onCancel={() => setShowSecurityInfoModal(false)}
        onConfirm={() => setShowSecurityInfoModal(false)}
        confirmText="Entendido"
        cancelText="Cerrar"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
             <Shield className="text-indigo-600 shrink-0 mt-1" size={24} />
             <div>
                <h4 className="font-bold text-indigo-900 text-sm mb-1">Tu Privacidad es Absoluta</h4>
                <p className="text-indigo-800/80 text-xs leading-relaxed">
                  Utilizamos una arquitectura de "Conocimiento Cero". Esto significa que tus datos son tuyos y de nadie más.
                </p>
             </div>
          </div>
          
          <ul className="space-y-3">
             <li className="flex gap-3 text-sm text-slate-600">
               <div className="bg-emerald-100 p-1 rounded-full shrink-0 h-fit mt-0.5"><Check size={12} className="text-emerald-700"/></div>
               <span><strong>Encriptación Local:</strong> Tus notas y audio se encriptan en tu dispositivo ANTES de enviarse a la nube usando tu Clave Personal.</span>
             </li>
             <li className="flex gap-3 text-sm text-slate-600">
               <div className="bg-emerald-100 p-1 rounded-full shrink-0 h-fit mt-0.5"><Check size={12} className="text-emerald-700"/></div>
               <span><strong>Solo tú tienes la llave:</strong> Nosotros no guardamos tu clave. Si la pierdes, la información es matemáticamente irrecuperable.</span>
             </li>
             <li className="flex gap-3 text-sm text-slate-600">
               <div className="bg-emerald-100 p-1 rounded-full shrink-0 h-fit mt-0.5"><Check size={12} className="text-emerald-700"/></div>
               <span><strong>Infraestructura Segura:</strong> Utilizamos Google Cloud y Firebase con los estándares de seguridad más altos del mercado.</span>
             </li>
          </ul>
        </div>
      </Modal>

      {/* Security Modal for Encryption Key Entry */}
      <Modal
        isOpen={showSecurityModal}
        title="Configurar Encriptación"
        onCancel={() => setShowSecurityModal(false)}
        onConfirm={handleSaveKey}
        confirmText="Guardar Clave"
        cancelText="Cancelar"
      >
        <div className="space-y-4">
          <p className="text-slate-600 text-sm">
            Ingresa una clave secreta. Tus datos sensibles (diario, audio, objetivos) se encriptarán en tu dispositivo antes de enviarse a la nube.
          </p>
          <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-2">
             <Info className="text-red-500 shrink-0 mt-0.5" size={16} />
             <p className="text-red-700 text-xs font-bold">Importante: Si pierdes esta clave, tus datos encriptados serán irrecuperables. Ni nosotros podemos ayudarte.</p>
          </div>
          <input 
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Tu clave secreta..."
            className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {hasKey && (
            <button 
              onClick={handleClearKey}
              className="text-red-500 text-xs font-bold underline hover:text-red-700"
            >
              Olvidar/Eliminar Clave de este dispositivo
            </button>
          )}
        </div>
      </Modal>

      {/* Sharing / User Search Modal (PRO ONLY) */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                   <UserPlus size={20} className="text-indigo-600"/> {t.shareTitle}
                </h3>
                <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><Trash2 size={20} className="hidden" />✕</button>
              </div>
              <p className="text-sm text-slate-500">{t.shareDesc}</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSharedUser()}
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end">
                 <button 
                  onClick={handleAddSharedUser}
                  disabled={!shareEmail || isSearchingUser}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSearchingUser ? <Loader2 size={18} className="animate-spin"/> : t.addUser}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CompanyHeader darkMode={false} onAuthClick={onAuthRequest} user={authUser} onProfileClick={onNavigateToProfile} language={language} onToggleLanguage={onToggleLanguage} isPro={isPro} onLogout={onLogout} />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors">
          <ArrowLeft size={20} />
          <span className="font-medium">{t.back}</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Profile Card */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
              <div className={`h-32 relative transition-colors ${isPro ? 'bg-gradient-to-r from-indigo-600 to-violet-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <div className="absolute -bottom-10 left-8">
                  <button
                    type="button"
                    onClick={handleImageClick}
                    aria-label={t.uploadPhoto}
                    className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full"
                  >
                    <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800 p-1 shadow-lg overflow-hidden relative transition-colors duration-300">
                      {isUploading ? (
                        <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center rounded-full animate-pulse">
                          <UploadCloud size={24} className="text-indigo-500" />
                        </div>
                      ) : avatar ? (
                        <img src={avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                          <UserIcon size={40} />
                        </div>
                      )}
                      
                      {/* Minimalist Plus Icon */}
                      <div className="absolute inset-0 bg-black/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {/* Hover overlay kept minimal */}
                      </div>
                    </div>
                    <div className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1.5 rounded-full shadow-md border-2 border-white dark:border-slate-800 group-hover:scale-110 transition-transform">
                      <Plus size={14} />
                    </div>
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
              </div>
              
              <div className="pt-12 px-8 pb-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{user.displayName || 'Usuario'}</h1>
                    <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <Mail size={14} /> {user.email}
                    </p>
                  </div>
                  {isPro ? (
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm border border-indigo-200/50 dark:border-indigo-700/50">
                      <Crown size={10} /> {t.proMember}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-600">
                      {t.freePlan}
                    </span>
                  )}
                </div>

                {/* Enhanced Stats Cards with higher contrast */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <ListChecks size={16} />
                      <span className="text-xs font-bold uppercase">Total Registros</span>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-white capitalize text-lg">{totalLogs}</p>
                  </div>
                  
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                        <Flame size={16} className="text-orange-500" />
                        <span className="text-xs font-bold uppercase">{t.currentStreak}</span>
                      </div>
                      <p className="font-bold text-2xl text-slate-800 dark:text-white">{streak} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{t.days}</span></p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                      <Activity size={20} />
                    </div>
                  </div>
                </div>

                {/* --- YEAR IN PIXELS ENTRY POINT --- */}
                <div className="mt-4">
                    <button 
                      onClick={onNavigateToYearPixels}
                      className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white p-4 rounded-xl shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <Grid size={24} className="text-white" />
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold">{t.yearInPixels}</h4>
                                <p className="text-xs text-fuchsia-100 opacity-90">{t.moodHeatmap}</p>
                            </div>
                        </div>
                        <div className="bg-white/20 rounded-full p-1 group-hover:bg-white/30 transition-colors">
                            <ArrowLeft size={20} className="rotate-180" />
                        </div>
                    </button>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Award size={14} /> {t.focusAreas}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {['Productividad', 'Mindfulness', 'Deporte', 'Lectura', 'Biohacking'].map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                        <Tag size={10} /> {tag}
                      </span>
                    ))}
                    <button className="px-3 py-1 border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 rounded-lg text-xs font-medium hover:text-indigo-500 hover:border-indigo-300 transition-colors">+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy & Sharing Section - NOW CONNECTED TO FIREBASE */}
            <div className={`rounded-2xl shadow-sm border p-6 transition-all relative overflow-hidden ${isPro ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
               <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-2">
                   <Shield className={isPro ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} size={20} />
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.privacy}</h3>
                   {isPro && (
                     <button 
                       onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
                       className="ml-2 text-slate-400 hover:text-indigo-600 transition-colors"
                       title="Información importante"
                     >
                       <Info size={18} />
                     </button>
                   )}
                 </div>
                 {!isPro && <Lock size={20} className="text-slate-400" />}
               </div>

               {!isPro ? (
                 <div className="text-center py-6">
                   <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
                     <Lock size={32} />
                   </div>
                   <h4 className="font-bold text-slate-800 dark:text-white mb-2">{t.privacyLocked}</h4>
                   <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">{t.privacyLockedDesc}</p>
                   <button 
                    onClick={onTogglePro}
                    className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white text-sm font-bold rounded-full hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors shadow-lg hover:shadow-xl"
                   >
                     {t.upgradeToPro}
                   </button>
                 </div>
               ) : (
                 <div className="space-y-4">
                   {showPrivacyInfo && (
                     <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-xl text-xs font-medium leading-relaxed mb-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-2">
                          <Info size={16} className="shrink-0 mt-0.5" />
                          <p>{t.privacyInfoWarning}</p>
                        </div>
                     </div>
                   )}
                   
                   <div className="flex items-center justify-between mb-2 pt-2">
                     <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.sharedWith}</h4>
                     <span className="bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{sharedUsers.length}</span>
                   </div>

                   {sharedUsers.length === 0 ? (
                     <div className="p-4 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl text-center">
                       <p className="text-sm text-slate-400 italic mb-2">{t.noSharedUsers}</p>
                     </div>
                   ) : (
                     <div className="space-y-3">
                       {sharedUsers.map(u => (
                          <div key={u} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 group hover:border-indigo-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                                {u[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{u}</span>
                            </div>
                            <button onClick={() => handleRemoveSharedUser(u)} className="text-slate-300 hover:text-red-500 p-2 transition-colors" title={t.stopSharing}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                     </div>
                   )}

                   <button 
                     onClick={() => setShowShareModal(true)}
                     className="w-full mt-2 py-3 border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-xl font-medium hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2"
                   >
                     <UserPlus size={18} />
                     {t.addUser}
                   </button>
                 </div>
               )}
            </div>

            {/* Subscription Details */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 transition-colors duration-300">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <CreditCard className="text-indigo-600 dark:text-indigo-400" size={20} />
                {t.subscription}
              </h3>
              
              {isPro ? (
                <div className="flex flex-col sm:flex-row justify-between items-center bg-gradient-to-br from-slate-900 to-slate-800 dark:from-indigo-900 dark:to-slate-900 rounded-xl p-6 text-white shadow-lg animate-in fade-in">
                  <div className="mb-4 sm:mb-0">
                    <p className="text-indigo-300 text-xs font-bold uppercase mb-1">{t.currentPlan}</p>
                    <h4 className="text-2xl font-bold">Surreal Horizons Pro</h4>
                    <p className="text-slate-400 text-sm mt-1">Next: 15 Dec 2025</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold">$9<span className="text-lg text-slate-400">/mo</span></span>
                    <button 
                      onClick={() => setShowManageModal(true)}
                      className="block mt-2 text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors border border-white/10 w-full"
                    >
                      {t.manage}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-slate-800 dark:text-white animate-in fade-in">
                  <div className="mb-4 sm:mb-0 space-y-2">
                    <div>
                      <p className="text-slate-400 text-xs font-bold uppercase mb-1">{t.currentPlan}</p>
                      <h4 className="text-2xl font-bold text-slate-700 dark:text-slate-200">{t.freePlan}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <CheckCircle size={14} className="text-green-500" />
                      {t.proFeatures}
                    </div>
                  </div>
                  <div className="text-right">
                    <button 
                      onClick={onTogglePro} 
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 active:scale-95 transition-all"
                    >
                      <Crown size={18} />
                      {t.upgradeToPro}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Settings & Shared With Me */}
          <div className="space-y-6">
            
            {/* 1. SETTINGS COMPONENT */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Settings size={16} /> {t.settings}
              </h3>
              
              <div className="space-y-3">
                
                {/* Security Settings Row with separate Info Button */}
                <div className="flex items-center gap-2 w-full">
                  <button 
                    onClick={() => setShowSecurityModal(true)}
                    className="flex-1 flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group border border-transparent hover:border-slate-100 dark:hover:border-slate-600"
                  >
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                      <Key size={18} />
                      <span className="text-sm font-medium">Seguridad & Encriptación</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${hasKey ? 'bg-green-500 shadow-md' : 'bg-slate-200 dark:bg-slate-600'}`}></div>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowSecurityInfoModal(true); }}
                    className="p-3 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900"
                    title="Cómo protegemos tus datos"
                  >
                    <Info size={18} />
                  </button>
                </div>

                <button 
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
                >
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                    <Bell size={18} />
                    <span className="text-sm font-medium">{t.notifications}</span>
                  </div>
                  {/* Notifications Toggle */}
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${notificationsEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                </button>
                
                {/* Theme Selector */}
                <div className="relative">
                  <button 
                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                      <Monitor size={18} />
                      <span className="text-sm font-medium">{t.theme}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded capitalize">
                        {THEMES.find(th => th.code === theme)?.labelKey ? t.themes[THEMES.find(th => th.code === theme)!.labelKey] : 'System'}
                      </span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showThemeMenu ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {showThemeMenu && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                      {THEMES.map(th => (
                        <button
                          key={th.code}
                          onClick={() => {
                            onSetTheme(th.code);
                            setShowThemeMenu(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${theme === th.code ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-300'}`}
                        >
                          <div className="flex items-center gap-2">
                             <th.icon size={16} />
                             <span>{t.themes[th.labelKey]}</span>
                          </div>
                          {theme === th.code && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Aesthetic Language Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                      <Globe size={18} />
                      <span className="text-sm font-medium">{t.language}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded capitalize">
                        {LANGUAGES.find(l => l.code === language)?.label}
                      </span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showLanguageMenu ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {showLanguageMenu && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="max-h-60 overflow-y-auto">
                        {LANGUAGES.map(l => (
                          <button
                            key={l.code}
                            onClick={() => {
                              onToggleLanguage(l.code);
                              setShowLanguageMenu(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-sm flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${language === l.code ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-300'}`}
                          >
                            <span>{l.label}</span>
                            {language === l.code && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. SHARED WITH ME COMPONENT (Connected to Firebase) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={16} /> {t.sharedWithMe}
              </h3>

              {isLoadingConnections ? (
                <div className="text-center py-4 text-slate-400">
                    <Loader2 size={20} className="animate-spin mx-auto"/>
                </div>
              ) : incomingShares.length === 0 ? (
                <div className="text-center py-4 text-slate-400">
                  <p className="text-xs">{t.noIncomingShares}</p>
                  
                  {/* Simulate Demo Share Button - Only visible for Real Users (not Demos) */}
                  {isRealUser && (
                    <button 
                      onClick={handleSimulateIncomingShare}
                      className="mt-3 flex items-center gap-1 mx-auto text-[10px] text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-400 hover:underline transition-all"
                    >
                      <Link2 size={12} /> {t.simulateIncomingShare}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 mb-2">{t.sharedWithMeDesc}</p>
                  {incomingShares.map((share, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 group hover:border-indigo-100 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex-shrink-0 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                          {share.initial || share.displayName?.[0]}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{share.displayName || 'Usuario'}</span>
                          <span className="text-[10px] text-slate-400 truncate">{share.email}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                          <button 
                            onClick={() => handleViewSharedProfile(share)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" 
                            title={t.viewProfile}
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleRemoveIncomingShare(share.ownerUid)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" 
                            title={t.stopViewing}
                          >
                            <Trash2 size={16} />
                          </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Also show simulate button if list is not empty but user wants to re-trigger */}
                  {isRealUser && !incomingShares.some(s => s.ownerUid === DEMO_1_META.uid) && (
                    <button 
                      onClick={handleSimulateIncomingShare}
                      className="w-full pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 flex justify-center items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-600 transition-all"
                    >
                      <Link2 size={10} /> {t.simulateIncomingShare}
                    </button>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => auth && signOut(auth)}
              className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-2xl text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-all shadow-sm"
            >
              <LogOut size={18} /> {t.logout}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserProfile;
