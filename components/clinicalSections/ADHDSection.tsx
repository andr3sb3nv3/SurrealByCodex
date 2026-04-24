import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Zap, AlertCircle, ListChecks, Clock, Pill } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
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
  focusLevel: number;        // 1-10
  hyperactivity: number;     // 0-5
  impulsivity: number;       // 0-5
  completedTasks: number;
  timeManagement: number;    // 1-5
  medicationTaken: boolean;
  notes: string;
}

const STR = {
  es: {
    noData: 'Sin registros de TDAH en este rango.',
    kpiFocus: 'Foco promedio', kpiTasks: 'Tareas totales',
    kpiTime: 'Gestión del tiempo', kpiMeds: 'Adherencia',
    chartFocus: 'Nivel de foco (1-10)',
    chartTasks: 'Tareas completadas por día', chartHyperImp: 'Hiperactividad e impulsividad',
    hyper: 'Hiperactividad', impuls: 'Impulsividad',
    history: 'Historial detallado', entries: 'registros',
    meds: 'Medicación ✓',
  },
  en: {
    noData: 'No ADHD entries in this range.',
    kpiFocus: 'Avg. focus', kpiTasks: 'Total tasks',
    kpiTime: 'Time management', kpiMeds: 'Adherence',
    chartFocus: 'Focus level (1-10)',
    chartTasks: 'Tasks completed per day', chartHyperImp: 'Hyperactivity and impulsivity',
    hyper: 'Hyperactivity', impuls: 'Impulsivity',
    history: 'Detailed history', entries: 'entries',
    meds: 'Meds ✓',
  },
};

const ADHDSection: React.FC<BaseSectionProps> = ({ user, rangeDays, language, chartColors }) => {
  const t = STR[pickLang(language)];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'deepClinicalLogsADHD'));
        const list: Entry[] = [];
        snap.forEach(d => {
          const data = d.data() as Partial<Entry>;
          list.push({
            dateKey: data.dateKey ?? d.id,
            focusLevel: data.focusLevel ?? 5,
            hyperactivity: data.hyperactivity ?? 0,
            impulsivity: data.impulsivity ?? 0,
            completedTasks: data.completedTasks ?? 0,
            timeManagement: data.timeManagement ?? 3,
            medicationTaken: data.medicationTaken !== false,
            notes: data.notes ?? '',
          });
        });
        list.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        setEntries(list);
      } catch (err) { console.error('ADHDSection', err); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const filtered = useMemo(() => entries.filter(e => inRange(e.dateKey, rangeDays)), [entries, rangeDays]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const avg = (fn: (e: Entry) => number) => filtered.reduce((a, e) => a + fn(e), 0) / filtered.length;
    const sumTasks = filtered.reduce((a, e) => a + e.completedTasks, 0);
    const meds = filtered.filter(e => e.medicationTaken).length;
    return {
      avgFocus: avg(e => e.focusLevel),
      totalTasks: sumTasks,
      avgTime: avg(e => e.timeManagement),
      medsPct: (meds / filtered.length) * 100,
    };
  }, [filtered]);

  if (loading) return <SectionLoader />;
  if (entries.length === 0 || filtered.length === 0) return <SectionEmpty title={t.noData} />;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Brain size={18} />} label={t.kpiFocus} value={`${stats!.avgFocus.toFixed(1)}/10`}
          accent="text-yellow-700 dark:text-yellow-300" bg="bg-yellow-50 dark:bg-yellow-950/30" border="border-yellow-100 dark:border-yellow-900" />
        <KpiCard icon={<ListChecks size={18} />} label={t.kpiTasks} value={String(stats!.totalTasks)}
          accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30" border="border-emerald-100 dark:border-emerald-900" />
        <KpiCard icon={<Clock size={18} />} label={t.kpiTime} value={`${stats!.avgTime.toFixed(1)}/5`}
          accent="text-slate-600 dark:text-slate-300" bg="bg-slate-100 dark:bg-slate-800/60" border="border-slate-200 dark:border-slate-700" />
        <KpiCard icon={<Pill size={18} />} label={t.kpiMeds} value={`${stats!.medsPct.toFixed(0)}%`}
          accent="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-950/30" border="border-indigo-100 dark:border-indigo-900" />
      </div>

      <Card className="p-6 h-80">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartFocus}</h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="adhdFoc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#eab308" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
            <YAxis stroke={chartColors.text} domain={[0, 10]} />
            <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
            <Area type="monotone" dataKey="focusLevel" stroke="#eab308" strokeWidth={2} fillOpacity={1} fill="url(#adhdFoc)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartTasks}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={filtered}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} allowDecimals={false} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Bar dataKey="completedTasks" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartHyperImp}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={filtered}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} domain={[0, 5]} allowDecimals={false} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="hyperactivity" name={t.hyper} fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="impulsivity" name={t.impuls} fill="#f43f5e" radius={[4, 4, 0, 0]} />
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
                <Badge tone="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"><Brain size={10} /> {e.focusLevel}/10</Badge>
                <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><ListChecks size={10} /> {e.completedTasks}</Badge>
                {e.medicationTaken && (
                  <Badge tone="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"><Pill size={10} /> {t.meds}</Badge>
                )}
              </>}
              chips={<>
                <Chip><Zap size={10} className="inline mr-1" />{t.hyper}: {e.hyperactivity}/5</Chip>
                <Chip><AlertCircle size={10} className="inline mr-1" />{t.impuls}: {e.impulsivity}/5</Chip>
                <Chip><Clock size={10} className="inline mr-1" />{e.timeManagement}/5</Chip>
              </>}
              notes={e.notes}
            />
          ))}
        </div>
      </Card>
    </>
  );
};

export default ADHDSection;
