import React, { useEffect, useState } from 'react';
import { Zap, MessageSquare, CheckCircle2, AlertTriangle, Moon, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MODULE_COLLECTIONS } from './shared';
import { PatologiaModuleProps } from '../../utils/patologiaModules';
import { Language } from '../../types';

interface BipolarEntry {
  globalMood: number;          // -5..+5
  energyLevel: number;         // 1..10
  sleepHours: number;
  irritability: number;        // 0/1/3/5
  racingThoughts: boolean;
  medicationAdherence: boolean;
  notes: string;
  updatedAt?: number;
  dateKey?: string;
}

const DEFAULT_ENTRY: BipolarEntry = {
  globalMood: 0,
  energyLevel: 5,
  sleepHours: 7,
  irritability: 0,
  racingThoughts: false,
  medicationAdherence: true,
  notes: '',
};

const STR: Record<'es' | 'en', {
  depression: string;
  stable: string;
  mania: string;
  moodLabels: (v: number) => string;
  energy: string;
  irritability: string;
  irritabilityLevels: { v: number; l: string }[];
  sleepHours: string;
  sleepHint: string;
  medTaken: string;
  medMissed: string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
  saved: string;
  errorSaving: string;
}> = {
  es: {
    depression: 'Depresión',
    stable: 'Estable',
    mania: 'Manía',
    moodLabels: (v) => {
      if (v < -3) return 'Depresión Profunda';
      if (v < 0) return 'Ánimo Bajo';
      if (v === 0) return 'Estable (Eutimia)';
      if (v < 3) return 'Hipomanía / Elevado';
      return 'Manía / Muy Elevado';
    },
    energy: 'Energía (1-10)',
    irritability: 'Irritabilidad',
    irritabilityLevels: [
      { v: 0, l: 'Ninguna' },
      { v: 1, l: 'Leve' },
      { v: 3, l: 'Moderada' },
      { v: 5, l: 'Alta' },
    ],
    sleepHours: 'Horas Sueño',
    sleepHint: 'Métrica clave para recaídas',
    medTaken: 'Medicación Tomada',
    medMissed: 'Medicación Omitida',
    notesLabel: 'Observaciones',
    notesPlaceholder: '¿Sentiste pensamientos acelerados hoy o tuviste gastos impulsivos?',
    save: 'Sincronizar Datos Clínicos',
    saving: 'Sincronizando...',
    saved: 'Registro guardado',
    errorSaving: 'No se pudo guardar. Intentalo de nuevo.',
  },
  en: {
    depression: 'Depression',
    stable: 'Stable',
    mania: 'Mania',
    moodLabels: (v) => {
      if (v < -3) return 'Deep Depression';
      if (v < 0) return 'Low Mood';
      if (v === 0) return 'Stable (Euthymia)';
      if (v < 3) return 'Hypomania / Elevated';
      return 'Mania / Very Elevated';
    },
    energy: 'Energy (1-10)',
    irritability: 'Irritability',
    irritabilityLevels: [
      { v: 0, l: 'None' },
      { v: 1, l: 'Mild' },
      { v: 3, l: 'Moderate' },
      { v: 5, l: 'High' },
    ],
    sleepHours: 'Sleep Hours',
    sleepHint: 'Key marker for relapses',
    medTaken: 'Medication Taken',
    medMissed: 'Medication Missed',
    notesLabel: 'Observations',
    notesPlaceholder: 'Did you have racing thoughts or impulsive spending today?',
    save: 'Sync Clinical Data',
    saving: 'Syncing...',
    saved: 'Entry saved',
    errorSaving: 'Could not save. Please try again.',
  },
};

const pickLang = (language: Language): 'es' | 'en' => (language === 'es' ? 'es' : 'en');

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const clampEnergy = (n: number) => Math.min(10, Math.max(1, Math.round(n)));
const clampSleep = (n: number) => {
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 24) return 24;
  return Math.round(n * 2) / 2;
};

const BipolarTracker: React.FC<PatologiaModuleProps> = ({ userId, dateKey, readOnly, language }) => {
  const t = STR[pickLang(language)];
  const [entry, setEntry] = useState<BipolarEntry>(DEFAULT_ENTRY);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!db || !userId) { setStatus('idle'); return; }
      try {
        setStatus('loading');
        const ref = doc(db, MODULE_COLLECTIONS.users, userId, MODULE_COLLECTIONS.bipolar, dateKey);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as Partial<BipolarEntry>;
          setEntry({ ...DEFAULT_ENTRY, ...data });
        } else {
          setEntry(DEFAULT_ENTRY);
        }
        setStatus('idle');
      } catch (err) {
        console.error('BipolarTracker load error', err);
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
      const ref = doc(db, MODULE_COLLECTIONS.users, userId, MODULE_COLLECTIONS.bipolar, dateKey);
      await setDoc(ref, { ...entry, dateKey, updatedAt: Date.now() }, { merge: true });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('BipolarTracker save error', err);
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

  const moodLabelClass =
    entry.globalMood < 0
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
      : entry.globalMood > 0
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
      : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';

  return (
    <div className={`p-5 space-y-6 ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
      <section>
        <div className="text-center mb-4">
          <span className={`text-[11px] font-black uppercase px-4 py-1 rounded-full inline-block ${moodLabelClass}`}>
            {t.moodLabels(entry.globalMood)}
          </span>
          <div className="text-4xl font-black text-slate-800 dark:text-slate-100 mt-2">
            {entry.globalMood > 0 ? `+${entry.globalMood}` : entry.globalMood}
          </div>
        </div>
        <input
          type="range"
          min={-5}
          max={5}
          step={1}
          value={entry.globalMood}
          disabled={readOnly}
          onChange={(e) => setEntry(s => ({ ...s, globalMood: parseInt(e.target.value, 10) }))}
          className="w-full accent-violet-600 h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-slate-400 mt-2 font-black uppercase tracking-tighter">
          <span>{t.depression}</span>
          <span>{t.stable}</span>
          <span>{t.mania}</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <section className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
          <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">{t.energy}</label>
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-amber-500 shrink-0" />
            <input
              type="number"
              min={1}
              max={10}
              value={entry.energyLevel}
              disabled={readOnly}
              onChange={(e) => setEntry(s => ({ ...s, energyLevel: clampEnergy(parseInt(e.target.value, 10) || 0) }))}
              className="w-full bg-transparent font-black text-xl text-slate-800 dark:text-slate-100 outline-none"
            />
          </div>
        </section>

        <section className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
          <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">{t.irritability}</label>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-500 shrink-0" />
            <select
              value={entry.irritability}
              disabled={readOnly}
              onChange={(e) => setEntry(s => ({ ...s, irritability: parseInt(e.target.value, 10) }))}
              className="w-full bg-transparent font-black text-sm text-slate-800 dark:text-slate-100 outline-none appearance-none"
            >
              {t.irritabilityLevels.map(it => (
                <option key={it.v} value={it.v} className="bg-white dark:bg-slate-800">{it.l}</option>
              ))}
            </select>
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-violet-50 dark:bg-violet-950/30 rounded-2xl border border-violet-100 dark:border-violet-900">
          <div className="flex items-center gap-3">
            <Moon size={18} className="text-violet-600 dark:text-violet-400" />
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-violet-900 dark:text-violet-200 uppercase">{t.sleepHours}</span>
              <span className="text-[9px] text-violet-500 dark:text-violet-400">{t.sleepHint}</span>
            </div>
          </div>
          <input
            type="number"
            step={0.5}
            min={0}
            max={24}
            value={entry.sleepHours}
            disabled={readOnly}
            onChange={(e) => setEntry(s => ({ ...s, sleepHours: clampSleep(parseFloat(e.target.value)) }))}
            className="w-16 bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 rounded-lg p-2 font-black text-center text-violet-700 dark:text-violet-300 text-sm shadow-sm"
          />
        </div>

        <button
          onClick={() => setEntry(s => ({ ...s, medicationAdherence: !s.medicationAdherence }))}
          disabled={readOnly}
          className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all border ${
            entry.medicationAdherence
              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
          }`}
        >
          <span className={`text-xs font-bold uppercase ${
            entry.medicationAdherence
              ? 'text-green-700 dark:text-green-300'
              : 'text-rose-700 dark:text-rose-300'
          }`}>
            {entry.medicationAdherence ? t.medTaken : t.medMissed}
          </span>
          <div className={`w-12 h-6 rounded-full relative transition-colors ${
            entry.medicationAdherence ? 'bg-green-600' : 'bg-rose-300 dark:bg-rose-800'
          }`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
              entry.medicationAdherence ? 'right-1' : 'left-1'
            }`} />
          </div>
        </button>
      </section>

      <section>
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <MessageSquare size={14} /> {t.notesLabel}
        </label>
        <textarea
          value={entry.notes}
          disabled={readOnly}
          onChange={(e) => setEntry(s => ({ ...s, notes: e.target.value }))}
          placeholder={t.notesPlaceholder}
          className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/40 outline-none h-24 resize-none placeholder:text-slate-400"
        />
      </section>

      {!readOnly && (
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-black dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
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

export default BipolarTracker;
