import React, { useState, useEffect } from 'react';
import { 
  Zap, Plus, Trash2, Calendar, 
  ChevronRight, AlertCircle, CheckCircle2,
  Timer
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { DetoxChallenge, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface DetoxTrackerProps {
  user: { uid: string } | null;
  language: Language;
  readOnly?: boolean;
}

const DetoxTracker: React.FC<DetoxTrackerProps> = ({ user, language, readOnly }) => {
  const t = TRANSLATIONS[language];
  const [challenges, setChallenges] = useState<DetoxChallenge[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDays, setNewDays] = useState(90);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setIsLoading(false);
      return;
    }

    const detoxRef = doc(db, 'users', user.uid, 'detox', 'current');
    
    const unsubscribe = onSnapshot(detoxRef, (docSnap) => {
      if (docSnap.exists()) {
        setChallenges(docSnap.data().challenges || []);
      } else {
        setChallenges([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading detox challenges:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const saveChallenges = async (updatedChallenges: DetoxChallenge[]) => {
    if (!user || !db || readOnly) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'detox', 'current'), {
        challenges: updatedChallenges,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error("Error saving detox challenges:", error);
    }
  };

  const handleAddChallenge = () => {
    if (!newTitle.trim() || newDays <= 0) return;
    
    const newChallenge: DetoxChallenge = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      totalDays: newDays,
      startDate: new Date().toISOString().split('T')[0],
      isActive: true
    };

    const updated = [...challenges, newChallenge];
    setChallenges(updated);
    saveChallenges(updated);
    setNewTitle('');
    setNewDays(90);
    setIsAdding(false);
  };

  const handleDeleteChallenge = (id: string) => {
    if (readOnly) return;
    const updated = challenges.filter(c => c.id !== id);
    setChallenges(updated);
    saveChallenges(updated);
  };

  const calculateRemaining = (challenge: DetoxChallenge) => {
    const start = new Date(challenge.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const remaining = challenge.totalDays - diffDays;
    return Math.max(0, remaining);
  };

  if (isLoading) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
          <Zap className="text-sky-500" /> 
          {t.detoxTitle}
        </h2>
        {!readOnly && (
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors px-3 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg flex items-center gap-1"
          >
            {isAdding ? t.aiCoach.close : <Plus size={18} />}
          </button>
        )}
      </div>

      {isAdding && !readOnly && (
        <div className="mb-6 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-800 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-sky-700 dark:text-sky-400 uppercase mb-1">
                {t.detoxNameLabel}
              </label>
              <input 
                type="text" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t.detoxPlaceholder}
                className="w-full p-2 border border-sky-200 dark:border-sky-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-sky-700 dark:text-sky-400 uppercase mb-1">
                  {t.detoxDaysLabel}
                </label>
                <input 
                  type="number" 
                  value={newDays}
                  onChange={(e) => setNewDays(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-sky-200 dark:border-sky-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <button 
                onClick={handleAddChallenge}
                disabled={!newTitle.trim()}
                className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 font-bold text-sm shadow-sm"
              >
                {t.detoxStartBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {challenges.length === 0 && !isAdding && (
          <div className="text-center py-6 bg-slate-50 dark:bg-slate-700/20 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400 text-sm italic">
              {t.detoxEmpty}
            </p>
          </div>
        )}

        {challenges.map(challenge => {
          const remaining = calculateRemaining(challenge);
          const progress = Math.min(100, Math.max(0, ((challenge.totalDays - remaining) / challenge.totalDays) * 100));
          const isFinished = remaining === 0;

          return (
            <div key={challenge.id} className="relative group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-sky-300 dark:hover:border-sky-600 transition-all shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isFinished ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'}`}>
                    {isFinished ? <CheckCircle2 size={20} /> : <Timer size={20} />}
                  </div>
                  <div>
                    <h3 className={`font-bold text-slate-800 dark:text-slate-200 ${isFinished ? 'line-through opacity-50' : ''}`}>
                      {challenge.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">
                      {language === 'es' ? 'Desde: ' : 'Since: '} {challenge.startDate}
                    </p>
                  </div>
                </div>
                {!readOnly && (
                  <button 
                    onClick={() => handleDeleteChallenge(challenge.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-end justify-between gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter mb-1">
                    <span className="text-slate-400 dark:text-slate-500">
                      {isFinished ? (language === 'es' ? '¡COMPLETADO!' : 'COMPLETED!') : (language === 'es' ? 'PROGRESO' : 'PROGRESS')}
                    </span>
                    <span className={isFinished ? 'text-green-600 dark:text-green-400' : 'text-sky-600 dark:text-sky-400'}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${isFinished ? 'bg-green-500' : 'bg-sky-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                
                <div className="text-right">
                  <span className={`text-3xl font-black leading-none ${isFinished ? 'text-green-600 dark:text-green-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {remaining}
                  </span>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none mt-1">
                    {t.detoxRemaining}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DetoxTracker;
