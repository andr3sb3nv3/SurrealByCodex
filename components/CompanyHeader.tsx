import React, { useEffect, useRef, useState } from 'react';
import { Activity, LogOut, Camera } from 'lucide-react';
import { User, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { db } from '../services/firebase';

interface CompanyHeaderProps {
  darkMode?: boolean; // Deprecated but kept for compatibility
  onAuthClick: () => void;
  user: User | null;
  onProfileClick?: () => void;
  language: Language;
  onToggleLanguage: (lang: Language) => void;
  isPro?: boolean;
  onLogout?: () => void;
}

const CompanyHeader: React.FC<CompanyHeaderProps> = ({ onAuthClick, user, onProfileClick, language, isPro = false, onLogout }) => {
  const t = TRANSLATIONS[language];
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.photoURL ?? null);

  useEffect(() => {
    setAvatarPreview(user?.photoURL ?? null);
  }, [user?.photoURL]);

  const handlePickAvatar = () => fileRef.current?.click();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const image = reader.result as string;
      setAvatarPreview(image);
      try {
        await updateProfile(user, { photoURL: image });
        if (db) {
          await setDoc(doc(db, 'users', user.uid), { photoURL: image }, { merge: true });
          await setDoc(doc(db, 'users', user.uid, 'user_settings', 'preferences'), { photoURL: image, updatedAt: Date.now() }, { merge: true });
        }
      } catch (err) {
        console.error('Error actualizando avatar', err);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full py-4 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
        {/* Logo & Company Name */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Surreal Horizons</h1>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500">{t.platformName}</p>
          </div>
        </div>

        {/* Login / Sign In / User Profile */}
        <div className="flex items-center gap-3">
          {user && !user.isAnonymous ? (
            <div className="flex items-center gap-1 pl-1.5 pr-1.5 py-1.5 rounded-full border transition-all border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              
              {/* Clickable Profile Area */}
              <button 
                onClick={onProfileClick}
                className="flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 px-2 py-1 rounded-full transition-colors"
              >
                <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md overflow-hidden ${isPro ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-slate-400'}`}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.displayName ? user.displayName[0].toUpperCase() : 'U'}</span>
                  )}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-xs font-bold leading-none">{user.displayName || 'Usuario'}</span>
                  {isPro && <span className="text-[10px] opacity-70 leading-none mt-0.5">{t.proMember}</span>}
                </div>
              </button>

              <button
                type="button"
                onClick={handlePickAvatar}
                className="text-xs hover:text-indigo-500 transition-colors p-2 rounded-full hover:bg-indigo-500/10"
                title={t.uploadPhoto}
              >
                <Camera size={16} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />

              <div className="h-4 w-[1px] bg-current opacity-20 mx-1"></div>
              
              <button
                onClick={() => onLogout?.()}
                className="text-xs hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-500/10"
                title={t.logout}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={onAuthClick}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-md transition-all hover:shadow-lg active:scale-95 hover:translate-y-[-1px] bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>{t.login}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyHeader;
