import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { YearInPixelsProps, DailyLog } from '../types';
import { TRANSLATIONS } from '../translations';

const YearInPixels: React.FC<YearInPixelsProps> = ({ 
  onBack, user, language
}) => {
  const [rawData, setRawData] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const t = TRANSLATIONS[language];

  // Helper: Get color based on mood value (1-10).
  // Soporta también valores legacy en escala 0-100.
  const getMoodColor = (val: number | undefined): string => {
    if (val === undefined || val === null) return 'bg-transparent text-slate-800 dark:text-slate-200';
    const v = val > 10 ? val / 10 : val;
    if (v <= 2) return 'bg-red-500 text-white';
    if (v <= 4) return 'bg-orange-400 text-white';
    if (v <= 6) return 'bg-yellow-400 text-slate-900';
    if (v <= 8) return 'bg-emerald-400 text-white';
    return 'bg-fuchsia-500 text-white';
  };

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
        setRawData(historyData);
      } catch (error) { 
          console.error(error); 
      } finally { 
          setLoading(false); 
      }
    };
    fetchHistory();
  }, [user]);

  // Transform data into a lookup map: "YYYY-MM-DD" -> Mood Value
  const dataMap = useMemo(() => {
    const map: Record<string, DailyLog> = {};
    rawData.forEach(log => {
        map[log.fecha] = log;
    });
    return map;
  }, [rawData]);

  // Generate Month Data
  const months = useMemo(() => {
     // Configurar local para nombres de mes
     const monthFormatter = new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', { month: 'long' });
     const weekDayFormatter = new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'narrow' });

     // Generate weekdays headers (L M M J V S D)
     // Start from a known Monday: 2024-01-01 was a Monday
     const weekDays = Array.from({length: 7}, (_, i) => {
        const d = new Date(2024, 0, i + 1);
        return weekDayFormatter.format(d).charAt(0).toUpperCase();
     });

     return Array.from({length: 12}, (_, i) => {
         const date = new Date(selectedYear, i, 1);
         const daysInMonth = new Date(selectedYear, i + 1, 0).getDate();
         
         // Calculate padding days. 
         // JS getDay(): 0=Sun, 1=Mon... 6=Sat.
         // We want grid to start Monday (0) to Sunday (6).
         // So: Mon(1)->0, Tue(2)->1 ... Sun(0)->6
         let startDayIndex = date.getDay() - 1;
         if (startDayIndex === -1) startDayIndex = 6;

         return {
             index: i,
             name: monthFormatter.format(date), // "Enero"
             daysInMonth,
             startPadding: startDayIndex,
             weekDays
         };
     });
  }, [selectedYear, language]);

  if (loading) return <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center gap-3"><Loader2 className="animate-spin text-red-500"/></div>;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans px-2 py-4 flex flex-col h-full transition-colors duration-300">
      
      {/* Header Minimalista Apple Style */}
      <div className="flex items-center justify-between mb-6 px-2">
        <button 
          onClick={onBack} 
          className="flex items-center gap-1 text-red-500 font-medium hover:opacity-80 transition-opacity"
        >
            <ArrowLeft size={22} />
            <span className="text-sm">Atrás</span> 
        </button>

        <div className="flex items-center gap-4">
           <button onClick={() => setSelectedYear(y => y - 1)} className="text-slate-300 hover:text-red-500 transition-colors"><ChevronLeft size={20}/></button>
           <h1 className="text-3xl font-bold text-red-500 tracking-tight">{selectedYear}</h1>
           <button onClick={() => setSelectedYear(y => y + 1)} disabled={selectedYear >= new Date().getFullYear()} className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-0"><ChevronRight size={20}/></button>
        </div>
        
        {/* Spacer to balance header */}
        <div className="w-12"></div>
      </div>

      {/* Main Grid: 3 Columns for Apple Year View Style */}
      <div className="grid grid-cols-3 gap-x-1 gap-y-6 md:gap-x-4 md:gap-y-10 max-w-4xl mx-auto w-full flex-1 overflow-y-auto">
        {months.map((month) => (
          <div key={month.index} className="flex flex-col">
            
            {/* Month Name */}
            <h3 className="text-[13px] md:text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 capitalize pl-1">
              {month.name}
            </h3>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-y-[2px] gap-x-0">
              
              {/* Empty slots for start padding */}
              {Array.from({ length: month.startPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="h-4 w-full"></div>
              ))}

              {/* Days */}
              {Array.from({ length: month.daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${selectedYear}-${String(month.index + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const log = dataMap[dateKey];
                const mood = log?.estado_animo;
                const colorClass = getMoodColor(mood);
                
                return (
                  <div key={dayNum} className="flex items-center justify-center h-4 md:h-6">
                    <div 
                      className={`
                        w-[18px] h-[18px] md:w-6 md:h-6 rounded-full flex items-center justify-center text-[8px] md:text-[10px] font-semibold leading-none
                        ${colorClass}
                      `}
                    >
                      {dayNum}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Legend */}
      <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center gap-3 flex-wrap bg-white dark:bg-slate-900 sticky bottom-0">
          {[
              { label: t.legend.terrible, color: 'bg-red-500' },
              { label: t.legend.bad, color: 'bg-orange-400' },
              { label: t.legend.neutral, color: 'bg-yellow-400' },
              { label: t.legend.good, color: 'bg-emerald-400' },
              { label: t.legend.excellent, color: 'bg-fuchsia-500' },
          ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium uppercase">{item.label}</span>
              </div>
          ))}
      </div>

    </div>
  );
};

export default YearInPixels;