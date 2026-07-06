import React, { useEffect, useState } from 'react';
import { Zap, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MODULE_COLLECTIONS } from './shared';
import { PatologiaModuleProps } from '../../utils/patologiaModules';
import { Language } from '../../types';

interface AnxietyEntry {
  generalAnxiety: number;
  panicEpisodes: number;
  physicalSymptoms: string[];
  anticipatoryAnxiety: number;
  avoidanceBehavior: boolean;
  notes: string;
  updatedAt?: number;
  dateKey?: string;
}

const DEFAULT_ENTRY: AnxietyEntry = {
  generalAnxiety: 50,
  panicEpisodes: 0,
  physicalSymptoms: [],
  anticipatoryAnxiety: 3,
  avoidanceBehavior: false,
  notes: '',
};

const SYMPTOMS = ['palpitations', 'muscleTension', 'sweating', 'shortness', 'chestPressure', 'dizziness'] as const;
type SymptomKey = typeof SYMPTOMS[number];

const STR: Record<'es' | 'en', {
  generalAnxiety: string;
  panicEpisodes: string;
  panicQuestion: string;
  somaticSymptoms: string;
  triggersNotes: string;
  notesPlaceholder: string;
  save: string;
  saved: string;
  retry: string;
  errorSaving: string;
  symptoms: Record<SymptomKey, string>;
}> = {
  es: {
    generalAnxiety: 'Ansiedad General',
    panicEpisodes: 'Episodios de Pánico',
    panicQuestion: '¿Cuántos tuviste hoy?',
    somaticSymptoms: 'Síntomas Somáticos',
    triggersNotes: 'Disparadores y Notas',
    notesPlaceholder: '¿Hubo algo en especial que te haya puesto ansioso?',
    save: 'Guardar Registro',
    saved: 'Registro guardado',
    retry: 'Volver a editar',
    errorSaving: 'No se pudo guardar. Intentalo de nuevo.',
    symptoms: {
      palpitations: 'Palpitaciones',
      muscleTension: 'Tensión muscular',
      sweating: 'Sudoración',
      shortness: 'Falta de aire',
      chestPressure: 'Presión en pecho',
      dizziness: 'Mareos',
    },
  },
  en: {
    generalAnxiety: 'General Anxiety',
    panicEpisodes: 'Panic Episodes',
    panicQuestion: 'How many today?',
    somaticSymptoms: 'Somatic Symptoms',
    triggersNotes: 'Triggers & Notes',
    notesPlaceholder: 'Was there something in particular that made you anxious?',
    save: 'Save Entry',
    saved: 'Entry saved',
    retry: 'Edit again',
    errorSaving: 'Could not save. Please try again.',
    symptoms: {
      palpitations: 'Palpitations',
      muscleTension: 'Muscle tension',
      sweating: 'Sweating',
      shortness: 'Shortness of breath',
      chestPressure: 'Chest pressure',
      dizziness: 'Dizziness',
    },
  },
};

const pickLang = (language: Language): 'es' | 'en' => (language === 'es' ? 'es' : 'en');

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const AnxietyTracker: React.FC<PatologiaModuleProps> = ({ userId, dateKey, readOnly, language }) => {
  const t = STR[pickLang(language)];
  const [entry, setEntry] = useState<AnxietyEntry>(DEFAULT_ENTRY);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!db || !userId) {
        setStatus('idle');
        return;
      }
      try {
        setStatus('loading');
        const ref = doc(db, MODULE_COLLECTIONS.users, userId, MODULE_COLLECTIONS.anxiety, dateKey);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as Partial<AnxietyEntry>;
          setEntry({ ...DEFAULT_ENTRY, ...data });
        } else {
          setEntry(DEFAULT_ENTRY);
        }
        setStatus('idle');
      } catch (err) {
        console.error('AnxietyTracker load error', err);
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
      const ref = doc(db, MODULE_COLLECTIONS.users, userId, MODULE_COLLECTIONS.anxiety, dateKey);
      await setDoc(ref, { ...entry, dateKey, updatedAt: Date.now() }, { merge: true });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err: unknown) {
      console.error('AnxietyTracker save error', err);
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

  const toggleSymptom = (key: SymptomKey) => {
    if (readOnly) return;
    setEntry(e => ({
      ...e,
      physicalSymptoms: e.physicalSymptoms.includes(key)
        ? e.physicalSymptoms.filter(x => x !== key)
        : [...e.physicalSymptoms, key],
    }));
  };

  return (
    <div className={`p-5 space-y-6 ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
      <section>
        <div className="flex justify-between items-end mb-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Zap size={14} className="text-orange-500" /> {t.generalAnxiety}
          </label>
          <span className="text-2xl font-black text-orange-600 dark:text-orange-400">{entry.generalAnxiety}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={entry.generalAnxiety}
          disabled={readOnly}
          onChange={(e) => setEntry(s => ({ ...s, generalAnxiety: parseInt(e.target.value, 10) }))}
          className="w-full accent-orange-600 h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
      </section>

      <section className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.panicEpisodes}</h3>
          <p className="text-[10px] text-slate-400">{t.panicQuestion}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEntry(s => ({ ...s, panicEpisodes: Math.max(0, s.panicEpisodes - 1) }))}
            disabled={readOnly || entry.panicEpisodes === 0}
            className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40"
          >−</button>
          <span className="text-xl font-black text-slate-800 dark:text-slate-100 w-6 text-center">{entry.panicEpisodes}</span>
          <button
            onClick={() => setEntry(s => ({ ...s, panicEpisodes: s.panicEpisodes + 1 }))}
            disabled={readOnly}
            className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md disabled:opacity-40"
          >+</button>
        </div>
      </section>

      <section>
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
          {t.somaticSymptoms}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SYMPTOMS.map(key => {
            const selected = entry.physicalSymptoms.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleSymptom(key)}
                disabled={readOnly}
                className={`p-3 text-[11px] font-bold rounded-xl border transition-all text-left ${
                  selected
                    ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:border-orange-200 dark:hover:border-orange-500/40'
                }`}
              >
                {t.symptoms[key]}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <MessageSquare size={14} /> {t.triggersNotes}
        </label>
        <textarea
          value={entry.notes}
          disabled={readOnly}
          onChange={(e) => setEntry(s => ({ ...s, notes: e.target.value }))}
          placeholder={t.notesPlaceholder}
          className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/40 outline-none h-24 resize-none placeholder:text-slate-400"
        />
      </section>

      {!readOnly && (
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-3.5 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-bold shadow-lg hover:bg-black dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
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

export default AnxietyTracker;
