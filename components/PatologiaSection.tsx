import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { Stethoscope, Lock } from 'lucide-react';
import { MODULE_COMPONENTS, MODULE_MAPPING } from '../utils/patologiaModules';
import { Language } from '../types';
import {
  CLINICAL_METRIC_TO_MODULE_ID,
  getClinicalSeverityFromIdentifiers,
  resolveUserClinicalMetrics,
  type ClinicalMetricKey,
} from '../utils/clinicalMetricsConfig';

interface Props {
  user: User;
  dateKey: string;
  readOnly: boolean;
  language: Language;
}

const severityLabel = (s: number, language: Language) => {
  if (language === 'es') {
    if (s <= 3) return 'Leve';
    if (s <= 6) return 'Moderado';
    return 'Elevado';
  }
  if (s <= 3) return 'Low';
  if (s <= 6) return 'Moderate';
  return 'High';
};

const severityClasses = (s: number) => {
  if (s <= 3) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (s <= 6) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
};

const PatologiaSection: React.FC<Props> = ({ user, dateKey, readOnly, language }) => {
  const [enabledModuleIds, setEnabledModuleIds] = useState<string[]>([]);
  const metricByModuleId = useMemo(() => {
    const map = new Map<string, ClinicalMetricKey>();
    (Object.keys(CLINICAL_METRIC_TO_MODULE_ID) as ClinicalMetricKey[]).forEach((metric) => {
      map.set(CLINICAL_METRIC_TO_MODULE_ID[metric], metric);
    });
    return map;
  }, []);

  useEffect(() => {
    let alive = true;
    resolveUserClinicalMetrics(user.uid, [user.displayName, user.email, user.uid])
      .then((metrics) => {
        if (!alive) return;
        setEnabledModuleIds(metrics.map((metric) => CLINICAL_METRIC_TO_MODULE_ID[metric]));
      })
      .catch(() => {
        if (!alive) return;
        setEnabledModuleIds([]);
      });
    return () => { alive = false; };
  }, [user.displayName, user.email, user.uid]);

  const enabled = useMemo(
    () => MODULE_MAPPING
      .filter((mod) => enabledModuleIds.includes(mod.id))
      .map((mod) => {
        const metric = metricByModuleId.get(mod.id);
        const severity = metric
          ? getClinicalSeverityFromIdentifiers([user.displayName, user.email, user.uid], metric)
          : 5;
        return { ...mod, severity };
      }),
    [enabledModuleIds, metricByModuleId, user.displayName, user.email, user.uid]
  );

  if (enabled.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Stethoscope size={18} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {language === 'es' ? 'Módulos Clínicos' : 'Clinical Modules'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'es'
              ? 'Activados por tu profesional según tu perfil.'
              : 'Activated by your clinician based on your profile.'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {enabled.map(mod => {
          const Specific = MODULE_COMPONENTS[mod.id];
          if (Specific) {
            return (
              <div key={mod.id} data-module-id={mod.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{mod.name}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${severityClasses(mod.severity)}`}>
                    {severityLabel(mod.severity, language)} · {mod.severity}/9
                  </span>
                </div>
                <Specific
                  userId={user.uid}
                  severity={mod.severity}
                  dateKey={dateKey}
                  readOnly={readOnly}
                  language={language}
                />
              </div>
            );
          }
          return (
            <div
              key={mod.id}
              data-module-id={mod.id}
              className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 bg-slate-50/60 dark:bg-slate-900/30"
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{mod.name}</p>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${severityClasses(mod.severity)}`}>
                  {severityLabel(mod.severity, language)} · {mod.severity}/9
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Lock size={12} />
                {language === 'es'
                  ? 'Métricas para este módulo próximamente.'
                  : 'Metrics for this module coming soon.'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PatologiaSection;
