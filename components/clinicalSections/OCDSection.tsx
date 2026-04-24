import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Zap, ShieldCheck, AlertCircle, CalendarDays } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
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
  obsessionIntensity: number;  // 0-100
  compulsionFrequency: number;
  resistanceCount: number;
  ruminationTime: number;      // 1-5
  sudsLevel: number;           // 0-10
  thoughtBelief: number;       // 0-100
  triggerContext: string;
}

const STR = {
  es: {
    noData: 'Sin registros de TOC en este rango.',
    kpiObsession: 'Obsesión promedio', kpiRituals: 'Rituales totales',
    kpiResistance: 'Resistencias totales', kpiRatio: 'Ratio resistencia',
    chartIntensity: 'Intensidad de la obsesión vs. credibilidad',
    chartRvR: 'Rituales vs resistencias por día', chartSuds: 'Malestar subjetivo (SUDs 0-10)',
    intensity: 'Intensidad', belief: 'Credibilidad',
    rituals: 'Rituales', resistances: 'Resistencias',
    history: 'Historial detallado', entries: 'registros',
  },
  en: {
    noData: 'No OCD entries in this range.',
    kpiObsession: 'Avg. obsession', kpiRituals: 'Total rituals',
    kpiResistance: 'Total resistances', kpiRatio: 'Resistance ratio',
    chartIntensity: 'Obsession intensity vs. belief',
    chartRvR: 'Rituals vs resistances per day', chartSuds: 'Subjective distress (SUDs 0-10)',
    intensity: 'Intensity', belief: 'Belief',
    rituals: 'Rituals', resistances: 'Resistances',
    history: 'Detailed history', entries: 'entries',
  },
};

const OCDSection: React.FC<BaseSectionProps> = ({ user, rangeDays, language, chartColors }) => {
  const t = STR[pickLang(language)];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, CLINICAL_COLLECTIONS.users, user.uid, CLINICAL_COLLECTIONS.ocd));
        const list: Entry[] = [];
        snap.forEach(d => {
          const data = d.data() as Partial<Entry>;
          list.push({
            dateKey: data.dateKey ?? d.id,
            obsessionIntensity: data.obsessionIntensity ?? 0,
            compulsionFrequency: data.compulsionFrequency ?? 0,
            resistanceCount: data.resistanceCount ?? 0,
            ruminationTime: data.ruminationTime ?? 1,
            sudsLevel: data.sudsLevel ?? 0,
            thoughtBelief: data.thoughtBelief ?? 0,
            triggerContext: data.triggerContext ?? '',
          });
        });
        list.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        setEntries(list);
      } catch (err) { console.error('OCDSection', err); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const filtered = useMemo(() => entries.filter(e => inRange(e.dateKey, rangeDays)), [entries, rangeDays]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const sumObs = filtered.reduce((a, e) => a + e.obsessionIntensity, 0);
    const sumRituals = filtered.reduce((a, e) => a + e.compulsionFrequency, 0);
    const sumResist = filtered.reduce((a, e) => a + e.resistanceCount, 0);
    const total = sumRituals + sumResist;
    return {
      avgObs: sumObs / filtered.length,
      totalRituals: sumRituals,
      totalResist: sumResist,
      ratio: total > 0 ? (sumResist / total) * 100 : 0,
    };
  }, [filtered]);

  if (loading) return <SectionLoader />;
  if (entries.length === 0 || filtered.length === 0) return <SectionEmpty title={t.noData} />;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Brain size={18} />} label={t.kpiObsession} value={`${stats!.avgObs.toFixed(0)}%`}
          accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30" border="border-emerald-100 dark:border-emerald-900" />
        <KpiCard icon={<Zap size={18} />} label={t.kpiRituals} value={String(stats!.totalRituals)}
          accent="text-rose-600 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-950/30" border="border-rose-100 dark:border-rose-900" />
        <KpiCard icon={<ShieldCheck size={18} />} label={t.kpiResistance} value={String(stats!.totalResist)}
          accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30" border="border-emerald-100 dark:border-emerald-900" />
        <KpiCard icon={<CalendarDays size={18} />} label={t.kpiRatio} value={`${stats!.ratio.toFixed(0)}%`}
          accent="text-teal-600 dark:text-teal-400" bg="bg-teal-50 dark:bg-teal-950/30" border="border-teal-100 dark:border-teal-900" />
      </div>

      <Card className="p-6 h-80">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartIntensity}</h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="ocdObs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ocdBel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
            <YAxis stroke={chartColors.text} domain={[0, 100]} />
            <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="obsessionIntensity" name={t.intensity} stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#ocdObs)" />
            <Area type="monotone" dataKey="thoughtBelief" name={t.belief} stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#ocdBel)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartRvR}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={filtered}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} allowDecimals={false} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="compulsionFrequency" name={t.rituals} fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resistanceCount" name={t.resistances} fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartSuds}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={filtered}>
              <defs>
                <linearGradient id="ocdSuds" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} domain={[0, 10]} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Area type="monotone" dataKey="sudsLevel" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#ocdSuds)" />
            </AreaChart>
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
                <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Brain size={10} /> {e.obsessionIntensity}%</Badge>
                <Badge tone="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"><Zap size={10} /> {e.compulsionFrequency} {t.rituals.toLowerCase()}</Badge>
                <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><ShieldCheck size={10} /> {e.resistanceCount}</Badge>
                <Badge tone="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><AlertCircle size={10} /> SUDs {e.sudsLevel}/10</Badge>
              </>}
              chips={<>
                <Chip>{t.belief}: {e.thoughtBelief}%</Chip>
                {e.triggerContext && <Chip>{e.triggerContext.slice(0, 50)}</Chip>}
              </>}
              notes=""
            />
          ))}
        </div>
      </Card>
    </>
  );
};

export default OCDSection;
