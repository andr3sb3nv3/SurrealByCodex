import React, { useEffect, useMemo, useState } from 'react';
import { Smile, Moon, Pill, AlertTriangle, CalendarDays, TrendingUp, Zap } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Card from '../ui/Card';
import {
  BaseSectionProps, KpiCard, SectionLoader, SectionEmpty, HistoryItem, Badge, Chip,
  buildTooltipStyle, inRange, pickLang, CLINICAL_COLLECTIONS,
} from './shared';

interface Entry {
  dateKey: string;
  globalMood: number;         // -5..+5
  energyLevel: number;        // 1-10
  sleepHours: number;
  irritability: number;       // 0,1,3,5
  racingThoughts: boolean;
  medicationAdherence: boolean;
  notes: string;
}

const STR = {
  es: {
    noData: 'Sin registros bipolares en este rango.',
    kpiMood: 'Ánimo promedio', kpiMeds: 'Adherencia medicación',
    kpiSleep: 'Sueño promedio', kpiRacing: 'Días con ideación acelerada',
    chartMood: 'Ciclo afectivo (-5 depresión ↔ +5 manía)',
    chartSleep: 'Horas de sueño', chartIrrit: 'Distribución de irritabilidad',
    irrit: { 0: 'Ninguna', 1: 'Leve', 3: 'Moderada', 5: 'Alta' } as Record<number, string>,
    moodLabel: (v: number) => {
      if (v < -3) return 'Depresión profunda';
      if (v < 0) return 'Ánimo bajo';
      if (v === 0) return 'Eutimia';
      if (v < 3) return 'Hipomanía';
      return 'Manía';
    },
    history: 'Historial detallado', entries: 'registros',
    racing: 'Ideas aceleradas', medsOK: 'Medicación ✓', medsFail: 'Medicación ✗',
    hours: 'h',
  },
  en: {
    noData: 'No bipolar entries in this range.',
    kpiMood: 'Avg. mood', kpiMeds: 'Medication adherence',
    kpiSleep: 'Avg. sleep', kpiRacing: 'Days with racing thoughts',
    chartMood: 'Mood cycle (-5 depression ↔ +5 mania)',
    chartSleep: 'Sleep hours', chartIrrit: 'Irritability distribution',
    irrit: { 0: 'None', 1: 'Mild', 3: 'Moderate', 5: 'High' } as Record<number, string>,
    moodLabel: (v: number) => {
      if (v < -3) return 'Deep depression';
      if (v < 0) return 'Low mood';
      if (v === 0) return 'Euthymia';
      if (v < 3) return 'Hypomania';
      return 'Mania';
    },
    history: 'Detailed history', entries: 'entries',
    racing: 'Racing thoughts', medsOK: 'Meds ✓', medsFail: 'Meds ✗',
    hours: 'h',
  },
};

const BipolarSection: React.FC<BaseSectionProps> = ({ user, rangeDays, language, chartColors }) => {
  const t = STR[pickLang(language)];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, CLINICAL_COLLECTIONS.users, user.uid, CLINICAL_COLLECTIONS.bipolar));
        const list: Entry[] = [];
        snap.forEach(d => {
          const data = d.data() as Partial<Entry>;
          list.push({
            dateKey: data.dateKey ?? d.id,
            globalMood: data.globalMood ?? 0,
            energyLevel: data.energyLevel ?? 5,
            sleepHours: data.sleepHours ?? 7,
            irritability: data.irritability ?? 0,
            racingThoughts: !!data.racingThoughts,
            medicationAdherence: data.medicationAdherence !== false,
            notes: data.notes ?? '',
          });
        });
        list.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        setEntries(list);
      } catch (err) { console.error('BipolarSection', err); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const filtered = useMemo(() => entries.filter(e => inRange(e.dateKey, rangeDays)), [entries, rangeDays]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const sumMood = filtered.reduce((a, e) => a + e.globalMood, 0);
    const sumSleep = filtered.reduce((a, e) => a + e.sleepHours, 0);
    const meds = filtered.filter(e => e.medicationAdherence).length;
    const racing = filtered.filter(e => e.racingThoughts).length;
    const irritCounts: Record<number, number> = { 0: 0, 1: 0, 3: 0, 5: 0 };
    filtered.forEach(e => { irritCounts[e.irritability] = (irritCounts[e.irritability] || 0) + 1; });
    return {
      avgMood: sumMood / filtered.length,
      avgSleep: sumSleep / filtered.length,
      medsPct: (meds / filtered.length) * 100,
      racingPct: (racing / filtered.length) * 100,
      irritCounts,
    };
  }, [filtered]);

  const irritData = useMemo(() => {
    if (!stats) return [];
    return [0, 1, 3, 5].map(v => ({
      key: v, label: t.irrit[v], count: stats.irritCounts[v] ?? 0,
      color: v === 0 ? '#22c55e' : v === 1 ? '#facc15' : v === 3 ? '#f97316' : '#e11d48',
    }));
  }, [stats, language]);

  if (loading) return <SectionLoader />;
  if (entries.length === 0 || filtered.length === 0) return <SectionEmpty title={t.noData} />;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<TrendingUp size={18} />} label={t.kpiMood}
          value={`${stats!.avgMood > 0 ? '+' : ''}${stats!.avgMood.toFixed(1)}`}
          accent="text-violet-600 dark:text-violet-400" bg="bg-violet-50 dark:bg-violet-950/30" border="border-violet-100 dark:border-violet-900" />
        <KpiCard icon={<Pill size={18} />} label={t.kpiMeds} value={`${stats!.medsPct.toFixed(0)}%`}
          accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30" border="border-emerald-100 dark:border-emerald-900" />
        <KpiCard icon={<Moon size={18} />} label={t.kpiSleep} value={`${stats!.avgSleep.toFixed(1)} ${t.hours}`}
          accent="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-950/30" border="border-indigo-100 dark:border-indigo-900" />
        <KpiCard icon={<Zap size={18} />} label={t.kpiRacing} value={`${stats!.racingPct.toFixed(0)}%`}
          accent="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-950/30" border="border-orange-100 dark:border-orange-900" />
      </div>

      <Card className="p-6 h-80">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartMood}</h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
            <YAxis stroke={chartColors.text} domain={[-5, 5]} />
            <ReferenceLine y={0} stroke={chartColors.text} strokeDasharray="2 2" />
            <Tooltip contentStyle={buildTooltipStyle(chartColors)}
              formatter={(v: number) => [`${v > 0 ? '+' : ''}${v} · ${t.moodLabel(v)}`, '']} />
            <Line type="monotone" dataKey="globalMood" stroke="#7c3aed" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartSleep}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={filtered}>
              <defs>
                <linearGradient id="bipSleep" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} domain={[0, 12]} />
              <ReferenceLine y={7} stroke={chartColors.text} strokeDasharray="2 2" />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} formatter={(v: number) => [`${v} ${t.hours}`, t.chartSleep]} />
              <Area type="monotone" dataKey="sleepHours" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#bipSleep)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartIrrit}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={irritData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis type="number" stroke={chartColors.text} allowDecimals={false} fontSize={11} />
              <YAxis type="category" dataKey="label" stroke={chartColors.text} fontSize={11} width={90} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {irritData.map((d, i) => <Cell key={i} fill={d.color} />)}
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
                <Badge tone="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"><Smile size={10} /> {e.globalMood > 0 ? `+${e.globalMood}` : e.globalMood}</Badge>
                <Badge tone="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"><Moon size={10} /> {e.sleepHours}{t.hours}</Badge>
                <Badge tone={e.medicationAdherence
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'}>
                  <Pill size={10} /> {e.medicationAdherence ? t.medsOK : t.medsFail}
                </Badge>
                {e.racingThoughts && (
                  <Badge tone="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"><Zap size={10} /> {t.racing}</Badge>
                )}
              </>}
              chips={<>
                <Chip>{t.moodLabel(e.globalMood)}</Chip>
                {e.irritability > 0 && (
                  <Chip><AlertTriangle size={10} className="inline mr-1" />{t.irrit[e.irritability]}</Chip>
                )}
              </>}
              notes={e.notes}
            />
          ))}
        </div>
      </Card>
    </>
  );
};

export default BipolarSection;
