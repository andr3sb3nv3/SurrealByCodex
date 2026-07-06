import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, ArrowLeft, ChevronDown, BookOpen, Calendar, EyeOff, LogOut } from 'lucide-react';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import CompanyHeader from '../components/CompanyHeader';
import { getMonthName, formatDateFriendly } from '../utils/dateUtils';
import { ReflectionsProps, DailyLog } from '../types';
import { TRANSLATIONS } from '../translations';

const MonthlyReflections: React.FC<ReflectionsProps> = ({
  onBack, user, authUser, onAuthRequest, onNavigateToProfile,
  language, onToggleLanguage, isPro, onTogglePro,
  readOnly, viewingFriendName, onExitSharedView, onLogout
}) => {
  const [rawData, setRawData] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  const t = TRANSLATIONS[language];

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchHistory = async () => {
      setLoading(true);
      try {
        if (!db) throw new Error("No db");
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'daily_logs'));
        const historyData: DailyLog[] = [];
        snapshot.forEach(doc => historyData.push(doc.data() as DailyLog));
        historyData.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        setRawData(historyData);
        const months = [...new Set(historyData.map(d => getMonthName(d.fecha, language)))];
        setAvailableMonths(months);
        if (months.length > 0) setSelectedMonth(months[months.length - 1]);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchHistory();
  }, [user, language]);

  const filteredData = useMemo(() => {
    if (!selectedMonth) return [];
    return rawData.filter(d => getMonthName(d.fecha, language) === selectedMonth);
  }, [rawData, selectedMonth, language]);

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-3"><Loader2 className="animate-spin text-indigo-600"/> {t.loading}</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans pb-10 transition-colors duration-300">
      <CompanyHeader onAuthClick={onAuthRequest} user={authUser} onProfileClick={onNavigateToProfile} language={language} onToggleLanguage={onToggleLanguage} isPro={isPro} onLogout={onLogout} />
      
      {/* READ ONLY BANNER */}
      {readOnly && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-4 py-3 sticky top-[73px] z-30 backdrop-blur-md">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm font-bold">
              <EyeOff size={16} />
              <span>{t.viewingProfileOf} {viewingFriendName} ({t.readOnlyMode})</span>
            </div>
            <button 
              onClick={onExitSharedView}
              className="flex items-center gap-2 bg-amber-200/50 hover:bg-amber-200 dark:bg-amber-700/50 dark:hover:bg-amber-700 px-3 py-1 rounded-full text-xs font-bold transition-colors"
            >
              <LogOut size={12} /> {t.exitSharedView}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"><ArrowLeft size={24} /></button>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t.viewComments}</h1>
          </div>
          {availableMonths.length > 0 && (
            <div className="relative group w-full md:w-auto">
              <select value={selectedMonth || ''} onChange={(e) => setSelectedMonth(e.target.value)} className="appearance-none w-full md:w-48 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 pl-4 pr-10 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer capitalize">
                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {filteredData.length === 0 ? (
            <div className="text-center py-20 text-slate-400"><BookOpen size={48} className="mx-auto mb-4 opacity-30"/><p>No hay reflexiones para este mes.</p></div>
          ) : (
            filteredData.map((entry, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg"><Calendar size={18} /></div>
                  <h3 className="font-bold text-slate-900 dark:text-white capitalize">{formatDateFriendly(entry.fecha, language)}</h3>
                </div>
                <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {entry.reflexion ? <p>"{entry.reflexion}"</p> : <p className="text-slate-400 italic text-sm">Sin comentarios registrados.</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyReflections;