import React, { useEffect, useMemo, useState } from 'react';
import { Smile, Battery, Brain, Users, Utensils, CalendarDays } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Card from '../ui/Card';
import {
  BaseSectionProps, KpiCard, SectionLoader, SectionEmpty, HistoryItem, Badge, Chip,
  buildTooltipStyle, inRange, pickLang, CLINICAL_COLLECTIONS,
} from './shared';

type Appetite = 'increased' | 'normal' | 'decreased';

interface Entry {
  dateKey: string;
  moodIntensity: number;     // 1-10
  energyLevel: number;       // 1-10
  anhedonia: number;         // 1 / 3 / 5
  socialInteraction: boolean;
  appetiteChange: Appetite;
  notes: string;
}

const STR = {
  es: {
    noData: 'Sin registros de depresión en este rango.',
    kpiMood: 'Ánimo promedio', kpiEnergy: 'Energía promedio',
    kpiSocial: 'Días con interacción social', kpiDays: 'Días registrados',
    chartDual: 'Ánimo y energía (1-10)', chartAnhedonia: 'Interés por actividades',
    chartAppetite: 'Apetito',
    anhedonia: { 1: 'Placer presente', 3: 'Apatía leve', 5: 'Anhedonia total' } as Record<number, string>,
    appetite: { increased: 'Aumentado', normal: 'Normal', decreased: 'Disminuido' } as Record<Appetite, string>,
    mood: 'Ánimo', energy: 'Energía',
    history: 'Historial detallado', entries: 'registros',
    social: 'Social ✓',
  },
  en: {
    noData: 'No depression entries in this range.',
    kpiMood: 'Avg. mood', kpiEnergy: 'Avg. energy',
    kpiSocial: 'Days with social contact', kpiDays: 'Logged days',
    chartDual: 'Mood and energy (1-10)', chartAnhedonia: 'Interest in activities',
    chartAppetite: 'Appetite',
    anhedonia: { 1: 'Pleasure present', 3: 'Mild apathy', 5: 'Full anhedonia' } as Record<number, string>,
    appetite: { increased: 'Increased', normal: 'Normal', decreased: 'Decreased' } as Record<Appetite, string>,
    mood: 'Mood', energy: 'Energy',
    history: 'Detailed history', entries: 'entries',
    social: 'Social ✓',
  },
};

const DepressionSection: React.FC<BaseSectionProps> = ({ user, rangeDays, language, chartColors }) => {
  const t = STR[pickLang(language)];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, CLINICAL_COLLECTIONS.users, user.uid, CLINICAL_COLLECTIONS.depression));
        const list: Entry[] = [];
        snap.forEach(d => {
          const data = d.data() as Partial<Entry>;
          list.push({
            dateKey: data.dateKey ?? d.id,
            moodIntensity: data.moodIntensity ?? 0,
            energyLevel: data.energyLevel ?? 0,
            anhedonia: data.anhedonia ?? 1,
            socialInteraction: !!data.socialInteraction,
            appetiteChange: (data.appetiteChange ?? 'normal') as Appetite,
            notes: data.notes ?? '',
          });
        });
        list.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        setEntries(list);
      } catch (err) { console.error('DepressionSection', err); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const filtered = useMemo(() => entries.filter(e => inRange(e.dateKey, rangeDays)), [entries, rangeDays]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const sumMood = filtered.reduce((a, e) => a + e.moodIntensity, 0);
    const sumEnergy = filtered.reduce((a, e) => a + e.energyLevel, 0);
    const social = filtered.filter(e => e.socialInteraction).length;
    const anhedoniaCounts: Record<number, number> = { 1: 0, 3: 0, 5: 0 };
    filtered.forEach(e => { anhedoniaCounts[e.anhedonia] = (anhedoniaCounts[e.anhedonia] || 0) + 1; });
    const appetiteCounts: Record<Appetite, number> = { increased: 0, normal: 0, decreased: 0 };
    filtered.forEach(e => { appetiteCounts[e.appetiteChange] = (appetiteCounts[e.appetiteChange] || 0) + 1; });
    return {
      avgMood: sumMood / filtered.length,
      avgEnergy: sumEnergy / filtered.length,
      socialPct: (social / filtered.length) * 100,
      days: filtered.length,
      anhedoniaCounts,
      appetiteCounts,
    };
  }, [filtered]);

  const anhedoniaData = useMemo(() => {
    if (!stats) return [];
    return [
      { key: 1, label: t.anhedonia[1], count: stats.anhedoniaCounts[1], color: '#10b981' },
      { key: 3, label: t.anhedonia[3], count: stats.anhedoniaCounts[3], color: '#f59e0b' },
      { key: 5, label: t.anhedonia[5], count: stats.anhedoniaCounts[5], color: '#e11d48' },
    ];
  }, [stats, language]);

  const appetiteData = useMemo(() => {
    if (!stats) return [];
    return (['increased', 'normal', 'decreased'] as Appetite[]).map(k => ({
      key: k,
      label: t.appetite[k],
      count: stats.appetiteCounts[k],
      color: k === 'normal' ? '#64748b' : k === 'increased' ? '#22c55e' : '#f97316',
    }));
  }, [stats, language]);

  if (loading) return <SectionLoader />;
  if (entries.length === 0 || filtered.length === 0) return <SectionEmpty title={t.noData} />;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Smile size={18} />} label={t.kpiMood} value={`${stats!.avgMood.toFixed(1)}/10`}
          accent="text-sky-600 dark:text-sky-400" bg="bg-sky-50 dark:bg-sky-950/30" border="border-sky-100 dark:border-sky-900" />
        <KpiCard icon={<Battery size={18} />} label={t.kpiEnergy} value={`${stats!.avgEnergy.toFixed(1)}/10`}
          accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30" border="border-emerald-100 dark:border-emerald-900" />
        <KpiCard icon={<Users size={18} />} label={t.kpiSocial} value={`${stats!.socialPct.toFixed(0)}%`}
          accent="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-950/30" border="border-indigo-100 dark:border-indigo-900" />
        <KpiCard icon={<CalendarDays size={18} />} label={t.kpiDays} value={String(stats!.days)}
          accent="text-slate-600 dark:text-slate-300" bg="bg-slate-100 dark:bg-slate-800/60" border="border-slate-200 dark:border-slate-700" />
      </div>

      <Card className="p-6 h-80">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">{t.chartDual}</h3>
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="depMood" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="depEnergy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
            <YAxis stroke={chartColors.text} domain={[0, 10]} />
            <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="moodIntensity" name={t.mood} stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#depMood)" />
            <Area type="monotone" dataKey="energyLevel" name={t.energy} stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#depEnergy)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartAnhedonia}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={anhedoniaData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis type="number" stroke={chartColors.text} allowDecimals={false} fontSize={11} />
              <YAxis type="category" dataKey="label" stroke={chartColors.text} fontSize={11} width={130} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {anhedoniaData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartAppetite}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={appetiteData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis type="number" stroke={chartColors.text} allowDecimals={false} fontSize={11} />
              <YAxis type="category" dataKey="label" stroke={chartColors.text} fontSize={11} width={100} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {appetiteData.map((d, i) => <Cell key={i} fill={d.color} />)}
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
                <Badge tone="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"><Smile size={10} /> {e.moodIntensity}/10</Badge>
                <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Battery size={10} /> {e.energyLevel}/10</Badge>
                {e.socialInteraction && (
                  <Badge tone="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"><Users size={10} /> {t.social}</Badge>
                )}
              </>}
              chips={<>
                <Chip><Brain size={10} className="inline mr-1" />{t.anhedonia[e.anhedonia]}</Chip>
                <Chip><Utensils size={10} className="inline mr-1" />{t.appetite[e.appetiteChange]}</Chip>
              </>}
              notes={e.notes}
            />
          ))}
        </div>
      </Card>
    </>
  );
};

export default DepressionSection;
