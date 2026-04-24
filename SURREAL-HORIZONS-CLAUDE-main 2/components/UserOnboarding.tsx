import React, { useState } from 'react';
import { 
  ArrowRight, Check, Zap, Smile, Brain, Moon, 
  Dumbbell, Users, Flame, Scale, Plus, X, Sunrise,
  Activity, Sparkles, Target, TrendingUp, Shield, CheckCircle2
} from 'lucide-react';
import { User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Language, Goal } from '../types';
import { TRANSLATIONS } from '../translations';

interface UserOnboardingProps {
  user: User;
  language: Language;
  onComplete: () => void;
}

// Re-using metric definitions from Canvas for consistency
const ALL_METRICS_DEF = [
  { key: 'mood', icon: Smile, labelKey: 'mood', color: 'text-pink-500', bg: 'bg-pink-50' },
  { key: 'energy', icon: Zap, labelKey: 'energy', color: 'text-amber-500', bg: 'bg-amber-50' },
  { key: 'sport', icon: Dumbbell, labelKey: 'sport', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { key: 'social', icon: Users, labelKey: 'social', color: 'text-teal-500', bg: 'bg-teal-50' },
  { key: 'motivation', icon: Flame, labelKey: 'motivation', color: 'text-orange-500', bg: 'bg-orange-50' },
  { key: 'focus', icon: Brain, labelKey: 'focus', color: 'text-violet-500', bg: 'bg-violet-50' },
  { key: 'emotional', icon: Scale, labelKey: 'emotional', color: 'text-sky-500', bg: 'bg-sky-50' },
  { key: 'sleep', icon: Moon, labelKey: 'sleep', color: 'text-indigo-500', bg: 'bg-indigo-50' },
];

const UserOnboarding: React.FC<UserOnboardingProps> = ({ user, language, onComplete }) => {
  const [step, setStep] = useState(1);
  const [enabledMetrics, setEnabledMetrics] = useState<string[]>(['mood']); // Default selection: Only Mood
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalText, setNewGoalText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const t = TRANSLATIONS[language];
  const ot = t.onboarding;

  const handleToggleMetric = (key: string) => {
    if (enabledMetrics.includes(key)) {
      if (enabledMetrics.length > 1) {
        setEnabledMetrics(prev => prev.filter(k => k !== key));
      }
    } else {
      setEnabledMetrics(prev => [...prev, key]);
    }
  };

  const generateInitialGoals = () => {
    // Balanced set of 4 goals for everyone
    const fixedGoals: Goal[] = [
      { id: Math.random(), text: "Planificar el día (5 min)", category: "Productividad", completed: false, resourceKey: 'general' },
      { id: Math.random(), text: "Beber 2L de agua", category: "Salud", completed: false, resourceKey: 'water' },
      { id: Math.random(), text: "Leer 10 páginas", category: "Aprendizaje", completed: false, resourceKey: 'reading' },
      { id: Math.random(), text: "Meditar o respirar (5 min)", category: "Mindfulness", completed: false, resourceKey: 'meditation' }
    ];

    setGoals(fixedGoals);
    setStep(3);
  };

  const handleAddGoal = () => {
    if (!newGoalText.trim()) return;
    setGoals([...goals, {
      id: Math.random(),
      text: newGoalText,
      category: 'General',
      completed: false,
      resourceKey: 'general'
    }]);
    setNewGoalText("");
  };

  const handleRemoveGoal = (id: number) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const handleComplete = async () => {
    if (!db || !user) return;
    setIsSaving(true);

    try {
      // 1. Save Preferences (Enabled Metrics)
      await setDoc(doc(db, 'users', user.uid, 'user_settings', 'preferences'), {
         enabledMetrics,
         onboardingCompleted: true,
         updatedAt: Date.now()
      });

      // 2. Save Initial Goals to Template (For future days)
      await setDoc(doc(db, 'users', user.uid, 'Set_goals', 'current'), {
         updatedAt: Date.now(),
         goals: goals
      });

      // 3. OVERRIDE TODAY'S GOALS IN DAILY LOG
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const pendingGoals = goals.map(g => ({ tarea: g.text, categoria: g.category }));
      
      await setDoc(doc(db, 'users', user.uid, 'daily_logs', todayStr), {
         fecha: todayStr,
         timestamp: Date.now(),
         objetivos_pendientes: pendingGoals,
         objetivos_completados: [] 
      }, { merge: true });

      onComplete();
    } catch (e) {
      console.error("Onboarding Save Error", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col min-h-[500px] sm:min-h-[600px] animate-in zoom-in-95 duration-500 relative transition-all">
        
        {/* STEP 1: AESTHETIC WELCOME SCREEN */}
        {step === 1 && (
          <div className="relative flex-1 flex flex-col items-center justify-center text-center p-8 overflow-hidden bg-white">
             {/* Decorative Background Elements */}
             <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
             <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-100/50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
             
             {/* Floating Icons */}
             <div className="absolute top-12 right-12 text-slate-200/50 animate-bounce duration-[3000ms]">
                <Target size={64} strokeWidth={1.5} />
             </div>
             <div className="absolute bottom-24 left-12 text-slate-200/50 animate-pulse duration-[4000ms]">
                <TrendingUp size={64} strokeWidth={1.5} />
             </div>

             {/* Main Content */}
             <div className="relative z-10 flex flex-col items-center animate-in zoom-in slide-in-from-bottom-8 duration-700">
                
                {/* Logo Representation */}
                <div className="mb-10 relative group cursor-default">
                   <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
                   <div className="relative w-28 h-28 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-[2rem] shadow-2xl shadow-indigo-500/30 flex items-center justify-center transform rotate-3 group-hover:rotate-6 group-hover:scale-105 transition-all duration-500">
                      <Activity size={56} className="text-white drop-shadow-md" />
                   </div>
                   
                   {/* Orbiting elements */}
                   <div className="absolute -top-5 -right-5 bg-white p-3 rounded-2xl shadow-lg animate-bounce duration-[2500ms]">
                      <Sparkles size={24} className="text-amber-400 fill-current" />
                   </div>
                   <div className="absolute -bottom-3 -left-5 bg-white p-3 rounded-2xl shadow-lg animate-bounce delay-700 duration-[3000ms]">
                      <Shield size={24} className="text-emerald-500 fill-current" />
                   </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-3">
                  Surreal Horizons
                </h1>
                <p className="text-xs md:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 uppercase tracking-[0.2em] mb-8">
                  Personal Growth Platform
                </p>

                <p className="text-lg text-slate-600 max-w-md leading-relaxed mb-10">
                  {ot.welcomeDesc || "Tu espacio para la reflexión, el crecimiento y la disciplina. Construye tu mejor versión día a día."}
                </p>

                <button
                  onClick={() => setStep(2)}
                  className="group relative px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-indigo-500/20 transition-all active:scale-95"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center gap-3">
                     <span>{ot.startConfig}</span>
                     <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
                
                <p className="mt-8 text-xs text-slate-400 font-medium">
                  {user.displayName ? `Bienvenido, ${user.displayName}` : 'Comienza tu viaje'}
                </p>
             </div>
          </div>
        )}

        {/* STEPS 2 & 3: CONFIGURATION LAYOUT */}
        {step > 1 && (
          <>
            {/* Header - Reduced padding on mobile */}
            <div className="bg-slate-900 px-6 py-6 sm:p-8 text-white transition-all duration-300 shrink-0">
               <h1 className="text-xl sm:text-2xl font-bold mb-2">{ot.welcomeTitle}</h1>
               <p className="text-slate-400 text-xs sm:text-sm">{ot.welcomeDesc}</p>
               <div className="flex gap-2 mt-4 sm:mt-6">
                 {[1, 2, 3].map(i => (
                   <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${step >= i ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                 ))}
               </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-8 flex-1 flex flex-col h-full overflow-hidden">
              
              {/* STEP 2: METRICS */}
              {step === 2 && (
                <div className="animate-in slide-in-from-right-8 fade-in duration-300 flex-1 flex flex-col h-full">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">{ot.step2Title}</h2>
                  <p className="text-slate-500 text-sm mb-4">{ot.step2Desc}</p>
                  
                  {/* METRICS GRID: Optimized for Mobile (Row layout) vs Desktop (Card layout) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 flex-1 sm:flex-none overflow-y-auto sm:overflow-visible content-start">
                    {ALL_METRICS_DEF.map((m) => {
                      const isSelected = enabledMetrics.includes(m.key);
                      return (
                        <button
                          key={m.key}
                          onClick={() => handleToggleMetric(m.key)}
                          className={`
                            group relative rounded-xl border transition-all 
                            flex sm:flex-col flex-row items-center sm:justify-center justify-start
                            p-3 gap-3 sm:gap-2
                            ${isSelected 
                              ? `border-indigo-200 bg-indigo-50` 
                              : 'border-slate-100 bg-white opacity-70 hover:opacity-100 hover:border-slate-300'
                            }
                            sm:aspect-square h-auto
                          `}
                        >
                           {/* Icon Wrapper */}
                           <div className={`p-2 rounded-full shrink-0 ${isSelected ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                             <m.icon size={20} className={`sm:w-6 sm:h-6 ${isSelected ? m.color : 'text-slate-400'}`} />
                           </div>
                           
                           {/* Label */}
                           <span className={`text-xs font-bold leading-tight text-left sm:text-center ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>
                             {t.indicators[m.labelKey as keyof typeof t.indicators].label}
                           </span>

                           {/* Mobile Selection Indicator (Right Side) */}
                           {isSelected && (
                             <div className="ml-auto sm:hidden text-indigo-500">
                                <CheckCircle2 size={16} className="fill-current text-white" />
                             </div>
                           )}

                           {/* Desktop Selection Dot (Bottom) */}
                           {isSelected && <div className="hidden sm:block w-2 h-2 bg-indigo-500 rounded-full mt-1" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 sm:mt-auto pt-2 sm:pt-8 flex justify-between shrink-0">
                    <button onClick={() => setStep(1)} className="text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm px-4">
                      {t.back}
                    </button>
                    <button
                      onClick={generateInitialGoals}
                      className="px-6 sm:px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm sm:text-base shadow-lg shadow-indigo-500/20"
                    >
                      {ot.continue} <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: GOALS */}
              {step === 3 && (
                <div className="animate-in slide-in-from-right-8 fade-in duration-300 flex-1 flex flex-col h-full">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">{ot.step3Title}</h2>
                  <p className="text-slate-500 text-sm mb-6">{ot.step3Desc}</p>
                  
                  {/* Modern Input Field */}
                  <div className="relative mb-6 group shrink-0">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Target size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={newGoalText}
                      onChange={(e) => setNewGoalText(e.target.value)}
                      placeholder={ot.addGoal + "..."}
                      className="w-full pl-11 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                    />
                    <button
                      onClick={handleAddGoal}
                      disabled={!newGoalText.trim()}
                      className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-200 active:scale-95"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  {/* Aesthetic Goal List */}
                  <div className="space-y-3 overflow-y-auto flex-1 pr-1 -mr-1 pb-2">
                     {goals.length === 0 ? (
                       <div className="text-center py-10 opacity-50 flex flex-col items-center">
                          <Target size={40} strokeWidth={1.5} className="mb-3 text-slate-300"/>
                          <p className="text-sm font-medium text-slate-400">Agrega tu primer objetivo arriba</p>
                       </div>
                     ) : (
                       goals.map(g => (
                         <div key={g.id} className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors bg-emerald-100 text-emerald-600">
                                 <CheckCircle2 size={18} />
                              </div>
                              <span className="text-sm font-semibold text-slate-700 truncate">{g.text}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveGoal(g.id)}
                              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"
                            >
                              <X size={18} />
                            </button>
                         </div>
                       ))
                     )}
                  </div>

                  <div className="mt-4 pt-4 sm:pt-6 flex justify-between shrink-0 border-t border-slate-50">
                     <button onClick={() => setStep(2)} className="text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm px-4">
                      {t.back}
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={isSaving}
                      className="px-6 sm:px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 active:scale-95 text-sm sm:text-base flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                          {t.loading}
                        </>
                      ) : (
                        <>
                          {ot.finish}
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default UserOnboarding;