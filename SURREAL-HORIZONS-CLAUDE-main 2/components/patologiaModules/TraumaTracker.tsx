import React, { useEffect, useState } from 'react';
import { Eye, Wind, MessageSquare, CheckCircle2, Zap, ShieldAlert, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { PatologiaModuleProps } from '../../utils/patologiaModules';
import { Language } from '../../types';

interface TraumaEntry {
  intrusionFrequency: number;   // 0-5
  hypervigilanceLevel: number;  // 0-10
  avoidanceBehavior: boolean;
  dissociationLevel: number;    // 0/2/5
  physicalTension: number;      // 0-5
  groundingSuccess: boolean;
  notes: string;
  updatedAt?: number;
  dateKey?: string;
}

const DEFAULT_ENTRY: TraumaEntry = {
  intrusionFrequency: 0,
  hypervigilanceLevel: 5,
  avoidanceBehavior: false,
  dissociationLevel: 0,
  physicalTension: 3,
  groundingSuccess: true,
  notes: '',
};

const STR: Record<'es' | 'en', {
  intrusions: string;
  alertLevel: string;
  calm: string;
  maxAlert: string;
  dissociation: string;
  dissocOpts: { v: number; l: string }[];
  grounding: string;
  groundingHint: string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
  saved: string;
  errorSaving: string;
}> = {
  es: {
    intrusions: 'Intrusiones / Flashbacks',
    alertLevel: 'Nivel de Alerta / Tensión',
    calm: 'En Calma',
    maxAlert: 'Alerta Máxima',
    dissociation: 'Sensación de Desconexión',
    dissocOpts: [
      { v: 0, l: 'Presente y conectado' },
      { v: 2, l: "Algo distraído / 'en las nubes'" },
      { v: 5, l: 'Desconectado de mi cuerpo / entorno' },
    ],
    grounding: 'Técnicas de Anclaje',
    groundingHint: '¿Lograste volver al presente hoy?',
    notesLabel: 'Contexto y Disparadores',
    notesPlaceholder: '¿Algún olor, sonido o pensamiento disparó una memoria hoy?',
    save: 'Finalizar Registro',
    saving: 'Procesando...',
    saved: 'Registro guardado',
    errorSaving: 'No se pudo guardar. Intentalo de nuevo.',
  },
  en: {
    intrusions: 'Intrusions / Flashbacks',
    alertLevel: 'Alert / Tension Level',
    calm: 'Calm',
    maxAlert: 'Max Alert',
    dissociation: 'Disconnection Feeling',
    dissocOpts: [
      { v: 0, l: 'Present and connected' },
      { v: 2, l: "Somewhat distracted / 'spacey'" },
      { v: 5, l: 'Disconnected from body / surroundings' },
    ],
    grounding: 'Grounding Techniques',
    groundingHint: 'Did you manage to return to the present today?',
    notesLabel: 'Context and Triggers',
    notesPlaceholder: 'Did any smell, sound or thought trigger a memory today?',
    save: 'Finalize Entry',
    saving: 'Processing...',
    saved: 'Entry saved',
    errorSaving: 'Could not save. Please try again.',
  },
};

const pickLang = (language: Language): 'es' | 'en' => (language === 'es' ? 'es' : 'en');

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const TraumaTracker: React.FC<PatologiaModuleProps> = ({ userId, dateKey, readOnly, language }) => {
  const t = STR[pickLang(language)];
  const [entry, setEntry] = useState<TraumaEntry>(DEFAULT_ENTRY);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!db || !userId) { setStatus('idle'); return; }
      try {
        setStatus('loading');
        const ref = doc(db, 'users', userId, 'deepClinicalLogsTrauma', dateKey);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          setEntry({ ...DEFAULT_ENTRY, ...(snap.data() as Partial<TraumaEntry>) });
        } else {
          setEntry(DEFAULT_ENTRY);
        }
        setStatus('idle');
      } catch (err) {
        console.error('TraumaTracker load error', err);
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
      const ref = doc(db, 'users', userId, 'deepClinicalLogsTrauma', dateKey);
      await setDoc(ref, { ...entry, dateKey, updatedAt: Date.now() }, { merge: true });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('TraumaTracker save error', err);
      setErrorMsg(t.errorSaving);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return <div className="p-6 flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={20} /></div>;
  }

  return (
    <div className={`p-5 space-y-6 ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
      <section className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.intrusions}</label>
          </div>
          <span className="text-xl font-black text-slate-800 dark:text-slate-100">{entry.intrusionFrequency}</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4, 5].map(v => (
            <button
              key={v}
              onClick={() => setEntry(s => ({ ...s, intrusionFrequency: v }))}
              disabled={readOnly}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                entry.intrusionFrequency === v
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-slate-50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-500'
              }`}
            >{v === 5 ? '5+' : v}</button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-end mb-3 px-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert size={14} className="text-rose-500" /> {t.alertLevel}
          </label>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{entry.hypervigilanceLevel}/10</span>
        </div>
        <input
          type="range" min={0} max={10} step={1}
          value={entry.hypervigilanceLevel}
          disabled={readOnly}
          onChange={(e) => setEntry(s => ({ ...s, hypervigilanceLevel: parseInt(e.target.value, 10) }))}
          className="w-full accent-rose-600 h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-bold uppercase italic">
          <span>{t.calm}</span>
          <span>{t.maxAlert}</span>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Eye size={14} className="text-indigo-500" /> {t.dissociation}
        </label>
        <div className="space-y-2">
          {t.dissocOpts.map(opt => {
            const active = entry.dissociationLevel === opt.v;
            return (
              <button
                key={opt.v}
                onClick={() => setEntry(s => ({ ...s, dissociationLevel: opt.v }))}
                disabled={readOnly}
                className={`w-full p-3 rounded-2xl text-left text-[11px] font-bold border transition-all ${
                  active
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                }`}
              >{opt.l}</button>
            );
          })}
        </div>
      </section>

      <button
        onClick={() => setEntry(s => ({ ...s, groundingSuccess: !s.groundingSuccess }))}
        disabled={readOnly}
        className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${
          entry.groundingSuccess
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
            : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 opacity-70'
        }`}
      >
        <div className="flex items-center gap-3">
          <Wind size={20} className={entry.groundingSuccess ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
          <div className="flex flex-col text-left">
            <span className={`text-[11px] font-black uppercase ${entry.groundingSuccess ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-500'}`}>{t.grounding}</span>
            <span className="text-[9px] text-slate-400">{t.groundingHint}</span>
          </div>
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${entry.groundingSuccess ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
          {entry.groundingSuccess && <CheckCircle2 size={14} />}
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
          className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm text-slate-700 dark:text-slate-200 outline-none h-24 resize-none placeholder:text-slate-400"
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

export default TraumaTracker;
