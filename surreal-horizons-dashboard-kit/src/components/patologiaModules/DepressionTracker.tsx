import React, { useEffect, useState } from 'react';
import { Battery, CloudRain, Brain, CheckCircle2, MessageSquare, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MODULE_COLLECTIONS } from './shared';
import { PatologiaModuleProps } from '../../utils/patologiaModules';
import { Language } from '../../types';

interface DepressionEntry {
  moodIntensity: number;       // 1-10
  energyLevel: number;         // 1-10
  anhedonia: number;           // 1, 3, 5
  socialInteraction: boolean;
  appetiteChange: 'increased' | 'normal' | 'decreased';
  notes: string;
  updatedAt?: number;
  dateKey?: string;
}

const DEFAULT_ENTRY: DepressionEntry = {
  moodIntensity: 5,
  energyLevel: 5,
  anhedonia: 3,
  socialInteraction: false,
  appetiteChange: 'normal',
  notes: '',
};

const STR: Record<'es' | 'en', {
  moodLevel: string;
  moodVeryLow: string;
  moodStable: string;
  moodVeryHigh: string;
  energyLabel: string;
  energyDrained: string;
  energyNormal: string;
  energyOptimal: string;
  interestLabel: string;
  interestOptions: { v: number; l: string }[];
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saved: string;
  errorSaving: string;
}> = {
  es: {
    moodLevel: 'Nivel de Ánimo',
    moodVeryLow: 'Muy Bajo',
    moodStable: 'Estable',
    moodVeryHigh: 'Muy Alto',
    energyLabel: 'Batería Social/Física',
    energyDrained: 'Agotada',
    energyNormal: 'Normal',
    energyOptimal: 'Óptima',
    interestLabel: 'Interés por actividades',
    interestOptions: [
      { v: 1, l: 'Mucho interés y placer hoy' },
      { v: 3, l: 'Algo de desinterés / apatía' },
      { v: 5, l: 'Nada me ha causado placer' },
    ],
    notesLabel: 'Pensamientos o Eventos',
    notesPlaceholder: '¿Algún pensamiento recurrente o evento que haya afectado tu ánimo?',
    save: 'Actualizar Estado Mental',
    saved: 'Registro guardado',
    errorSaving: 'No se pudo guardar. Intentalo de nuevo.',
  },
  en: {
    moodLevel: 'Mood Level',
    moodVeryLow: 'Very Low',
    moodStable: 'Stable',
    moodVeryHigh: 'Very High',
    energyLabel: 'Social/Physical Battery',
    energyDrained: 'Drained',
    energyNormal: 'Normal',
    energyOptimal: 'Optimal',
    interestLabel: 'Interest in activities',
    interestOptions: [
      { v: 1, l: 'Lots of interest and pleasure today' },
      { v: 3, l: 'Some disinterest / apathy' },
      { v: 5, l: 'Nothing has given me pleasure' },
    ],
    notesLabel: 'Thoughts or Events',
    notesPlaceholder: 'Any recurring thought or event that affected your mood?',
    save: 'Update Mental State',
    saved: 'Entry saved',
    errorSaving: 'Could not save. Please try again.',
  },
};

const pickLang = (language: Language): 'es' | 'en' => (language === 'es' ? 'es' : 'en');

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const DepressionTracker: React.FC<PatologiaModuleProps> = ({ userId, dateKey, readOnly, language }) => {
  const t = STR[pickLang(language)];
  const [entry, setEntry] = useState<DepressionEntry>(DEFAULT_ENTRY);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!db || !userId) { setStatus('idle'); return; }
      try {
        setStatus('loading');
        const ref = doc(db, MODULE_COLLECTIONS.users, userId, MODULE_COLLECTIONS.depression, dateKey);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as Partial<DepressionEntry>;
          setEntry({ ...DEFAULT_ENTRY, ...data });
        } else {
          setEntry(DEFAULT_ENTRY);
        }
        setStatus('idle');
      } catch (err) {
        console.error('DepressionTracker load error', err);
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
      const ref = doc(db, MODULE_COLLECTIONS.users, userId, MODULE_COLLECTIONS.depression, dateKey);
      await setDoc(ref, { ...entry, dateKey, updatedAt: Date.now() }, { merge: true });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('DepressionTracker save error', err);
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

  const energyBadge = entry.energyLevel < 4
    ? { label: t.energyDrained, cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' }
    : entry.energyLevel < 8
    ? { label: t.energyNormal, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
    : { label: t.energyOptimal, cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' };

  return (
    <div className={`p-5 space-y-6 ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
      <section>
        <div className="flex justify-between items-end mb-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <CloudRain size={14} className="text-sky-500" /> {t.moodLevel}
          </label>
          <span className="text-2xl font-black text-sky-700 dark:text-sky-400">{entry.moodIntensity}/10</span>
        </div>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 10 }).map((_, i) => {
            const active = entry.moodIntensity > i;
            return (
              <button
                key={i}
                onClick={() => setEntry(s => ({ ...s, moodIntensity: i + 1 }))}
                disabled={readOnly}
                className={`h-9 rounded-lg text-[10px] font-bold transition-all ${
                  active
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-slate-400 mt-2 font-bold uppercase italic">
          <span>{t.moodVeryLow}</span>
          <span>{t.moodStable}</span>
          <span>{t.moodVeryHigh}</span>
        </div>
      </section>

      <section className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Battery size={16} className="text-emerald-500" /> {t.energyLabel}
          </label>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${energyBadge.cls}`}>
            {energyBadge.label}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={entry.energyLevel}
          disabled={readOnly}
          onChange={(e) => setEntry(s => ({ ...s, energyLevel: parseInt(e.target.value, 10) }))}
          className="w-full accent-emerald-500 h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
      </section>

      <section>
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Brain size={14} className="text-indigo-500" /> {t.interestLabel}
        </label>
        <div className="space-y-2">
          {t.interestOptions.map(opt => {
            const active = entry.anhedonia === opt.v;
            return (
              <button
                key={opt.v}
                onClick={() => setEntry(s => ({ ...s, anhedonia: opt.v }))}
                disabled={readOnly}
                className={`w-full p-3.5 rounded-2xl text-left text-xs font-bold border transition-all ${
                  active
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                }`}
              >
                {opt.l}
              </button>
            );
          })}
        </div>
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
          className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 outline-none h-24 resize-none placeholder:text-slate-400"
        />
      </section>

      {!readOnly && (
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-4 bg-sky-900 dark:bg-sky-700 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-black dark:hover:bg-sky-600 transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-70"
        >
          {status === 'saving' ? (
            <Loader2 size={18} className="animate-spin" />
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

export default DepressionTracker;
