import React, { useEffect, useMemo, useState } from 'react';
import { Moon, Clock, Coffee, Sparkles, Pill } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
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
  bedTime: string;
  wakeTime: string;
  sleepLatency: number;
  awakeningsCount: number;
  sleepQuality: number;      // 1-5
  daytimeSleepiness: number; // 1-5
  usedMedication: boolean;
  caffeineIntake: number;
  hoursSlept: number;        // computed
}

const STR = {
  es: {
    noData: 'Sin registros de sueño en este rango.',
    kpiHours: 'Horas promedio', kpiQuality: 'Calidad promedio',
    kpiLatency: 'Latencia promedio', kpiCaffeine: 'Cafeína promedio',
    chartHours: 'Horas dormidas', chartQuality: 'Calidad del sueño (1-5)',
    chartAwake: 'Despertares por noche',
    hours: 'h', min: 'min', cups: 'tazas',
    history: 'Historial detallado', entries: 'registros',
    meds: 'Medicación ✓',
  },
  en: {
    noData: 'No sleep entries in this range.',
    kpiHours: 'Avg. hours', kpiQuality: 'Avg. quality',
    kpiLatency: 'Avg. latency', kpiCaffeine: 'Avg. caffeine',
    chartHours: 'Hours slept', chartQuality: 'Sleep quality (1-5)',
    chartAwake: 'Awakenings per night',
    hours: 'h', min: 'min', cups: 'cups',
    history: 'Detailed history', entries: 'entries',
    meds: 'Meds ✓',
  },
};

function computeHours(bed: string, wake: string): number {
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  if (Number.isNaN(bh) || Number.isNaN(wh)) return 0;
  let bedMin = bh * 60 + (bm || 0);
  let wakeMin = wh * 60 + (wm || 0);
  if (wakeMin <= bedMin) wakeMin += 24 * 60;
  return Math.round(((wakeMin - bedMin) / 60) * 10) / 10;
}

const SleepSection: React.FC<BaseSectionProps> = ({ user, rangeDays, language, chartColors }) => {
  const t = STR[pickLang(language)];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'deepClinicalLogsSleep'));
        const list: Entry[] = [];
        snap.forEach(d => {
          const data = d.data() as any;
          const bed = data.bedTime ?? '23:00';
          const wake = data.wakeTime ?? '07:00';
          list.push({
            dateKey: data.dateKey ?? d.id,
            bedTime: bed,
            wakeTime: wake,
            sleepLatency: data.sleepLatency ?? 0,
            awakeningsCount: data.awakeningsCount ?? 0,
            sleepQuality: data.sleepQuality ?? 3,
            daytimeSleepiness: data.daytimeSleepiness ?? 2,
            usedMedication: !!data.usedMedication,
            caffeineIntake: data.caffeineIntake ?? 0,
            hoursSlept: computeHours(bed, wake),
          });
        });
        list.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        setEntries(list);
      } catch (err) { console.error('SleepSection', err); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const filtered = useMemo(() => entries.filter(e => inRange(e.dateKey, rangeDays)), [entries, rangeDays]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const avg = (fn: (e: Entry) => number) => filtered.reduce((a, e) => a + fn(e), 0) / filtered.length;
    return {
      avgHours: avg(e => e.hoursSlept),
      avgQuality: avg(e => e.sleepQuality),
      avgLatency: avg(e => e.sleepLatency),
      avgCaffeine: avg(e => e.caffeineIntake),
    };
  }, [filtered]);

  if (loading) return <SectionLoader />;
  if (entries.length === 0 || filtered.length === 0) return <SectionEmpty title={t.noData} />;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Moon size={18} />} label={t.kpiHours} value={`${stats!.avgHours.toFixed(1)} ${t.hours}`}
          accent="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-950/30" border="border-indigo-100 dark:border-indigo-900" />
        <KpiCard icon={<Sparkles size={18} />} label={t.kpiQuality} value={`${stats!.avgQuality.toFixed(1)}/5`}
          accent="text-violet-600 dark:text-violet-400" bg="bg-violet-50 dark:bg-violet-950/30" border="border-violet-100 dark:border-violet-900" />
        <KpiCard icon={<Clock size={18} />} label={t.kpiLatency} value={`${stats!.avgLatency.toFixed(0)} ${t.min}`}
          accent="text-slate-600 dark:text-slate-300" bg="bg-slate-100 dark:bg-slate-800/60" border="border-slate-200 dark:border-slate-700" />
        <KpiCard icon={<Coffee size={18} />} label={t.kpiCaffeine} value={`${stats!.avgCaffeine.toFixed(1)} ${t.cups}`}
          accent="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/30" border="border-amber-100 dark:border-amber-900" />
      </div>

      <Card className="p-6 h-80">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartHours}</h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="slpHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
            <YAxis stroke={chartColors.text} domain={[0, 12]} />
            <ReferenceLine y={7} stroke={chartColors.text} strokeDasharray="2 2" />
            <Tooltip contentStyle={buildTooltipStyle(chartColors)} formatter={(v: number) => [`${v} ${t.hours}`, t.chartHours]} />
            <Area type="monotone" dataKey="hoursSlept" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#slpHours)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartQuality}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={filtered}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} domain={[0, 5]} allowDecimals={false} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Bar dataKey="sleepQuality" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                {filtered.map((e, i) => (
                  <Cell key={i} fill={e.sleepQuality <= 2 ? '#e11d48' : e.sleepQuality === 3 ? '#f59e0b' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartAwake}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={filtered}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} allowDecimals={false} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Bar dataKey="awakeningsCount" fill="#6366f1" radius={[4, 4, 0, 0]} />
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
                <Badge tone="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"><Moon size={10} /> {e.hoursSlept}{t.hours}</Badge>
                <Badge tone="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"><Sparkles size={10} /> {e.sleepQuality}/5</Badge>
                {e.caffeineIntake > 0 && (
                  <Badge tone="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><Coffee size={10} /> {e.caffeineIntake}</Badge>
                )}
                {e.usedMedication && (
                  <Badge tone="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"><Pill size={10} /> {t.meds}</Badge>
                )}
              </>}
              chips={<>
                <Chip>{e.bedTime} → {e.wakeTime}</Chip>
                <Chip><Clock size={10} className="inline mr-1" />{e.sleepLatency}{t.min}</Chip>
                {e.awakeningsCount > 0 && <Chip>{e.awakeningsCount} despertares</Chip>}
              </>}
              notes=""
            />
          ))}
        </div>
      </Card>
    </>
  );
};

export default SleepSection;
