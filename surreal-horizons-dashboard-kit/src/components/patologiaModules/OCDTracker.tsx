import React, { useEffect, useState } from 'react';
import { Zap, MessageSquare, CheckCircle2, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MODULE_COLLECTIONS } from './shared';
import { PatologiaModuleProps } from '../../utils/patologiaModules';
import { Language } from '../../types';

interface OCDEntry {
  obsessionIntensity: number;  // 0-100
  compulsionFrequency: number;
  resistanceCount: number;
  ruminationTime: number;      // 1-5
  sudsLevel: number;           // 0-10
  thoughtBelief: number;       // 0-100
  triggerContext: string;
  updatedAt?: number;
  dateKey?: string;
}

const DEFAULT_ENTRY: OCDEntry = {
  obsessionIntensity: 50,
  compulsionFrequency: 0,
  resistanceCount: 0,
  ruminationTime: 2,
  sudsLevel: 5,
  thoughtBelief: 50,
  triggerContext: '',
};

const STR: Record<'es' | 'en', {
  obsessionIntensity: string;
  beliefQuestion: string;
  beliefFalse: string;
  beliefReal: string;
  rituals: string;
  resistances: string;
  suds: string;
  triggerLabel: string;
  triggerPlaceholder: string;
  save: string;
  saving: string;
  saved: string;
  errorSaving: string;
}> = {
  es: {
    obsessionIntensity: 'Intensidad Obsesión',
    beliefQuestion: '¿Qué tanto crees este pensamiento?',
    beliefFalse: 'Falso',
    beliefReal: 'Real',
    rituals: 'Rituales',
    resistances: 'Resistencias',
    suds: 'Malestar (SUDs)',
    triggerLabel: 'Contexto del pensamiento',
    triggerPlaceholder: '¿Qué estabas haciendo cuando apareció el pensamiento intrusivo?',
    save: 'Finalizar Sesión',
    saving: 'Guardando...',
    saved: 'Registro guardado',
    errorSaving: 'No se pudo guardar. Intentalo de nuevo.',
  },
  en: {
    obsessionIntensity: 'Obsession Intensity',
    beliefQuestion: 'How much do you believe this thought?',
    beliefFalse: 'False',
    beliefReal: 'Real',
    rituals: 'Rituals',
    resistances: 'Resistances',
    suds: 'Distress (SUDs)',
    triggerLabel: 'Thought context',
    triggerPlaceholder: 'What were you doing when the intrusive thought appeared?',
    save: 'Finalize Session',
    saving: 'Saving...',
    saved: 'Entry saved',
    errorSaving: 'Could not save. Please try again.',
  },
};

const pickLang = (language: Language): 'es' | 'en' => (language === 'es' ? 'es' : 'en');

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const OCDTracker: React.FC<PatologiaModuleProps> = ({ userId, dateKey, readOnly, language }) => {
  const t = STR[pickLang(language)];
  const [entry, setEntry] = useState<OCDEntry>(DEFAULT_ENTRY);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!db || !userId) { setStatus('idle'); return; }
      try {
        setStatus('loading');
        const ref = doc(db, MODULE_COLLECTIONS.users, userId, MODULE_COLLECTIONS.ocd, dateKey);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as Partial<OCDEntry>;
          setEntry({ ...DEFAULT_ENTRY, ...data });
        } else {
          setEntry(DEFAULT_ENTRY);
        }
        setStatus('idle');
      } catch (err) {
        console.error('OCDTracker load error', err);
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
      const ref = doc(db, MODULE_COLLECTIONS.users, userId, MODULE_COLLECTIONS.ocd, dateKey);
      await setDoc(ref, { ...entry, dateKey, updatedAt: Date.now() }, { merge: true });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('OCDTracker save error', err);
      setErrorMsg(t.errorSaving);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="p-6 flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  return (
    <div className={`p-5 space-y-5 ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
      <section className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-5">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.obsessionIntensity}</label>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{entry.obsessionIntensity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={entry.obsessionIntensity}
            disabled={readOnly}
            onChange={(e) => setEntry(s => ({ ...s, obsessionIntensity: parseInt(e.target.value, 10) }))}
            className="w-full accent-emerald-600 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">{t.beliefQuestion}</label>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold text-slate-300 dark:text-slate-500 uppercase">{t.beliefFalse}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={entry.thoughtBelief}
              disabled={readOnly}
              onChange={(e) => setEntry(s => ({ ...s, thoughtBelief: parseInt(e.target.value, 10) }))}
              className="flex-1 accent-slate-700 dark:accent-slate-300 h-1 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[9px] font-bold text-slate-300 dark:text-slate-500 uppercase">{t.beliefReal}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-rose-50 dark:border-rose-900/40 text-center">
          <Zap size={18} className="mx-auto mb-1 text-rose-500" />
          <span className="block text-[9px] font-black text-slate-400 uppercase mb-2">{t.rituals}</span>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setEntry(s => ({ ...s, compulsionFrequency: Math.max(0, s.compulsionFrequency - 1) }))}
              disabled={readOnly || entry.compulsionFrequency === 0}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600 text-slate-400 disabled:opacity-40"
            >−</button>
            <span className="text-xl font-black text-slate-800 dark:text-slate-100 w-6 text-center">{entry.compulsionFrequency}</span>
            <button
              onClick={() => setEntry(s => ({ ...s, compulsionFrequency: s.compulsionFrequency + 1 }))}
              disabled={readOnly}
              className="w-8 h-8 rounded-full bg-rose-500 text-white shadow disabled:opacity-40"
            >+</button>
          </div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900 text-center">
          <ShieldCheck size={18} className="mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
          <span className="block text-[9px] font-black text-emerald-700 dark:text-emerald-300 uppercase mb-2">{t.resistances}</span>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setEntry(s => ({ ...s, resistanceCount: Math.max(0, s.resistanceCount - 1) }))}
              disabled={readOnly || entry.resistanceCount === 0}
              className="w-8 h-8 rounded-full border border-emerald-200 dark:border-emerald-800 text-emerald-400 disabled:opacity-40"
            >−</button>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 w-6 text-center">{entry.resistanceCount}</span>
            <button
              onClick={() => setEntry(s => ({ ...s, resistanceCount: s.resistanceCount + 1 }))}
              disabled={readOnly}
              className="w-8 h-8 rounded-full bg-emerald-600 text-white shadow disabled:opacity-40"
            >+</button>
          </div>
        </div>
      </div>

      <section className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-500" /> {t.suds}
          </label>
          <span className="text-lg font-black text-slate-800 dark:text-slate-100">{entry.sudsLevel}/10</span>
        </div>
        <div className="flex justify-between gap-1">
          {Array.from({ length: 11 }).map((_, v) => (
            <button
              key={v}
              onClick={() => setEntry(s => ({ ...s, sudsLevel: v }))}
              disabled={readOnly}
              className={`flex-1 h-8 rounded text-[9px] font-bold transition-all ${
                entry.sudsLevel >= v
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-500'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-2 ml-1">
          <MessageSquare size={14} className="text-slate-400" />
          <label className="text-[10px] font-black text-slate-400 uppercase">{t.triggerLabel}</label>
        </div>
        <textarea
          value={entry.triggerContext}
          disabled={readOnly}
          onChange={(e) => setEntry(s => ({ ...s, triggerContext: e.target.value }))}
          placeholder={t.triggerPlaceholder}
          className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40 outline-none h-24 resize-none shadow-sm placeholder:text-slate-400"
        />
      </section>

      {!readOnly && (
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg hover:bg-black dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {status === 'saving' ? (
            <><Loader2 size={18} className="animate-spin" /> {t.saving}</>
          ) : status === 'saved' ? (
            <><CheckCircle2 size={18} /> {t.saved}</>
          ) : (
            t.save
          )}
        </button>
      )}

      {errorMsg && (
        <p className="text-xs text-rose-600 dark:text-rose-400 text-center">{errorMsg}</p>
      )}
    </div>
  );
};

export default OCDTracker;
