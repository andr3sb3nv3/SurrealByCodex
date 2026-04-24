import React, { useEffect, useState } from 'react';
import { Zap, Clock, Brain, CheckCircle2, MessageSquare, AlertCircle, ListChecks, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { PatologiaModuleProps } from '../../utils/patologiaModules';
import { Language } from '../../types';

interface ADHDEntry {
  focusLevel: number;        // 1-10
  hyperactivity: number;     // 0-5
  impulsivity: number;       // 0-5
  completedTasks: number;
  timeManagement: number;    // 1-5
  medicationTaken: boolean;
  notes: string;
  updatedAt?: number;
  dateKey?: string;
}

const DEFAULT_ENTRY: ADHDEntry = {
  focusLevel: 5,
  hyperactivity: 2,
  impulsivity: 2,
  completedTasks: 0,
  timeManagement: 3,
  medicationTaken: true,
  notes: '',
};

const STR: Record<'es' | 'en', {
  focusLabel: string;
  focusLow: string;
  focusHigh: string;
  hyper: string;
  impuls: string;
  tasks: string;
  tasksHint: string;
  timeMgmt: string;
  timeScale: string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
  saved: string;
  errorSaving: string;
}> = {
  es: {
    focusLabel: 'Nivel de Concentración',
    focusLow: 'Disperso',
    focusHigh: 'Hiper-foco',
    hyper: 'Hiperactividad',
    impuls: 'Impulsividad',
    tasks: 'Tareas del día',
    tasksHint: 'Completadas con éxito',
    timeMgmt: 'Gestión del Tiempo',
    timeScale: 'Pobre — Eficiente',
    notesLabel: 'Notas sobre el foco',
    notesPlaceholder: '¿Qué te distrajo hoy? ¿Usaste técnicas de pomodoro o listas?',
    save: 'Sincronizar Foco Diario',
    saving: 'Sincronizando...',
    saved: 'Registro guardado',
    errorSaving: 'No se pudo guardar. Intentalo de nuevo.',
  },
  en: {
    focusLabel: 'Focus Level',
    focusLow: 'Scattered',
    focusHigh: 'Hyper-focus',
    hyper: 'Hyperactivity',
    impuls: 'Impulsivity',
    tasks: 'Tasks today',
    tasksHint: 'Completed successfully',
    timeMgmt: 'Time Management',
    timeScale: 'Poor — Efficient',
    notesLabel: 'Notes about focus',
    notesPlaceholder: 'What distracted you today? Did you use pomodoro or lists?',
    save: 'Sync Daily Focus',
    saving: 'Syncing...',
    saved: 'Entry saved',
    errorSaving: 'Could not save. Please try again.',
  },
};

const pickLang = (language: Language): 'es' | 'en' => (language === 'es' ? 'es' : 'en');

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const ADHDTracker: React.FC<PatologiaModuleProps> = ({ userId, dateKey, readOnly, language }) => {
  const t = STR[pickLang(language)];
  const [entry, setEntry] = useState<ADHDEntry>(DEFAULT_ENTRY);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!db || !userId) { setStatus('idle'); return; }
      try {
        setStatus('loading');
        const ref = doc(db, 'users', userId, 'deepClinicalLogsADHD', dateKey);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          setEntry({ ...DEFAULT_ENTRY, ...(snap.data() as Partial<ADHDEntry>) });
        } else {
          setEntry(DEFAULT_ENTRY);
        }
        setStatus('idle');
      } catch (err) {
        console.error('ADHDTracker load error', err);
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
      const ref = doc(db, 'users', userId, 'deepClinicalLogsADHD', dateKey);
      await setDoc(ref, { ...entry, dateKey, updatedAt: Date.now() }, { merge: true });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('ADHDTracker save error', err);
      setErrorMsg(t.errorSaving);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return <div className="p-6 flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={20} /></div>;
  }

  return (
    <div className={`p-5 space-y-5 ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
      <section>
        <div className="flex justify-between items-end mb-3 px-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Brain size={16} className="text-yellow-600" /> {t.focusLabel}
          </label>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{entry.focusLevel}/10</span>
        </div>
        <div className="flex gap-1 h-10">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
            <button
              key={v}
              onClick={() => setEntry(s => ({ ...s, focusLevel: v }))}
              disabled={readOnly}
              className={`flex-1 rounded-lg transition-all border-2 ${
                entry.focusLevel >= v
                  ? 'bg-yellow-400 border-yellow-400 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-700'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-slate-400 mt-2 font-bold uppercase italic">
          <span>{t.focusLow}</span>
          <span>{t.focusHigh}</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <section className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Zap size={18} className="mb-1 text-orange-500" />
          <label className="text-[9px] font-black text-slate-400 uppercase block mb-2">{t.hyper}</label>
          <div className="flex justify-between gap-1">
            {[0, 1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                onClick={() => setEntry(s => ({ ...s, hyperactivity: v }))}
                disabled={readOnly}
                className={`w-6 h-6 rounded-md text-[9px] font-bold transition-all ${
                  entry.hyperactivity === v
                    ? 'bg-orange-500 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-500'
                }`}
              >{v}</button>
            ))}
          </div>
        </section>

        <section className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
          <AlertCircle size={18} className="mb-1 text-rose-500" />
          <label className="text-[9px] font-black text-slate-400 uppercase block mb-2">{t.impuls}</label>
          <div className="flex justify-between gap-1">
            {[0, 1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                onClick={() => setEntry(s => ({ ...s, impulsivity: v }))}
                disabled={readOnly}
                className={`w-6 h-6 rounded-md text-[9px] font-bold transition-all ${
                  entry.impulsivity === v
                    ? 'bg-rose-500 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-500'
                }`}
              >{v}</button>
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-2xl border border-yellow-100 dark:border-yellow-900">
          <div className="flex items-center gap-3">
            <ListChecks size={20} className="text-yellow-600 dark:text-yellow-400" />
            <div className="flex flex-col">
              <span className="text-xs font-black text-yellow-900 dark:text-yellow-200 uppercase">{t.tasks}</span>
              <span className="text-[9px] text-yellow-600 dark:text-yellow-400">{t.tasksHint}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEntry(s => ({ ...s, completedTasks: Math.max(0, s.completedTasks - 1) }))}
              disabled={readOnly || entry.completedTasks === 0}
              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400 font-bold disabled:opacity-40"
            >−</button>
            <span className="text-xl font-black text-yellow-900 dark:text-yellow-200 w-6 text-center">{entry.completedTasks}</span>
            <button
              onClick={() => setEntry(s => ({ ...s, completedTasks: s.completedTasks + 1 }))}
              disabled={readOnly}
              className="w-8 h-8 rounded-xl bg-yellow-500 text-white shadow-md font-bold disabled:opacity-40"
            >+</button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-slate-400" />
            <label className="text-[10px] font-black text-slate-400 uppercase">{t.timeMgmt}</label>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                onClick={() => setEntry(s => ({ ...s, timeManagement: v }))}
                disabled={readOnly}
                className={`p-3 rounded-xl text-xs font-bold transition-all ${
                  entry.timeManagement === v
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'
                }`}
              >{v}</button>
            ))}
          </div>
          <p className="text-[8px] text-slate-400 mt-2 text-center italic uppercase font-bold tracking-widest">{t.timeScale}</p>
        </div>
      </section>

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
          className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm text-slate-700 dark:text-slate-200 outline-none h-24 resize-none placeholder:text-slate-400"
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

export default ADHDTracker;
