import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Activity, AlertCircle, Loader2,
  CloudRain, Smile, Brain, ShieldCheck, Shield, Moon, Heart, Target, Ghost,
} from 'lucide-react';
import { ClinicalDashboardProps, Language } from '../types';
import CompanyHeader from '../components/CompanyHeader';
import Toast from '../components/ui/Toast';
import { useToast } from '../utils/useToast';
import { parseEnabledModules } from '../utils/patologiaModules';
import {
  BaseSectionProps, ChartColors, RangeDays, pickLang,
} from '../components/clinicalSections/shared';
import AnxietySection from '../components/clinicalSections/AnxietySection';
import DepressionSection from '../components/clinicalSections/DepressionSection';
import BipolarSection from '../components/clinicalSections/BipolarSection';
import SchizophreniaSection from '../components/clinicalSections/SchizophreniaSection';
import OCDSection from '../components/clinicalSections/OCDSection';
import TraumaSection from '../components/clinicalSections/TraumaSection';
import SleepSection from '../components/clinicalSections/SleepSection';
import PersonalitySection from '../components/clinicalSections/PersonalitySection';
import ADHDSection from '../components/clinicalSections/ADHDSection';
import SubstanceSection from '../components/clinicalSections/SubstanceSection';

interface TabDef {
  id: string;
  label: Record<'es' | 'en', string>;
  subtitle: Record<'es' | 'en', string>;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  activeBg: string;
  activeText: string;
  iconColor: string;
  Section: React.FC<BaseSectionProps>;
}

const MODULE_TABS: TabDef[] = [
  {
    id: 'anxiety_log',
    label: { es: 'Ansiedad', en: 'Anxiety' },
    subtitle: { es: 'Registro de Ansiedad', en: 'Anxiety Log' },
    icon: Activity,
    activeBg: 'bg-orange-600',
    activeText: 'text-white',
    iconColor: 'text-orange-500',
    Section: AnxietySection,
  },
  {
    id: 'depression_tracker',
    label: { es: 'Depresión', en: 'Depression' },
    subtitle: { es: 'Vitalidad y ánimo', en: 'Vitality and mood' },
    icon: CloudRain,
    activeBg: 'bg-sky-600',
    activeText: 'text-white',
    iconColor: 'text-sky-500',
    Section: DepressionSection,
  },
  {
    id: 'mood_tracker',
    label: { es: 'Bipolar', en: 'Bipolar' },
    subtitle: { es: 'Monitor de ciclicidad', en: 'Mood cycle monitor' },
    icon: Smile,
    activeBg: 'bg-violet-600',
    activeText: 'text-white',
    iconColor: 'text-violet-500',
    Section: BipolarSection,
  },
  {
    id: 'schizophrenia_tracker',
    label: { es: 'Psicótico', en: 'Psychotic' },
    subtitle: { es: 'Evaluación diaria', en: 'Daily evaluation' },
    icon: Ghost,
    activeBg: 'bg-purple-600',
    activeText: 'text-white',
    iconColor: 'text-purple-500',
    Section: SchizophreniaSection,
  },
  {
    id: 'ocd_tracker',
    label: { es: 'TOC', en: 'OCD' },
    subtitle: { es: 'Gestión de pensamientos', en: 'Thought management' },
    icon: ShieldCheck,
    activeBg: 'bg-emerald-600',
    activeText: 'text-white',
    iconColor: 'text-emerald-500',
    Section: OCDSection,
  },
  {
    id: 'trauma_log',
    label: { es: 'Trauma', en: 'Trauma' },
    subtitle: { es: 'Monitor de seguridad', en: 'Safety monitor' },
    icon: Shield,
    activeBg: 'bg-slate-700',
    activeText: 'text-white',
    iconColor: 'text-slate-500',
    Section: TraumaSection,
  },
  {
    id: 'sleep_journal',
    label: { es: 'Sueño', en: 'Sleep' },
    subtitle: { es: 'Diario de descanso', en: 'Rest diary' },
    icon: Moon,
    activeBg: 'bg-indigo-600',
    activeText: 'text-white',
    iconColor: 'text-indigo-500',
    Section: SleepSection,
  },
  {
    id: 'personality_tracker',
    label: { es: 'Personalidad', en: 'Personality' },
    subtitle: { es: 'Vínculos y percepción', en: 'Relationships and self' },
    icon: Heart,
    activeBg: 'bg-rose-600',
    activeText: 'text-white',
    iconColor: 'text-rose-500',
    Section: PersonalitySection,
  },
  {
    id: 'adhd_tracker',
    label: { es: 'TDAH', en: 'ADHD' },
    subtitle: { es: 'Foco y productividad', en: 'Focus and productivity' },
    icon: Target,
    activeBg: 'bg-yellow-500',
    activeText: 'text-slate-900',
    iconColor: 'text-yellow-600',
    Section: ADHDSection,
  },
  {
    id: 'substance_tracker',
    label: { es: 'Consumo', en: 'Substance' },
    subtitle: { es: 'Control de impulsos', en: 'Impulse control' },
    icon: Brain,
    activeBg: 'bg-orange-700',
    activeText: 'text-white',
    iconColor: 'text-orange-600',
    Section: SubstanceSection,
  },
];

const RANGE_OPTIONS: RangeDays[] = [7, 30, 90, 365];

const ClinicalDashboard: React.FC<ClinicalDashboardProps> = ({
  onBack, user, authUser, onNavigateToProfile, onAuthRequest,
  language, onToggleLanguage, isPro, onLogout,
  readOnly, viewingFriendName, onExitSharedView,
}) => {
  const lang = pickLang(language);
  const { toast, clearToast } = useToast();

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const chartColors: ChartColors = useMemo(() => ({
    grid: isDark ? '#334155' : '#e2e8f0',
    text: isDark ? '#94a3b8' : '#64748b',
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    tooltipBorder: isDark ? '#334155' : '#e2e8f0',
    tooltipText: isDark ? '#f1f5f9' : '#0f172a',
  }), [isDark]);

  const availableTabs = useMemo(() => {
    if (!user) return [];
    const enabled = parseEnabledModules([user.displayName, user.email, user.uid]);
    const enabledIds = new Set(enabled.map(m => m.id));
    return MODULE_TABS.filter(tab => enabledIds.has(tab.id));
  }, [user]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);

  // Default tab is the first enabled one for this user.
  useEffect(() => {
    if (availableTabs.length === 0) {
      setSelectedId(null);
    } else if (!selectedId || !availableTabs.some(t => t.id === selectedId)) {
      setSelectedId(availableTabs[0].id);
    }
  }, [availableTabs, selectedId]);

  const selectedTab = useMemo(
    () => availableTabs.find(t => t.id === selectedId) ?? null,
    [availableTabs, selectedId]
  );

  const renderHeader = () => (
    <>
      <CompanyHeader
        onAuthClick={onAuthRequest}
        user={authUser}
        onProfileClick={onNavigateToProfile}
        language={language}
        onToggleLanguage={onToggleLanguage}
        isPro={isPro}
        onLogout={onLogout}
      />
      {readOnly && viewingFriendName && (
        <div className="bg-indigo-100 dark:bg-indigo-900/30 border-b border-indigo-200 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 px-4 py-2 text-center text-sm font-bold flex justify-center items-center gap-2 sticky top-[73px] z-20">
          Viendo métricas clínicas de: <span className="font-black">{viewingFriendName}</span>
          {onExitSharedView && (
            <button onClick={onExitSharedView} className="ml-3 underline text-xs font-medium">Salir</button>
          )}
        </div>
      )}
      <div className={`max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4 sticky ${readOnly ? 'top-[125px]' : 'top-20'} z-20 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 pb-4`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
              {selectedTab ? (
                <selectedTab.icon className={selectedTab.iconColor} />
              ) : (
                <Activity className="text-orange-500" />
              )}
              {language === 'es' ? 'Métricas Clínicas' : 'Clinical Metrics'}
            </h1>
            {selectedTab && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedTab.subtitle[lang]}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
          {RANGE_OPTIONS.map(r => {
            const active = rangeDays === r;
            const label = r === 365 ? (lang === 'es' ? '1 año' : '1 year') : `${r} ${lang === 'es' ? 'días' : 'days'}`;
            return (
              <button
                key={r}
                onClick={() => setRangeDays(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  active
                    ? `${selectedTab?.activeBg ?? 'bg-orange-600'} ${selectedTab?.activeText ?? 'text-white'} shadow-sm`
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {availableTabs.length > 0 && (
        <div className={`max-w-7xl mx-auto px-4 py-3 sticky ${readOnly ? 'top-[202px]' : 'top-[160px]'} z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800`}>
          <div className="flex flex-wrap gap-2">
            {availableTabs.map(tab => {
              const active = selectedId === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedId(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? `${tab.activeBg} ${tab.activeText} shadow-sm`
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label[lang]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (availableTabs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        {renderHeader()}
        <main className="max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            {language === 'es' ? 'Sin módulos clínicos activados.' : 'No clinical modules active.'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {language === 'es'
              ? 'El código clínico al final del username controla qué módulos se activan. Probá con el usuario Demo 5.'
              : 'The clinical code at the end of the username controls which modules activate. Try Demo 5.'}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans pb-10 transition-colors duration-300">
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
      {renderHeader()}

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {selectedTab && (
          <selectedTab.Section
            user={user}
            rangeDays={rangeDays}
            language={language}
            chartColors={chartColors}
          />
        )}
      </main>
    </div>
  );
};

export default ClinicalDashboard;
