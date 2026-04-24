import React, { useEffect, useState } from 'react';
import { Zap, MessageSquare, CheckCircle2, AlertTriangle, Users, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { PatologiaModuleProps } from '../../utils/patologiaModules';
import { Language } from '../../types';

interface SubstanceEntry {
  cravingIntensity: number;      // 0-10
  consumptionCount: number;
  relapseRisk: number;           // 1-5
  usedCopingSkills: boolean;
  socialSupportContact: boolean;
  mainTrigger: string;
  notes: string;
  updatedAt?: number;
  dateKey?: string;
}

const DEFAULT_ENTRY: SubstanceEntry = {
  cravingIntensity: 0,
  consumptionCount: 0,
  relapseRisk: 2,
  usedCopingSkills: true,
  socialSupportContact: false,
  mainTrigger: '',
  notes: '',
};

const STR: Record<'es' | 'en', {
  cravingLabel: string;
  cravingZero: string;
  cravingMax: string;
  riskTitle: string;
  riskHint: string;
  supportTitle: string;
  supportHint: string;
  triggerLabel: string;
  triggerPlaceholder: string;
  consumptionTitle: string;
  consumptionReminder: string;
  save: string;
  saving: string;
  saved: string;
  errorSaving: string;
}> = {
  es: {
    cravingLabel: 'Intensidad del Deseo',
    cravingZero: 'Cero Deseo',
    cravingMax: 'Incontrolable',
    riskTitle: 'Riesgo de Recaída',
    riskHint: 'Percepción subjetiva de seguridad',
    supportTitle: 'Red de Apoyo',
    supportHint: '¿Hablaste con alguien hoy?',
    triggerLabel: 'Disparador Principal',
    triggerPlaceholder: 'Lugar, persona, emoción o música...',
    consumptionTitle: 'Si hubo consumo, ¿qué cantidad?',
    consumptionReminder: 'No te juzgues. Registralo y habla con tu médico.',
    save: 'Actualizar Sobriedad',
    saving: 'Sincronizando...',
    saved: 'Registro guardado',
    errorSaving: 'No se pudo guardar. Intentalo de nuevo.',
  },
  en: {
    cravingLabel: 'Craving Intensity',
    cravingZero: 'No Craving',
    cravingMax: 'Uncontrollable',
    riskTitle: 'Relapse Risk',
    riskHint: 'Subjective safety perception',
    supportTitle: 'Support Network',
    supportHint: 'Did you talk to someone today?',
    triggerLabel: 'Main Trigger',
    triggerPlaceholder: 'Place, person, emotion or music...',
    consumptionTitle: 'If there was use, how much?',
    consumptionReminder: "Don't judge yourself. Log it and talk to your doctor.",
    save: 'Update Sobriety',
    saving: 'Syncing...',
    saved: 'Entry saved',
    errorSaving: 'Could not save. Please try again.',
  },
};

const pickLang = (language: Language): 'es' | 'en' => (language === 'es' ? 'es' : 'en');

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const SubstanceTracker: React.FC<PatologiaModuleProps> = ({ userId, dateKey, readOnly, language }) => {
  const t = STR[pickLang(language)];
  const [entry, setEntry] = useState<SubstanceEntry>(DEFAULT_ENTRY);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!db || !userId) { setStatus('idle'); return; }
      try {
        setStatus('loading');
        const ref = doc(db, 'users', userId, 'deepClinicalLogsSubstance', dateKey);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          setEntry({ ...DEFAULT_ENTRY, ...(snap.data() as Partial<SubstanceEntry>) });
        } else {
          setEntry(DEFAULT_ENTRY);
        }
        setStatus('idle');
      } catch (err) {
        console.error('SubstanceTracker load error', err);
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
      const ref = doc(db, 'users', userId, 'deepClinicalLogsSubstance', dateKey);
      await setDoc(ref, { ...entry, dateKey, updatedAt: Date.now() }, { merge: true });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('SubstanceTracker save error', err);
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
            <Zap size={16} className="text-orange-500" /> {t.cravingLabel}
          </label>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{entry.cravingIntensity}/10</span>
        </div>
        <div className="flex justify-between gap-1">
          {Array.from({ length: 11 }).map((_, v) => (
            <button
              key={v}
              onClick={() => setEntry(s => ({ ...s, cravingIntensity: v }))}
              disabled={readOnly}
              className={`flex-1 h-9 rounded-md text-[9px] font-black transition-all border ${
                entry.cravingIntensity >= v
                  ? 'bg-orange-500 text-white border-orange-400 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-500 border-slate-100 dark:border-slate-700'
              }`}
            >{v}</button>
          ))}
        </div>
        <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase mt-2 px-1">
          <span>{t.cravingZero}</span>
          <span>{t.cravingMax}</span>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} className="text-rose-500" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase">{t.riskTitle}</span>
            <span className="text-[9px] text-slate-400 italic">{t.riskHint}</span>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map(v => (
            <button
              key={v}
              onClick={() => setEntry(s => ({ ...s, relapseRisk: v }))}
              disabled={readOnly}
              className={`py-3 rounded-xl text-xs font-black transition-all ${
                entry.relapseRisk === v
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-50 dark:bg-slate-900/40 text-slate-400'
              }`}
            >{v}</button>
          ))}
        </div>
      </section>

      <button
        onClick={() => setEntry(s => ({ ...s, socialSupportContact: !s.socialSupportContact }))}
        disabled={readOnly}
        className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${
          entry.socialSupportContact
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-3 text-left">
          <Users size={22} className={entry.socialSupportContact ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
          <div className="flex flex-col">
            <span className={`text-xs font-black uppercase tracking-tight ${
              entry.socialSupportContact ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-500'
            }`}>{t.supportTitle}</span>
            <span className="text-[9px] text-slate-400 font-medium">{t.supportHint}</span>
          </div>
        </div>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
          entry.socialSupportContact ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
        }`}>
          <CheckCircle2 size={16} />
        </div>
      </button>

      <section>
        <div className="flex items-center gap-2 mb-2 ml-1">
          <MessageSquare size={14} className="text-slate-400" />
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.triggerLabel}</label>
        </div>
        <input
          type="text"
          value={entry.mainTrigger}
          disabled={readOnly}
          onChange={(e) => setEntry(s => ({ ...s, mainTrigger: e.target.value }))}
          placeholder={t.triggerPlaceholder}
          className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400"
        />
      </section>

      <section className="bg-rose-50/60 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900 text-center">
        <AlertTriangle size={18} className="mx-auto mb-1 text-rose-500 opacity-60" />
        <span className="block text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase mb-3">{t.consumptionTitle}</span>
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={() => setEntry(s => ({ ...s, consumptionCount: Math.max(0, s.consumptionCount - 1) }))}
            disabled={readOnly || entry.consumptionCount === 0}
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-rose-500 dark:text-rose-400 font-black disabled:opacity-40"
          >−</button>
          <span className="text-2xl font-black text-rose-900 dark:text-rose-200 w-8 text-center">{entry.consumptionCount}</span>
          <button
            onClick={() => setEntry(s => ({ ...s, consumptionCount: s.consumptionCount + 1 }))}
            disabled={readOnly}
            className="w-9 h-9 rounded-xl bg-rose-600 text-white font-black shadow-md disabled:opacity-40"
          >+</button>
        </div>
        {entry.consumptionCount > 0 && (
          <p className="text-[9px] text-rose-500 dark:text-rose-400 mt-3 font-bold uppercase tracking-widest italic">
            {t.consumptionReminder}
          </p>
        )}
      </section>

      {!readOnly && (
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black text-sm uppercase tracking-[0.3em] shadow-lg hover:bg-black dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
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

export default SubstanceTracker;
