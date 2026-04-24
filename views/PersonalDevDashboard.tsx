import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, BarChart2, ChevronDown, Sparkles, Loader2, Database,
  Smile, Zap, Users, Flame, Brain, Scale, Moon, TrendingUp, MessageSquare, Dumbbell, EyeOff, LogOut, AlertCircle, Play, Pause, Check, Bot, Lightbulb, Quote, Target, X, FileText, Calendar, History, Activity, Trash2
} from 'lucide-react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { getDocs, collection, doc, getDoc } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { db } from '../services/firebase';
import CompanyHeader from '../components/CompanyHeader';
import Card from '../components/ui/Card';
import HistoricalMetricView from '../components/HistoricalMetricView';
import { getMonthName, formatDateFriendly } from '../utils/dateUtils';
import { DashboardProps, DailyLog } from '../types';
import { seedDemoUsers, clearTargetedDemoUserData } from '../utils/seedDemoData';
import { TRANSLATIONS } from '../translations';
import Toast from '../components/ui/Toast';
import { useToast } from '../utils/useToast';

interface AICoachResponse {
  tactics: string[];
  psychologicalTip: string;
  quote: string;
}

type BaseMetricField =
  | 'estado_animo'
  | 'nivel_energia'
  | 'nivel_deporte'
  | 'calidad_sueno'
  | 'social_confort'
  | 'nivel_motivacion'
  | 'nivel_concentracion'
  | 'regulacion_emocional';

type DashboardDataPoint = DailyLog & Record<string, string | number | undefined>;

const PersonalDevDashboard: React.FC<DashboardProps> = ({
  onBack, user, authUser, onNavigateToComments, onNavigateToClinicalMetrics, onAuthRequest, onNavigateToProfile,
  language, onToggleLanguage, isPro, onTogglePro, theme,
  readOnly, viewingFriendName, onExitSharedView, onLogout
}) => {
  const [rawData, setRawData] = useState<DashboardDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [permissionError, setPermissionError] = useState(false);
  const [historicalOpen, setHistoricalOpen] = useState(false);
  const [historicalInitialKey, setHistoricalInitialKey] = useState<string | undefined>(undefined);
  const { toast, showToast, clearToast } = useToast();
  
  // Audio Playback State
  const [activeAudioKey, setActiveAudioKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Chart Visibility State (Dynamic keys)
  const [visibleChartKeys, setVisibleChartKeys] = useState<Set<string>>(new Set());

  // AI Coach State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AICoachResponse | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Dynamic Theme Detection for Charts
  const [isChartDark, setIsChartDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsChartDark(isDark);
    };
    checkTheme();
    
    // Listener for system changes if needed
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => checkTheme();
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);

  const chartColors = useMemo(() => ({
    grid: isChartDark ? "#334155" : "#e2e8f0",
    text: isChartDark ? "#94a3b8" : "#64748b",
    tooltipBg: isChartDark ? "#1e293b" : "#ffffff",
    tooltipBorder: isChartDark ? "#334155" : "#e2e8f0",
    tooltipText: isChartDark ? "#f1f5f9" : "#0f172a"
  }), [isChartDark]);

  const t = TRANSLATIONS[language];

  type ClinicalMetricSeed = {
    key: string;
    collectionName: string;
    sourceField: string;
    toScale10: (value: number) => number;
    labelEs: string;
    labelEn: string;
    color: string;
    tailwindText: string;
    tailwindBg: string;
    tailwindBorder: string;
    gradId: string;
  };

  const CLINICAL_METRIC_SEEDS: ClinicalMetricSeed[] = useMemo(() => ([
    { key: 'clin_anxiety', collectionName: 'deepClinicalLogsAnxiety', sourceField: 'generalAnxiety', toScale10: (v) => v > 10 ? v / 10 : v, labelEs: 'Ansiedad', labelEn: 'Anxiety', color: '#f97316', tailwindText: 'text-orange-500', tailwindBg: 'bg-orange-500/10', tailwindBorder: 'border-orange-500/50', gradId: 'cClinAnxiety' },
    { key: 'clin_depression', collectionName: 'deepClinicalLogsDepression', sourceField: 'moodIntensity', toScale10: (v) => v, labelEs: 'Depresión', labelEn: 'Depression', color: '#0ea5e9', tailwindText: 'text-sky-500', tailwindBg: 'bg-sky-500/10', tailwindBorder: 'border-sky-500/50', gradId: 'cClinDepression' },
    { key: 'clin_bipolar', collectionName: 'deepClinicalLogsBipolar', sourceField: 'globalMood', toScale10: (v) => v + 5, labelEs: 'Bipolar', labelEn: 'Bipolar', color: '#8b5cf6', tailwindText: 'text-violet-500', tailwindBg: 'bg-violet-500/10', tailwindBorder: 'border-violet-500/50', gradId: 'cClinBipolar' },
    { key: 'clin_ocd', collectionName: 'deepClinicalLogsOCD', sourceField: 'obsessionIntensity', toScale10: (v) => v > 10 ? v / 10 : v, labelEs: 'TOC', labelEn: 'OCD', color: '#10b981', tailwindText: 'text-emerald-500', tailwindBg: 'bg-emerald-500/10', tailwindBorder: 'border-emerald-500/50', gradId: 'cClinOCD' },
    { key: 'clin_trauma', collectionName: 'deepClinicalLogsTrauma', sourceField: 'hypervigilanceLevel', toScale10: (v) => v, labelEs: 'Trauma', labelEn: 'Trauma', color: '#64748b', tailwindText: 'text-slate-500', tailwindBg: 'bg-slate-500/10', tailwindBorder: 'border-slate-500/50', gradId: 'cClinTrauma' },
    { key: 'clin_sleep', collectionName: 'deepClinicalLogsSleep', sourceField: 'sleepQuality', toScale10: (v) => v * 2, labelEs: 'Sueño Clínico', labelEn: 'Clinical Sleep', color: '#6366f1', tailwindText: 'text-indigo-500', tailwindBg: 'bg-indigo-500/10', tailwindBorder: 'border-indigo-500/50', gradId: 'cClinSleep' },
    { key: 'clin_personality', collectionName: 'deepClinicalLogsPersonality', sourceField: 'emotionalStability', toScale10: (v) => v, labelEs: 'Personalidad', labelEn: 'Personality', color: '#e11d48', tailwindText: 'text-rose-500', tailwindBg: 'bg-rose-500/10', tailwindBorder: 'border-rose-500/50', gradId: 'cClinPersonality' },
    { key: 'clin_adhd', collectionName: 'deepClinicalLogsADHD', sourceField: 'focusLevel', toScale10: (v) => v, labelEs: 'TDAH', labelEn: 'ADHD', color: '#eab308', tailwindText: 'text-yellow-500', tailwindBg: 'bg-yellow-500/10', tailwindBorder: 'border-yellow-500/50', gradId: 'cClinADHD' },
    { key: 'clin_substance', collectionName: 'deepClinicalLogsSubstance', sourceField: 'cravingIntensity', toScale10: (v) => v, labelEs: 'Consumo', labelEn: 'Substance', color: '#f59e0b', tailwindText: 'text-amber-500', tailwindBg: 'bg-amber-500/10', tailwindBorder: 'border-amber-500/50', gradId: 'cClinSubstance' },
    { key: 'clin_psychotic', collectionName: 'deepClinicalLogsSchizophrenia', sourceField: 'stressLevel', toScale10: (v) => v * 2, labelEs: 'Psicótico', labelEn: 'Psychotic', color: '#a855f7', tailwindText: 'text-purple-500', tailwindBg: 'bg-purple-500/10', tailwindBorder: 'border-purple-500/50', gradId: 'cClinPsychotic' },
  ]), []);

  // CONFIGURATION MAPPING
  const METRIC_CONFIG = useMemo(() => [
    { key: 'mood', dbField: 'estado_animo', label: t.stats.mood, icon: Smile, color: '#f472b6', tailwindText: 'text-pink-500', tailwindBg: 'bg-pink-500/10', tailwindBorder: 'border-pink-500/50', gradId: 'cMood' },
    { key: 'energy', dbField: 'nivel_energia', label: t.stats.energy, icon: Zap, color: '#fbbf24', tailwindText: 'text-amber-500', tailwindBg: 'bg-amber-500/10', tailwindBorder: 'border-amber-500/50', gradId: 'cEnergy' },
    { key: 'sport', dbField: 'nivel_deporte', label: t.stats.sport, icon: Dumbbell, color: '#34d399', tailwindText: 'text-emerald-500', tailwindBg: 'bg-emerald-500/10', tailwindBorder: 'border-emerald-500/50', gradId: 'cSport' },
    { key: 'social', dbField: 'social_confort', label: t.stats.social, icon: Users, color: '#2dd4bf', tailwindText: 'text-teal-500', tailwindBg: 'bg-teal-500/10', tailwindBorder: 'border-teal-500/50', gradId: 'cSocial' },
    { key: 'motivation', dbField: 'nivel_motivacion', label: t.stats.motiv, icon: Flame, color: '#fb923c', tailwindText: 'text-orange-500', tailwindBg: 'bg-orange-500/10', tailwindBorder: 'border-orange-500/50', gradId: 'cMotiv' },
    { key: 'focus', dbField: 'nivel_concentracion', label: t.stats.focus, icon: Brain, color: '#a78bfa', tailwindText: 'text-violet-500', tailwindBg: 'bg-violet-500/10', tailwindBorder: 'border-violet-500/50', gradId: 'cConc' },
    { key: 'emotional', dbField: 'regulacion_emocional', label: t.stats.reg, icon: Scale, color: '#38bdf8', tailwindText: 'text-sky-500', tailwindBg: 'bg-sky-500/10', tailwindBorder: 'border-sky-500/50', gradId: 'cReg' },
    { key: 'sleep', dbField: 'calidad_sueno', label: t.stats.sleep, icon: Moon, color: '#818cf8', tailwindText: 'text-indigo-500', tailwindBg: 'bg-indigo-500/10', tailwindBorder: 'border-indigo-500/50', gradId: 'cSleep' },
    ...CLINICAL_METRIC_SEEDS.map(metric => ({
      key: metric.key,
      dbField: metric.key,
      label: language === 'es' ? metric.labelEs : metric.labelEn,
      icon: Activity,
      color: metric.color,
      tailwindText: metric.tailwindText,
      tailwindBg: metric.tailwindBg,
      tailwindBorder: metric.tailwindBorder,
      gradId: metric.gradId,
    })),
  ], [t, CLINICAL_METRIC_SEEDS, language]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const fetchHistory = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setPermissionError(false);
    
    try {
      if(!db) throw new Error("No db");
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'daily_logs'));
      const METRIC_FIELDS: BaseMetricField[] = [
        'estado_animo', 'nivel_energia', 'nivel_deporte', 'calidad_sueno',
        'social_confort', 'nivel_motivacion', 'nivel_concentracion', 'regulacion_emocional'
      ];
      const historyData: DashboardDataPoint[] = [];
      snapshot.forEach(doc => {
        const log = doc.data() as DashboardDataPoint;
        // Normalizamos legacy 0-100 → 1-10 para que charts y stats sean consistentes.
        for (const f of METRIC_FIELDS) {
          const v = log[f];
          if (typeof v === 'number' && v > 10) {
            log[f] = Math.round(v / 10);
          }
        }
        historyData.push(log);
      });

      // Merge clinical metrics by date into dashboard logs so they can be
      // overlaid in the same chart with mood/energy/etc.
      const clinicalSnapshots = await Promise.all(
        CLINICAL_METRIC_SEEDS.map((metric) => getDocs(collection(db, 'users', user.uid, metric.collectionName)))
      );
      const rowsByDate = new Map<string, DashboardDataPoint>();
      historyData.forEach((row) => rowsByDate.set(row.fecha, row));

      clinicalSnapshots.forEach((snap, idx) => {
        const metric = CLINICAL_METRIC_SEEDS[idx];
        snap.forEach((clinicalDoc) => {
          const entry = clinicalDoc.data() as Record<string, unknown>;
          const dateKey = (entry.dateKey as string | undefined) || clinicalDoc.id;
          const raw = entry[metric.sourceField];
          if (typeof dateKey !== 'string' || typeof raw !== 'number') return;

          const normalized = Math.max(0, Math.min(10, Math.round(metric.toScale10(raw) * 10) / 10));
          const existing = rowsByDate.get(dateKey);
          if (!existing) return;
          existing[metric.key] = normalized;
        });
      });

      const mergedData = Array.from(rowsByDate.values());
      mergedData.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      setRawData(mergedData);
      
      const months = [...new Set(mergedData.map(d => getMonthName(d.fecha, language)))];
      setAvailableMonths(months);
      
      if (months.length > 0) {
         if (!selectedMonth || !months.includes(selectedMonth)) {
             setSelectedMonth(months[months.length - 1]);
         }
      }
    } catch (error) {
      console.error("Fetch History Error:", error);
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'permission-denied') {
        setPermissionError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchHistory(); }, [user, language, CLINICAL_METRIC_SEEDS]); 

  // Filter Data by Month
  const data = useMemo(() => {
    if (!selectedMonth) return rawData;
    return rawData.filter(d => getMonthName(d.fecha, language) === selectedMonth);
  }, [rawData, selectedMonth, language]);

  // Determine which metrics to show based SOLELY on Data Existence
  const activeMetrics = useMemo(() => {
    return METRIC_CONFIG.filter(metric => {
      // Check Data Existence (Optimization: Avoid showing empty flat lines 0)
      const hasData = data.some((log) => {
        const val = log[metric.dbField];
        return typeof val === 'number' && !Number.isNaN(val) && val > 0;
      });
      return hasData;
    });
  }, [METRIC_CONFIG, data]);

  // Initialize visible chart keys when activeMetrics changes
  // Default ONLY to 'mood' if available, otherwise just the first one
  useEffect(() => {
    if (activeMetrics.length > 0) {
        const hasMood = activeMetrics.some(m => m.key === 'mood');
        if (hasMood) {
            setVisibleChartKeys(new Set(['mood']));
        } else {
            setVisibleChartKeys(new Set([activeMetrics[0].key]));
        }
    } else {
        setVisibleChartKeys(new Set());
    }
  }, [activeMetrics]);

  // Toggle chart line visibility
  const toggleChartMetric = (key: string) => {
    const newSet = new Set(visibleChartKeys);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setVisibleChartKeys(newSet);
  };

  const populateDemoData = async () => {
    if (readOnly) return;
    if (!user || !db) return;
    setPopulating(true);
    const result = await seedDemoUsers(user.uid);
    setPopulating(false);
    if (result.success) {
        showToast(t.dbSeeded, 'success');
        fetchHistory();
    } else {
        showToast("Error: " + result.error, 'error');
    }
  };

  const deleteDemoData = async () => {
    if (readOnly) return;
    if (!user || !db) return;
    const isTargetDemo = ['InconsistentStreak2025', 'DemoMetricas1111111111', 'DemoMetricas2222222222'].includes(user.uid);
    if (!isTargetDemo) {
      showToast("Este borrado solo aplica a demos 4, 5 y 6.", 'error');
      return;
    }
    const accepted = window.confirm('¿Seguro que quieres borrar todos los datos de este demo? Esta acción no se puede deshacer.');
    if (!accepted) return;

    setPopulating(true);
    const result = await clearTargetedDemoUserData(user.uid);
    setPopulating(false);
    if (result.success) {
      showToast("Datos demo eliminados.", 'success');
      fetchHistory();
    } else {
      showToast("Error: " + result.error, 'error');
    }
  };

  const handleToggleAudio = (key: string, base64: string) => {
    if (activeAudioKey === key && audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        audioPlayerRef.current.play().catch(e => console.error("Playback error", e));
        setIsPlaying(true);
      }
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(base64);
      audio.onended = () => {
        setIsPlaying(false);
        setActiveAudioKey(null);
      };
      audioPlayerRef.current = audio;
      setActiveAudioKey(key);
      setIsPlaying(true);
      audio.play().catch(e => console.error("Playback error", e));
    }
  };

  const stats = useMemo(() => {
    if (data.length === 0) return {};

    // Dynamically calculate averages for active metrics (escala 1-10).
    const result: Record<string, number> = {};
    activeMetrics.forEach(m => {
       let sum = 0;
       let count = 0;
       data.forEach((curr) => {
           const raw = curr[m.dbField];
           if (typeof raw === 'number') {
               // Normalizamos datos legacy en 0-100.
               const val = raw > 10 ? raw / 10 : raw;
               sum += val;
               count++;
           }
       });
       result[m.key] = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
    });
    
    // Always calc progress (progress is always present)
    const sumProgress = data.reduce((acc, curr) => acc + (curr.progreso_porcentaje || 0), 0);
    result['progress'] = Math.round(sumProgress / data.length);

    return result;
  }, [data, activeMetrics]);

  // --- AI COACH FEATURE ---
  const handleGenerateCoachReport = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null); // Reset previous result
    
    try {
        // Use locally cached rawData
        // Filter for last 30 days
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        const recentLogs = rawData.filter(log => {
            const logDate = new Date(log.fecha);
            return logDate >= thirtyDaysAgo;
        });

        if (recentLogs.length === 0) {
            showToast("No hay suficientes datos recientes para un análisis.", 'warning');
            setIsAnalyzing(false);
            return;
        }

        // 2. Prepare Data Context
        const currentDayName = today.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'long' });
        
        // Use environment variable for API Key
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // 3. Construct Prompt - ULTRA BRIEF / TELEGRAPHIC
        const prompt = `
        Role: Elite High Performance Coach.
        Language: ${language === 'es' ? 'Spanish' : 'English'}.
        
        Task: Analyze last 30 days. Provide a TACTICAL BRIEFING.
        
        Requirements:
        1. Tactics: Max 2 specific actions for Today (${currentDayName}).
        2. Mindset: 1 short sentence (Stoic/CBT).
        3. Quote: 1 short quote.
        
        Style: Telegraphic, military-style brevity. No fluff.
        Max total words: 60.
        
        Data (JSON):
        ${JSON.stringify(recentLogs.map(l => ({
            d: l.fecha,
            mood: l.estado_animo,
            energy: l.nivel_energia,
            prog: l.progreso_porcentaje
        })))}
        `;

        // 4. Call Gemini with JSON Schema
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tactics: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        psychologicalTip: {
                            type: Type.STRING
                        },
                        quote: {
                            type: Type.STRING
                        }
                    }
                }
            }
        });

        if (response.text) {
            const resultObj = JSON.parse(response.text) as AICoachResponse;
            setAnalysisResult(resultObj);
            setShowAnalysisModal(true);
        } else {
            throw new Error("Empty response");
        }

    } catch (error) {
        console.error("AI Coach Error:", error);
        showToast("Error al generar el reporte. Intenta más tarde.", 'error');
    } finally {
        setIsAnalyzing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white flex items-center justify-center gap-3"><Loader2 className="animate-spin"/> {t.loading}</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans pb-10 transition-colors duration-300">
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
      <CompanyHeader onAuthClick={onAuthRequest} user={authUser} onProfileClick={onNavigateToProfile} language={language} onToggleLanguage={onToggleLanguage} isPro={isPro} onLogout={onLogout} />

      {/* AI Coach Analysis Overlay - REPORT STYLE */}
      {showAnalysisModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.aiCoach.modalTitle}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setShowAnalysisModal(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowAnalysisModal(false); }}
        >
           <div
             className="bg-white dark:bg-slate-900 rounded-sm shadow-2xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-8 zoom-in-95 duration-300 relative border-t-4 border-indigo-600 dark:border-indigo-500"
             onClick={(e) => e.stopPropagation()}
           >
              {/* Close Button - Minimal */}
              <button 
                onClick={() => setShowAnalysisModal(false)}
                className="absolute top-2 right-2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>

              {/* REPORT HEADER */}
              <div className="px-6 pt-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-xs uppercase">
                       <FileText size={14} />
                       <span>Performance Brief</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                       {new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US').toUpperCase()}
                    </div>
                 </div>
                 <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                    {t.aiCoach.modalTitle}
                 </h2>
              </div>

              {/* REPORT BODY */}
              {analysisResult ? (
                 <div className="p-6 space-y-6">
                    
                    {/* SECTION 1: TACTICS */}
                    <div>
                       <h4 className="font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Target size={12} /> {t.aiCoach.tacticsTitle}
                       </h4>
                       <ul className="space-y-3">
                          {analysisResult.tactics?.map((tactic, i) => (
                             <li key={i} className="flex gap-3 items-start group">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 group-hover:scale-125 transition-transform" />
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
                                   {tactic}
                                </span>
                             </li>
                          ))}
                       </ul>
                    </div>
                    
                    <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />

                    {/* SECTION 2: MINDSET */}
                    <div>
                       <h4 className="font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Brain size={12} /> {t.aiCoach.psychTitle}
                       </h4>
                       <p className="text-sm text-slate-700 dark:text-slate-300 font-medium italic border-l-2 border-indigo-200 dark:border-indigo-800 pl-3 py-1">
                          {analysisResult.psychologicalTip}
                       </p>
                    </div>

                    {/* SECTION 3: QUOTE (Footer Style) */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mt-2">
                       <div className="flex gap-2">
                          <Quote size={14} className="text-slate-300 dark:text-slate-600 shrink-0 rotate-180" />
                          <p className="text-xs font-serif text-slate-600 dark:text-slate-400 text-center flex-1 leading-relaxed">
                             {analysisResult.quote}
                          </p>
                          <Quote size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
                       </div>
                    </div>

                 </div>
              ) : (
                 <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-indigo-500" size={24} />
                    <p className="text-xs font-mono text-slate-400 animate-pulse">GENERATING BRIEF...</p>
                 </div>
              )}

              {/* FOOTER */}
              <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3 flex justify-between items-center text-[9px] text-slate-400 font-mono border-t border-slate-100 dark:border-slate-800">
                 <span>CONFIDENTIAL // EYE ONLY</span>
                 <span>AI GENERATED</span>
              </div>
           </div>
        </div>
      )}

      {/* READ ONLY BANNER */}
      {readOnly && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-4 py-3 sticky top-[73px] z-30 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
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

      {/* ERROR BANNER FOR PERMISSIONS */}
      {permissionError && (
        <div className="bg-red-100 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 sticky top-[73px] z-30 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
             <div className="flex items-center gap-2 text-sm font-bold">
               <AlertCircle size={16} />
               <span>Error de Permisos: No se pueden leer los datos. Actualiza las reglas en Firebase.</span>
             </div>
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4 sticky ${readOnly ? 'top-[125px]' : 'top-20'} z-20 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 pb-4 transition-colors duration-300`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white"><BarChart2 className="text-blue-500" /> {t.dashboardTitle}</h1>
        </div>

        <div className="flex items-center gap-3">
          {availableMonths.length > 0 && (
            <div className="relative group">
              <select value={selectedMonth || ''} onChange={(e) => setSelectedMonth(e.target.value)} className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white pl-4 pr-10 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer capitalize shadow-sm">
                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          )}
          <button
            onClick={onNavigateToClinicalMetrics}
            className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-600/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-600/30 transition text-xs font-bold"
          >
            <Activity size={14} /> {t.clinicalMetrics}
          </button>
          {!readOnly && (
            <>
              <button onClick={populateDemoData} disabled={populating} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-600/30 transition text-xs font-medium">
                {populating ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} {populating ? t.generating : "Demo"}
              </button>
              <button onClick={deleteDemoData} disabled={populating} className="flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-600/20 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-600/30 transition text-xs font-medium">
                {populating ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>} Borrar demo
              </button>
            </>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {rawData.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Database size={48} className="mx-auto mb-4 opacity-50"/>
            <p>{permissionError ? "No tienes permisos para ver estos datos." : t.noData}</p>
            {!readOnly && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button onClick={populateDemoData} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition">{t.generateDemo}</button>
                <button onClick={deleteDemoData} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition">Borrar demo</button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 1. CHART: LINE AREAS (Primary Visual) */}
            <Card className="p-6 h-96">
                <div className="mb-4 flex flex-wrap gap-2 justify-between items-center">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 capitalize">{selectedMonth}</h3>
                  {/* Dynamic Chart Toggles */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {activeMetrics.map((m) => {
                      const isVisible = visibleChartKeys.has(m.key);
                      return (
                        <button
                          key={m.key}
                          onClick={() => toggleChartMetric(m.key)}
                          onDoubleClick={() => {
                            setHistoricalInitialKey(m.key);
                            setHistoricalOpen(true);
                          }}
                          title={m.label}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${isVisible ? `${m.tailwindBg} ${m.tailwindText} ${m.tailwindBorder}` : 'bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600'}`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                    {activeMetrics.length > 0 && (
                      <button
                        onClick={() => {
                          const firstVisible = activeMetrics.find(m => visibleChartKeys.has(m.key));
                          setHistoricalInitialKey((firstVisible ?? activeMetrics[0]).key);
                          setHistoricalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold border bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500 transition-colors"
                      >
                        <History size={12} />
                        {t.historical.cta}
                      </button>
                    )}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="80%">
                  <AreaChart data={data}>
                    <defs>
                      {activeMetrics.map(m => (
                         <linearGradient key={m.gradId} id={m.gradId} x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor={m.color} stopOpacity={0.8}/>
                           <stop offset="95%" stopColor={m.color} stopOpacity={0}/>
                         </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid}/>
                    <XAxis dataKey="fecha" stroke={chartColors.text} fontSize={12} tickFormatter={(val) => val.slice(8)} />
                    <YAxis stroke={chartColors.text}/>
                    <Tooltip contentStyle={{background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius:'8px', color: chartColors.tooltipText}}/>
                    
                    {/* Render Areas Dynamically */}
                    {activeMetrics.map(m => (
                      visibleChartKeys.has(m.key) && (
                        <Area 
                          key={m.key}
                          type="monotone" 
                          dataKey={m.dbField} 
                          name={m.label} 
                          stroke={m.color} 
                          fillOpacity={1} 
                          fill={`url(#${m.gradId})`} 
                          connectNulls={false} 
                        />
                      )
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
            </Card>

            {/* 2. CHART: BAR CHART (Productivity) */}
            <Card className="p-6 h-80">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">{t.productivity}</h3>
              </div>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid}/>
                  <XAxis dataKey="fecha" stroke={chartColors.text} fontSize={12} tickFormatter={(val) => val.slice(8)}/>
                  <YAxis stroke={chartColors.text}/>
                  <Tooltip contentStyle={{background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius:'8px', color: chartColors.tooltipText}}/>
                  <Bar dataKey="progreso_porcentaje" name={t.stats.progress + " %"} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* 3. METRICS AVERAGES */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 ml-1">{t.averageMetrics}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {/* Render dynamic metric cards */}
                {activeMetrics.map((m) => (
                  <Card key={m.key} className="p-3 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold mb-1">{m.label}</p>
                    <div className="flex items-center gap-2">
                      <m.icon size={16} className={m.tailwindText}/>
                      <span className="text-xl font-bold text-slate-800 dark:text-white">{stats[m.key] || 0}</span>
                    </div>
                  </Card>
                ))}
                
                {/* Progress Average */}
                <Card className="p-3 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold mb-1">{t.stats.progress}</p>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-blue-500 dark:text-blue-400"/>
                      <span className="text-xl font-bold text-slate-800 dark:text-white">{stats.progress}%</span>
                    </div>
                </Card>
              </div>
            </div>

            {/* 4. AI STRATEGIC REPORT - ADAPTIVE THEME */}
            <div className="bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-8 relative overflow-hidden group shadow-lg transition-colors duration-300">
                {/* Subtle Decorative Blob */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="flex flex-col items-center text-center gap-6 relative z-10">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2 mb-2">
                            <Bot className="text-indigo-600 dark:text-indigo-400" size={24} />
                            {t.aiCoach.title}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                            {t.aiCoach.desc}
                        </p>
                    </div>
                    
                    <button
                        onClick={handleGenerateCoachReport}
                        disabled={isAnalyzing}
                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap active:scale-95 group-hover:shadow-indigo-500/25 duration-300 hover:-translate-y-0.5"
                    >
                        {isAnalyzing ? <Loader2 size={18} className="animate-spin text-white" /> : <Sparkles size={18} className="text-white" />}
                        {isAnalyzing ? t.aiCoach.analyzing : t.aiCoach.analyzeBtn}
                    </button>
                </div>
            </div>

            {/* 5. HISTORY LIST */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-4 text-center">
                <h3 className="font-bold text-xl text-slate-900 dark:text-slate-200 capitalize">{t.history} {selectedMonth}</h3>
              </div>
              {[...data].reverse().map((entry, idx) => (
                <Card key={`${entry.fecha}-${idx}`} className="p-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-slate-800 dark:text-white text-lg">{formatDateFriendly(entry.fecha, language)}</h4>
                          {entry.audio_note && (
                            <button
                              onClick={() => handleToggleAudio(entry.fecha, entry.audio_note!)}
                              className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 transition-all duration-300"
                            >
                              <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                                {activeAudioKey === entry.fecha && isPlaying ? (
                                    <Pause size={10} className="text-white fill-current" />
                                ) : (
                                    <Play size={10} className="text-white fill-current ml-0.5" />
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider group-hover:text-indigo-700 dark:group-hover:text-indigo-200">
                                {activeAudioKey === entry.fecha && isPlaying ? "Pausar" : t.audio.voiceNote}
                              </span>
                            </button>
                          )}
                      </div>
                      {entry.reflexion && <p className="text-sm text-slate-600 dark:text-slate-400 italic border-l-2 border-slate-300 dark:border-slate-600 pl-3">"{entry.reflexion}"</p>}
                    </div>
                    {/* Dynamic History Columns */}
                    <div className="flex items-center gap-4 flex-wrap justify-end">
                      {activeMetrics.map(m => (
                         // Only show if value exists and > 0 to keep history clean
                         (entry[m.dbField as keyof DailyLog] as number) > 0 && (
                           <div key={m.key} className="text-center w-12">
                             <span className="block text-[9px] text-slate-500 uppercase">{m.label}</span>
                             <span className={`font-bold ${m.tailwindText}`}>
                               {entry[m.dbField as keyof DailyLog] as number}
                             </span>
                           </div>
                         )
                      ))}
                      
                      <div className="text-center w-16 pl-2 border-l border-slate-200 dark:border-slate-600">
                        <span className="block text-[9px] text-slate-500 uppercase">{t.stats.progress}</span>
                        <span className="text-2xl font-bold text-blue-500 dark:text-blue-400">{entry.progreso_porcentaje}%</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button onClick={onNavigateToComments} className="flex items-center gap-2 px-6 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-full hover:bg-slate-700 dark:hover:bg-slate-600 transition shadow-lg border border-slate-700 dark:border-slate-600"><MessageSquare size={18} /> {t.viewMonthComments}</button>
            </div>
          </>
        )}
      </main>

      {historicalOpen && (
        <HistoricalMetricView
          metrics={activeMetrics}
          rawData={rawData}
          initialMetricKey={historicalInitialKey}
          chartColors={chartColors}
          labels={{
            title: t.historical.title,
            selectMetric: t.historical.selectMetric,
            rangeMonths: (n: number) => t.historical.rangeLabel(n),
            hint: t.historical.hint,
            noDataInRange: t.historical.noDataInRange,
            reflection: t.historical.reflection,
            progress: t.historical.progress,
            completed: t.historical.completed,
            pending: t.historical.pending,
            valueOutOf10: (v: number) => `${v}/10`,
            average: t.historical.average,
            entries: t.historical.entries,
          }}
          onClose={() => setHistoricalOpen(false)}
        />
      )}
    </div>
  );
};

export default PersonalDevDashboard;
