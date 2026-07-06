import React, { useEffect, useState } from 'react';
import { Pill, Ghost, Focus, CheckCircle2, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MODULE_COLLECTIONS } from './shared';
import { PatologiaModuleProps } from '../../utils/patologiaModules';
import { Language } from '../../types';

interface SchizoEntry {
  medicationTaken: boolean;
  sideEffects: number;             // 0-5
  auditoryHallucinations: number;  // 0-5
  ideasOfReference: number;        // 0-5
  thoughtControl: number;          // 0-5
  anhedonia: number;               // 0-5
  avolition: number;               // 0-5
  concentration: number;           // 1-5
  stressLevel: number;             // 0-5
  notes: string;
  updatedAt?: number;
  dateKey?: string;
}

const DEFAULT_ENTRY: SchizoEntry = {
  medicationTaken: true,
  sideEffects: 0,
  auditoryHallucinations: 0,
  ideasOfReference: 0,
  thoughtControl: 0,
  anhedonia: 0,
  avolition: 0,
  concentration: 3,
  stressLevel: 0,
  notes: '',
};

const STR: Record<'es' | 'en', {
  treatmentHeader: string;
  taken: string;
  missed: string;
  sensoryHeader: string;
  voices: string;
  ideasOfReference: string;
  cognitiveHeader: string;
  focus: string;
  stress: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
  saved: string;
  errorSaving: string;
}> = {
  es: {
    treatmentHeader: 'Tratamiento',
    taken: 'Tomada',
    missed: 'Omitida',
    sensoryHeader: 'Experiencias Sensoriales',
    voices: 'Voces / Alucinaciones',
    ideasOfReference: 'Ideas de Referencia (Sospechas)',
    cognitiveHeader: 'Capacidad Cognitiva',
    focus: 'Nivel de Foco',
    stress: 'Nivel de Tensión / Estrés',
    notesPlaceholder: 'Describe cualquier cambio en el contenido de tus pensamientos...',
    save: 'Finalizar Reporte',
    saving: 'Procesando...',
    saved: 'Evaluación guardada',
    errorSaving: 'No se pudo guardar. Intentalo de nuevo.',
  },
  en: {
    treatmentHeader: 'Treatment',
    taken: 'Taken',
    missed: 'Missed',
    sensoryHeader: 'Sensory Experiences',
    voices: 'Voices / Hallucinations',
    ideasOfReference: 'Ideas of Reference (Suspicion)',
    cognitiveHeader: 'Cognitive Capacity',
    focus: 'Focus Level',
    stress: 'Tension / Stress Level',
    notesPlaceholder: 'Describe any changes in the content of your thoughts...',
    save: 'Finalize Report',
    saving: 'Processing...',
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
  badgeClass: string;
  disabled: boolean;
  min?: number;
  max?: number;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, onChange, badgeClass, disabled, min = 0, max = 5 }) => (
  <div className="mb-5 last:mb-0">
    <div className="flex justify-between items-center mb-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <span className={`font-black text-sm px-2 py-0.5 rounded ${badgeClass}`}>{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={1}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-700 dark:accent-slate-300"
    />
  </div>
);

const SchizophreniaTracker: React.FC<PatologiaModuleProps> = ({ userId, dateKey, readOnly, language }) => {
  const t = STR[pickLang(language)];
  const [entry, setEntry] = useState<SchizoEntry>(DEFAULT_ENTRY);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!db || !userId) { setStatus('idle'); return; }
      try {
        setStatus('loading');
        const ref = doc(db, MODULE_COLLECTIONS.users, userId, MODULE_COLLECTIONS.schizophrenia, dateKey);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as Partial<SchizoEntry>;
          setEntry({ ...DEFAULT_ENTRY, ...data });
        } else {
          setEntry(DEFAULT_ENTRY);
        }
        setStatus('idle');
      } catch (err) {
        console.error('SchizophreniaTracker load error', err);
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
      const ref = doc(db, MODULE_COLLECTIONS.users, userId, MODULE_COLLECTIONS.schizophrenia, dateKey);
      await setDoc(ref, { ...entry, dateKey, updatedAt: Date.now() }, { merge: true });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('SchizophreniaTracker save error', err);
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
      <section className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Pill className="text-emerald-500" size={18} />
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{t.treatmentHeader}</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setEntry(s => ({ ...s, medicationTaken: true }))}
            disabled={readOnly}
            className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
              entry.medicationTaken
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-50 dark:bg-slate-900/40 text-slate-400'
            }`}
          >
            {t.taken}
          </button>
          <button
            onClick={() => setEntry(s => ({ ...s, medicationTaken: false }))}
            disabled={readOnly}
            className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
              !entry.medicationTaken
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-50 dark:bg-slate-900/40 text-slate-400'
            }`}
          >
            {t.missed}
          </button>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Ghost className="text-purple-600 dark:text-purple-400" size={18} />
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{t.sensoryHeader}</h3>
        </div>
        <SliderRow
          label={t.voices}
          value={entry.auditoryHallucinations}
          onChange={(v) => setEntry(s => ({ ...s, auditoryHallucinations: v }))}
          badgeClass="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
          disabled={readOnly}
        />
        <SliderRow
          label={t.ideasOfReference}
          value={entry.ideasOfReference}
          onChange={(v) => setEntry(s => ({ ...s, ideasOfReference: v }))}
          badgeClass="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
          disabled={readOnly}
        />
      </section>

      <section className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
          <Focus size={18} />
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{t.cognitiveHeader}</h3>
        </div>
        <SliderRow
          label={t.focus}
          value={entry.concentration}
          onChange={(v) => setEntry(s => ({ ...s, concentration: v }))}
          badgeClass="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          disabled={readOnly}
          min={1}
        />
        <SliderRow
          label={t.stress}
          value={entry.stressLevel}
          onChange={(v) => setEntry(s => ({ ...s, stressLevel: v }))}
          badgeClass="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          disabled={readOnly}
        />
      </section>

      <textarea
        value={entry.notes}
        disabled={readOnly}
        onChange={(e) => setEntry(s => ({ ...s, notes: e.target.value }))}
        placeholder={t.notesPlaceholder}
        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 text-sm text-slate-700 dark:text-slate-200 min-h-[110px] outline-none shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-500 resize-none"
      />

      {!readOnly && (
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-black dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
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

export default SchizophreniaTracker;
