import React, { useEffect, useState } from 'react';
import { Moon, Sun, Clock, Coffee, Sparkles, CheckCircle2, Zap, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { PatologiaModuleProps } from '../../utils/patologiaModules';
import { Language } from '../../types';

interface SleepEntry {
  bedTime: string;
  wakeTime: string;
  sleepLatency: number;
  awakeningsCount: number;
  sleepQuality: number;      // 1-5
  daytimeSleepiness: number; // 1-5
  usedMedication: boolean;
  caffeineIntake: number;
  updatedAt?: number;
  dateKey?: string;
}

const DEFAULT_ENTRY: SleepEntry = {
  bedTime: '23:00',
  wakeTime: '07:00',
  sleepLatency: 20,
  awakeningsCount: 0,
  sleepQuality: 3,
  daytimeSleepiness: 2,
  usedMedication: false,
  caffeineIntake: 0,
};

const STR: Record<'es' | 'en', {
  bedLabel: string;
  wakeLabel: string;
  latency: string;
  awakenings: string;
  quality: string;
  qualityPoor: string;
  qualityPeak: string;
  medication: string;
  caffeine: string;
  cups: string;
  daytime: string;
  daytimeHint: string;
  save: string;
  saving: string;
  saved: string;
  errorSaving: string;
}> = {
  es: {
    bedLabel: 'Hora Acostado',
    wakeLabel: 'Hora Despertado',
    latency: 'Minutos para dormir',
    awakenings: 'Despertares',
    quality: 'Calidad de hoy',
    qualityPoor: 'Pobre',
    qualityPeak: 'Excepcional',
    medication: '¿Medicación?',
    caffeine: 'Tazas',
    cups: 'Tazas',
    daytime: 'Somnolencia Diurna',
    daytimeHint: '¿Qué tanto sueño sentiste durante el día hoy?',
    save: 'Finalizar Diario',
    saving: 'Sincronizando...',
    saved: 'Registro guardado',
    errorSaving: 'No se pudo guardar. Intentalo de nuevo.',
  },
  en: {
    bedLabel: 'Bed Time',
    wakeLabel: 'Wake Time',
    latency: 'Minutes to sleep',
    awakenings: 'Awakenings',
    quality: "Today's quality",
    qualityPoor: 'Poor',
    qualityPeak: 'Exceptional',
    medication: 'Medication?',
    caffeine: 'Cups',
    cups: 'Cups',
    daytime: 'Daytime Sleepiness',
    daytimeHint: 'How sleepy did you feel during the day?',
    save: 'Finalize Diary',
    saving: 'Syncing...',
    saved: 'Entry saved',
    errorSaving: 'Could not save. Please try again.',
  },
};

const pickLang = (language: Language): 'es' | 'en' => (language === 'es' ? 'es' : 'en');

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const SleepTracker: React.FC<PatologiaModuleProps> = ({ userId, dateKey, readOnly, language }) => {
  const t = STR[pickLang(language)];
  const [entry, setEntry] = useState<SleepEntry>(DEFAULT_ENTRY);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!db || !userId) { setStatus('idle'); return; }
      try {
        setStatus('loading');
        const ref = doc(db, 'users', userId, 'deepClinicalLogsSleep', dateKey);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          setEntry({ ...DEFAULT_ENTRY, ...(snap.data() as Partial<SleepEntry>) });
        } else {
          setEntry(DEFAULT_ENTRY);
        }
        setStatus('idle');
      } catch (err) {
        console.error('SleepTracker load error', err);
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
      const ref = doc(db, 'users', userId, 'deepClinicalLogsSleep', dateKey);
      await setDoc(ref, { ...entry, dateKey, updatedAt: Date.now() }, { merge: true });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('SleepTracker save error', err);
      setErrorMsg(t.errorSaving);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return <div className="p-6 flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={20} /></div>;
  }

  return (
    <div className={`p-5 space-y-5 ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
      <div className="grid grid-cols-2 gap-3">
        <section className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Moon size={14} className="text-indigo-500" />
            <label className="text-[10px] font-black text-slate-500 uppercase">{t.bedLabel}</label>
          </div>
          <input
            type="time"
            value={entry.bedTime}
            disabled={readOnly}
            onChange={(e) => setEntry(s => ({ ...s, bedTime: e.target.value }))}
            className="bg-transparent text-xl font-black text-slate-800 dark:text-slate-100 w-full outline-none"
          />
        </section>

        <section className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Sun size={14} className="text-amber-500" />
            <label className="text-[10px] font-black text-slate-500 uppercase">{t.wakeLabel}</label>
          </div>
          <input
            type="time"
            value={entry.wakeTime}
            disabled={readOnly}
            onChange={(e) => setEntry(s => ({ ...s, wakeTime: e.target.value }))}
            className="bg-transparent text-xl font-black text-slate-800 dark:text-slate-100 w-full outline-none"
          />
        </section>
      </div>

      <section className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t.latency}</label>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-indigo-500 shrink-0" />
            <input
              type="number"
              min={0}
              step={5}
              value={entry.sleepLatency}
              disabled={readOnly}
              onChange={(e) => setEntry(s => ({ ...s, sleepLatency: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 w-full text-center font-black text-indigo-600 dark:text-indigo-400 text-base"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t.awakenings}</label>
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setEntry(s => ({ ...s, awakeningsCount: Math.max(0, s.awakeningsCount - 1) }))}
              disabled={readOnly || entry.awakeningsCount === 0}
              className="w-9 h-9 rounded-lg text-slate-400 font-black disabled:opacity-40"
            >−</button>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100">{entry.awakeningsCount}</span>
            <button
              onClick={() => setEntry(s => ({ ...s, awakeningsCount: s.awakeningsCount + 1 }))}
              disabled={readOnly}
              className="w-9 h-9 rounded-lg bg-indigo-600 text-white font-black disabled:opacity-40"
            >+</button>
          </div>
        </div>
      </section>

      <section>
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-indigo-500" /> {t.quality}
        </label>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map(v => (
            <button
              key={v}
              onClick={() => setEntry(s => ({ ...s, sleepQuality: v }))}
              disabled={readOnly}
              className={`flex items-center justify-center py-3 rounded-xl transition-all border ${
                entry.sleepQuality === v
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
              }`}
            >
              <span className="text-lg font-black">{v}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase mt-1 px-1">
          <span>{t.qualityPoor}</span>
          <span>{t.qualityPeak}</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setEntry(s => ({ ...s, usedMedication: !s.usedMedication }))}
          disabled={readOnly}
          className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
            entry.usedMedication
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300'
              : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
        >
          <label className="text-[10px] font-black uppercase">{t.medication}</label>
          <div className={`w-3 h-3 rounded-full ${entry.usedMedication ? 'bg-indigo-500 shadow-[0_0_10px_rgba(129,140,248,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`} />
        </button>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Coffee size={18} className="text-amber-600" />
          <input
            type="number"
            min={0}
            value={entry.caffeineIntake}
            disabled={readOnly}
            onChange={(e) => setEntry(s => ({ ...s, caffeineIntake: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
            className="bg-transparent text-lg font-black text-amber-600 dark:text-amber-400 w-full outline-none"
          />
          <span className="text-[9px] font-bold text-slate-500 uppercase">{t.cups}</span>
        </div>
      </div>

      <section className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-amber-500" />
          <label className="text-[10px] font-black text-slate-500 uppercase">{t.daytime}</label>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          value={entry.daytimeSleepiness}
          disabled={readOnly}
          onChange={(e) => setEntry(s => ({ ...s, daytimeSleepiness: parseInt(e.target.value, 10) }))}
          className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
        <p className="text-[9px] text-slate-500 mt-2 text-center italic">{t.daytimeHint}</p>
      </section>

      {!readOnly && (
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.3em] shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
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

export default SleepTracker;
