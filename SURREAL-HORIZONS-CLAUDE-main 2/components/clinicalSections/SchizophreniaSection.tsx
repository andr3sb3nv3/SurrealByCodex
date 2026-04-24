import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Pill, Ghost, Focus, AlertTriangle } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Card from '../ui/Card';
import {
  BaseSectionProps, KpiCard, SectionLoader, SectionEmpty, HistoryItem, Badge, Chip,
  buildTooltipStyle, inRange, pickLang,
} from './shared';

interface Entry {
  dateKey: string;
  medicationTaken: boolean;
  sideEffects: number;             // 0-5
  auditoryHallucinations: number;
  ideasOfReference: number;
  thoughtControl: number;
  anhedonia: number;
  avolition: number;
  concentration: number;           // 1-5
  stressLevel: number;             // 0-5
  notes: string;
}

const STR = {
  es: {
    noData: 'Sin registros psicóticos en este rango.',
    kpiMeds: 'Adherencia', kpiHallu: 'Alucinaciones promedio',
    kpiStress: 'Estrés promedio', kpiFocus: 'Foco promedio',
    chartPositive: 'Síntomas positivos (0-5)',
    chartCognitive: 'Estrés y foco (0-5)',
    chartNegative: 'Síntomas negativos promedio',
    voices: 'Voces', referential: 'Ideas referencia', thoughts: 'Interferencia',
    stress: 'Estrés', focus: 'Foco',
    anhedonia: 'Anhedonia', avolition: 'Avolición',
    history: 'Historial detallado', entries: 'registros',
    medsOK: 'Medicación ✓', medsFail: 'Medicación ✗',
  },
  en: {
    noData: 'No psychotic entries in this range.',
    kpiMeds: 'Adherence', kpiHallu: 'Avg. hallucinations',
    kpiStress: 'Avg. stress', kpiFocus: 'Avg. focus',
    chartPositive: 'Positive symptoms (0-5)',
    chartCognitive: 'Stress and focus (0-5)',
    chartNegative: 'Average negative symptoms',
    voices: 'Voices', referential: 'Ideas of ref.', thoughts: 'Interference',
    stress: 'Stress', focus: 'Focus',
    anhedonia: 'Anhedonia', avolition: 'Avolition',
    history: 'Detailed history', entries: 'entries',
    medsOK: 'Meds ✓', medsFail: 'Meds ✗',
  },
};

const SchizophreniaSection: React.FC<BaseSectionProps> = ({ user, rangeDays, language, chartColors }) => {
  const t = STR[pickLang(language)];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'deepClinicalLogsSchizophrenia'));
        const list: Entry[] = [];
        snap.forEach(d => {
          const data = d.data() as Partial<Entry>;
          list.push({
            dateKey: data.dateKey ?? d.id,
            medicationTaken: data.medicationTaken !== false,
            sideEffects: data.sideEffects ?? 0,
            auditoryHallucinations: data.auditoryHallucinations ?? 0,
            ideasOfReference: data.ideasOfReference ?? 0,
            thoughtControl: data.thoughtControl ?? 0,
            anhedonia: data.anhedonia ?? 0,
            avolition: data.avolition ?? 0,
            concentration: data.concentration ?? 3,
            stressLevel: data.stressLevel ?? 0,
            notes: data.notes ?? '',
          });
        });
        list.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        setEntries(list);
      } catch (err) { console.error('SchizophreniaSection', err); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const filtered = useMemo(() => entries.filter(e => inRange(e.dateKey, rangeDays)), [entries, rangeDays]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const meds = filtered.filter(e => e.medicationTaken).length;
    const avg = (k: keyof Entry) =>
      filtered.reduce((a, e) => a + ((e[k] as number) || 0), 0) / filtered.length;
    return {
      medsPct: (meds / filtered.length) * 100,
      avgHallu: avg('auditoryHallucinations'),
      avgStress: avg('stressLevel'),
      avgFocus: avg('concentration'),
      avgAnhedonia: avg('anhedonia'),
      avgAvolition: avg('avolition'),
    };
  }, [filtered]);

  const negativeData = useMemo(() => {
    if (!stats) return [];
    return [
      { key: 'anhedonia', label: t.anhedonia, value: stats.avgAnhedonia },
      { key: 'avolition', label: t.avolition, value: stats.avgAvolition },
    ];
  }, [stats, language]);

  if (loading) return <SectionLoader />;
  if (entries.length === 0 || filtered.length === 0) return <SectionEmpty title={t.noData} />;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Pill size={18} />} label={t.kpiMeds} value={`${stats!.medsPct.toFixed(0)}%`}
          accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30" border="border-emerald-100 dark:border-emerald-900" />
        <KpiCard icon={<Ghost size={18} />} label={t.kpiHallu} value={`${stats!.avgHallu.toFixed(1)}/5`}
          accent="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-950/30" border="border-purple-100 dark:border-purple-900" />
        <KpiCard icon={<AlertTriangle size={18} />} label={t.kpiStress} value={`${stats!.avgStress.toFixed(1)}/5`}
          accent="text-rose-600 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-950/30" border="border-rose-100 dark:border-rose-900" />
        <KpiCard icon={<Focus size={18} />} label={t.kpiFocus} value={`${stats!.avgFocus.toFixed(1)}/5`}
          accent="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-950/30" border="border-blue-100 dark:border-blue-900" />
      </div>

      <Card className="p-6 h-80">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartPositive}</h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
            <YAxis stroke={chartColors.text} domain={[0, 5]} />
            <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="auditoryHallucinations" name={t.voices} stroke="#a855f7" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ideasOfReference" name={t.referential} stroke="#ec4899" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="thoughtControl" name={t.thoughts} stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartCognitive}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={filtered}>
              <defs>
                <linearGradient id="schStress" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="schFocus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} domain={[0, 5]} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="stressLevel" name={t.stress} stroke="#e11d48" fillOpacity={1} fill="url(#schStress)" />
              <Area type="monotone" dataKey="concentration" name={t.focus} stroke="#2563eb" fillOpacity={1} fill="url(#schFocus)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartNegative}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={negativeData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis type="number" stroke={chartColors.text} domain={[0, 5]} fontSize={11} />
              <YAxis type="category" dataKey="label" stroke={chartColors.text} fontSize={11} width={100} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} formatter={(v: number) => [`${(v as number).toFixed(1)}/5`, '']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                <Cell fill="#a855f7" />
                <Cell fill="#8b5cf6" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">{t.history}</h3>
          <span className="text-xs text-slate-400">{filtered.length} {t.entries}</span>
        </div>
        <div className="space-y-3">
          {[...filtered].reverse().map(e => (
            <HistoryItem
              key={e.dateKey}
              dateKey={e.dateKey}
              language={language}
              badges={<>
                <Badge tone={e.medicationTaken
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'}>
                  <Pill size={10} /> {e.medicationTaken ? t.medsOK : t.medsFail}
                </Badge>
                <Badge tone="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  <Ghost size={10} /> {e.auditoryHallucinations}/5
                </Badge>
                <Badge tone="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                  <AlertTriangle size={10} /> {e.stressLevel}/5
                </Badge>
                <Badge tone="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  <Focus size={10} /> {e.concentration}/5
                </Badge>
              </>}
              chips={<>
                {e.ideasOfReference > 0 && <Chip>{t.referential}: {e.ideasOfReference}</Chip>}
                {e.thoughtControl > 0 && <Chip>{t.thoughts}: {e.thoughtControl}</Chip>}
                {e.anhedonia > 0 && <Chip>{t.anhedonia}: {e.anhedonia}</Chip>}
                {e.avolition > 0 && <Chip>{t.avolition}: {e.avolition}</Chip>}
              </>}
              notes={e.notes}
            />
          ))}
        </div>
      </Card>
    </>
  );
};

export default SchizophreniaSection;
