import React, { useEffect, useState } from 'react';
import { Users, Zap, MessageSquare, CheckCircle2, Shield, UserCircle, Wind, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { PatologiaModuleProps } from '../../utils/patologiaModules';
import { Language } from '../../types';

interface PersonalityEntry {
  impulsivityLevel: number;     // 0-5
  emotionalStability: number;   // 0-10
  relationshipConflict: boolean;
  fearOfAbandonment: number;    // 0-5
  selfImageStability: number;   // 0-10
  usedCrisisSkills: boolean;
  notes: string;
  updatedAt?: number;
  dateKey?: string;
}

const DEFAULT_ENTRY: PersonalityEntry = {
  impulsivityLevel: 0,
  emotionalStability: 5,
  relationshipConflict: false,
  fearOfAbandonment: 0,
  selfImageStability: 5,
  usedCrisisSkills: true,
  notes: '',
};

const STR: Record<'es' | 'en', {
  moodStability: string;
  selfImage: string;
  impulsivity: string;
  conflictQuestion: string;
  yes: string;
  no: string;
  skillsTitle: string;
  skillsHint: string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
  saved: string;
  errorSaving: string;
}> = {
  es: {
    moodStability: 'Estabilidad del Ánimo',
    selfImage: 'Autoimagen / Valía',
    impulsivity: 'Impulsividad',
    conflictQuestion: '¿Conflicto con otros?',
    yes: 'Sí',
    no: 'No',
    skillsTitle: 'Uso de Habilidades',
    skillsHint: '¿Lograste aplicar técnicas de regulación?',
    notesLabel: 'Contexto y Vínculos',
    notesPlaceholder: '¿Cómo te sentiste respecto a los demás hoy? ¿Hubo miedo al rechazo o abandono?',
    save: 'Sincronizar Datos Clínicos',
    saving: 'Sincronizando...',
    saved: 'Registro guardado',
    errorSaving: 'No se pudo guardar. Intentalo de nuevo.',
  },
  en: {
    moodStability: 'Mood Stability',
    selfImage: 'Self-Image / Worth',
    impulsivity: 'Impulsivity',
    conflictQuestion: 'Conflict with others?',
    yes: 'Yes',
    no: 'No',
    skillsTitle: 'Skill Use',
    skillsHint: 'Did you manage to apply regulation techniques?',
    notesLabel: 'Context and Relationships',
    notesPlaceholder: 'How did you feel about others today? Any fear of rejection or abandonment?',
    save: 'Sync Clinical Data',
    saving: 'Syncing...',
    saved: 'Entry saved',
    errorSaving: 'Could not save. Please try again.',
  },
};

const pickLang = (language: Language): 'es' | 'en' => (language === 'es' ? 'es' : 'en');

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

interface SliderRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  disabled: boolean;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, onChange, icon: Icon, color, disabled }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className={color} />
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      </div>
      <span className={`text-sm font-black ${color}`}>{value}</span>
    </div>
    <input
      type="range"
      min={0}
      max={10}
      step={1}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-700 dark:accent-slate-300"
    />
  </div>
);

const PersonalityTracker: React.FC<PatologiaModuleProps> = ({ userId, dateKey, readOnly, language }) => {
  const t = STR[pickLang(language)];
  const [entry, setEntry] = useState<PersonalityEntry>(DEFAULT_ENTRY);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!db || !userId) { setStatus('idle'); return; }
      try {
        setStatus('loading');
        const ref = doc(db, 'users', userId, 'deepClinicalLogsPersonality', dateKey);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          setEntry({ ...DEFAULT_ENTRY, ...(snap.data() as Partial<PersonalityEntry>) });
        } else {
          setEntry(DEFAULT_ENTRY);
        }
        setStatus('idle');
      } catch (err) {
        console.error('PersonalityTracker load error', err);
        if (!cancelled) setStatus('idle');
      }
    };
    load();
    return () => { cancelled = true; };
  }, [userId, dateKey]);

  const handleSave = async () => {
    if (!db || readOnly) return;
    setStatus('saving');
    setErrorMsg(null);
    try {
      const ref = doc(db, 'users', userId, 'deepClinicalLogsPersonality', dateKey);
      await setDoc(ref, { ...entry, dateKey, updatedAt: Date.now() }, { merge: true });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('PersonalityTracker save error', err);
      setErrorMsg(t.errorSaving);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return <div className="p-6 flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={20} /></div>;
  }

  return (
    <div className={`p-5 space-y-4 ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
      <SliderRow
        label={t.moodStability}
        value={entry.emotionalStability}
        onChange={(v) => setEntry(s => ({ ...s, emotionalStability: v }))}
        icon={Wind}
        color="text-indigo-500"
        disabled={readOnly}
      />
      <SliderRow
        label={t.selfImage}
        value={entry.selfImageStability}
        onChange={(v) => setEntry(s => ({ ...s, selfImageStability: v }))}
        icon={UserCircle}
        color="text-rose-500"
        disabled={readOnly}
      />

      <div className="grid grid-cols-2 gap-3 text-center">
        <section className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Zap size={18} className="mx-auto mb-2 text-amber-500" />
          <label className="text-[9px] font-black text-slate-400 uppercase block mb-3">{t.impulsivity}</label>
          <div className="flex justify-center gap-1.5">
            {[0, 1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                onClick={() => setEntry(s => ({ ...s, impulsivityLevel: v }))}
                disabled={readOnly}
                className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all ${
                  entry.impulsivityLevel === v
                    ? 'bg-amber-500 text-white shadow-md scale-110'
                    : 'bg-slate-50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-500'
                }`}
              >{v}</button>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-center items-center">
          <Users size={18} className="mb-2 text-indigo-500" />
          <label className="text-[9px] font-black text-slate-400 uppercase block mb-3 leading-tight">{t.conflictQuestion}</label>
          <button
            onClick={() => setEntry(s => ({ ...s, relationshipConflict: !s.relationshipConflict }))}
            disabled={readOnly}
            className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase transition-all border ${
              entry.relationshipConflict
                ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                : 'bg-slate-50 dark:bg-slate-900/40 text-slate-400 border-slate-100 dark:border-slate-700'
            }`}
          >
            {entry.relationshipConflict ? t.yes : t.no}
          </button>
        </section>
      </div>

      <button
        onClick={() => setEntry(s => ({ ...s, usedCrisisSkills: !s.usedCrisisSkills }))}
        disabled={readOnly}
        className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${
          entry.usedCrisisSkills
            ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900'
            : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 opacity-70'
        }`}
      >
        <div className="flex items-center gap-3 text-left">
          <Shield size={20} className={entry.usedCrisisSkills ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
          <div className="flex flex-col">
            <span className={`text-xs font-black uppercase tracking-tight ${entry.usedCrisisSkills ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-500'}`}>
              {t.skillsTitle}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">{t.skillsHint}</span>
          </div>
        </div>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
          entry.usedCrisisSkills ? 'bg-indigo-600 text-white' : 'bg-slate-300 dark:bg-slate-700 rotate-45'
        }`}>
          <CheckCircle2 size={16} />
        </div>
      </button>

      <section>
        <div className="flex items-center gap-2 mb-2 ml-1">
          <MessageSquare size={14} className="text-slate-400" />
          <label className="text-[10px] font-black text-slate-400 uppercase">{t.notesLabel}</label>
        </div>
        <textarea
          value={entry.notes}
          disabled={readOnly}
          onChange={(e) => setEntry(s => ({ ...s, notes: e.target.value }))}
          placeholder={t.notesPlaceholder}
          className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm text-slate-700 dark:text-slate-200 outline-none h-28 resize-none placeholder:text-slate-400"
        />
      </section>

      {!readOnly && (
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg hover:bg-black dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {status === 'saving' ? <><Loader2 size={18} className="animate-spin" /> {t.saving}</>
            : status === 'saved' ? <><CheckCircle2 size={18} /> {t.saved}</>
            : t.save}
        </button>
      )}

      {errorMsg && <p className="text-xs text-rose-600 dark:text-rose-400 text-center">{errorMsg}</p>}
    </div>
  );
};

export default PersonalityTracker;
