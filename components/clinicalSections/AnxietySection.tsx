import React, { useEffect, useMemo, useState } from 'react';
import { Zap, CalendarDays, ShieldAlert, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Card from '../ui/Card';
import {
  BaseSectionProps, KpiCard, SectionLoader, SectionEmpty, HistoryItem, Badge, Chip,
  buildTooltipStyle, inRange, pickLang, CLINICAL_COLLECTIONS,
} from './shared';

interface AnxietyEntry {
  dateKey: string;
  generalAnxiety: number;
  panicEpisodes: number;
  physicalSymptoms: string[];
  anticipatoryAnxiety: number;
  avoidanceBehavior: boolean;
  notes: string;
}

const SYMPTOM_LABELS: Record<'es' | 'en', Record<string, string>> = {
  es: {
    palpitations: 'Palpitaciones', muscleTension: 'Tensión muscular', sweating: 'Sudoración',
    shortness: 'Falta de aire', chestPressure: 'Presión en pecho', dizziness: 'Mareos',
  },
  en: {
    palpitations: 'Palpitations', muscleTension: 'Muscle tension', sweating: 'Sweating',
    shortness: 'Shortness of breath', chestPressure: 'Chest pressure', dizziness: 'Dizziness',
  },
};

const STR = {
  es: {
    noData: 'Sin registros de ansiedad en este rango.',
    kpiAvg: 'Ansiedad promedio', kpiPanic: 'Episodios de pánico',
    kpiDays: 'Días registrados', kpiTopSymptom: 'Síntoma más frecuente',
    chartAnxiety: 'Nivel de ansiedad general', chartPanic: 'Episodios de pánico por día',
    chartSymptoms: 'Síntomas somáticos (frecuencia)',
    history: 'Historial detallado', entries: 'registros',
    panicSingular: 'episodio', panicPlural: 'episodios',
    avoided: 'Evitación', noSymptoms: 'Sin síntomas reportados',
  },
  en: {
    noData: 'No anxiety entries in this range.',
    kpiAvg: 'Avg. anxiety', kpiPanic: 'Panic episodes',
    kpiDays: 'Logged days', kpiTopSymptom: 'Top symptom',
    chartAnxiety: 'General anxiety level', chartPanic: 'Panic episodes per day',
    chartSymptoms: 'Somatic symptoms (frequency)',
    history: 'Detailed history', entries: 'entries',
    panicSingular: 'episode', panicPlural: 'episodes',
    avoided: 'Avoidance', noSymptoms: 'No symptoms reported',
  },
};

const AnxietySection: React.FC<BaseSectionProps> = ({ user, rangeDays, language, chartColors }) => {
  const t = STR[pickLang(language)];
  const [entries, setEntries] = useState<AnxietyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, CLINICAL_COLLECTIONS.users, user.uid, CLINICAL_COLLECTIONS.anxiety));
        const list: AnxietyEntry[] = [];
        snap.forEach(d => {
          const data = d.data() as Partial<AnxietyEntry>;
          list.push({
            dateKey: data.dateKey ?? d.id,
            generalAnxiety: data.generalAnxiety ?? 0,
            panicEpisodes: data.panicEpisodes ?? 0,
            physicalSymptoms: Array.isArray(data.physicalSymptoms) ? data.physicalSymptoms : [],
            anticipatoryAnxiety: data.anticipatoryAnxiety ?? 0,
            avoidanceBehavior: !!data.avoidanceBehavior,
            notes: data.notes ?? '',
          });
        });
        list.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        setEntries(list);
      } catch (err) { console.error('AnxietySection', err); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const filtered = useMemo(() => entries.filter(e => inRange(e.dateKey, rangeDays)), [entries, rangeDays]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const sum = filtered.reduce((a, e) => a + e.generalAnxiety, 0);
    const panic = filtered.reduce((a, e) => a + e.panicEpisodes, 0);
    const counts: Record<string, number> = {};
    filtered.forEach(e => e.physicalSymptoms.forEach(s => { counts[s] = (counts[s] || 0) + 1; }));
    const sorted = Object.entries(counts).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
    return { avg: sum / filtered.length, panic, days: filtered.length, top: sorted[0] ?? null, sorted };
  }, [filtered]);

  const symptomBar = useMemo(
    () => stats?.sorted.map(s => ({ key: s.key, label: SYMPTOM_LABELS[pickLang(language)][s.key] ?? s.key, count: s.count })) ?? [],
    [stats, language]
  );

  if (loading) return <SectionLoader />;
  if (entries.length === 0 || filtered.length === 0) return <SectionEmpty title={t.noData} />;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<TrendingUp size={18} />} label={t.kpiAvg} value={`${stats!.avg.toFixed(0)}%`}
          accent="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-950/30" border="border-orange-100 dark:border-orange-900" />
        <KpiCard icon={<Zap size={18} />} label={t.kpiPanic} value={String(stats!.panic)}
          accent="text-rose-600 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-950/30" border="border-rose-100 dark:border-rose-900" />
        <KpiCard icon={<CalendarDays size={18} />} label={t.kpiDays} value={String(stats!.days)}
          accent="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-950/30" border="border-indigo-100 dark:border-indigo-900" />
        <KpiCard icon={<ShieldAlert size={18} />} label={t.kpiTopSymptom}
          value={stats!.top ? SYMPTOM_LABELS[pickLang(language)][stats!.top.key] ?? stats!.top.key : '—'}
          valueClass="text-sm md:text-base"
          accent="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/30" border="border-amber-100 dark:border-amber-900" />
      </div>

      <Card className="p-6 h-80">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">{t.chartAnxiety}</h3>
          <span className="text-xs text-slate-400">0–100%</span>
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="anxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
            <YAxis stroke={chartColors.text} domain={[0, 100]} />
            <Tooltip contentStyle={buildTooltipStyle(chartColors)} formatter={(v: number) => [`${v}%`, t.chartAnxiety]} />
            <Area type="monotone" dataKey="generalAnxiety" stroke="#ea580c" strokeWidth={2} fillOpacity={1} fill="url(#anxGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartPanic}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={filtered}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} allowDecimals={false} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Bar dataKey="panicEpisodes" name={t.kpiPanic} fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartSymptoms}</h3>
          {symptomBar.length === 0 ? (
            <div className="h-[85%] flex items-center justify-center text-xs text-slate-400">{t.noSymptoms}</div>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={symptomBar} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis type="number" stroke={chartColors.text} allowDecimals={false} fontSize={11} />
                <YAxis type="category" dataKey="label" stroke={chartColors.text} fontSize={11} width={110} />
                <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {symptomBar.map((_, i) => <Cell key={i} fill={i === 0 ? '#ea580c' : '#fb923c'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
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
                <Badge tone="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">{e.generalAnxiety}%</Badge>
                {e.panicEpisodes > 0 && (
                  <Badge tone="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                    <Zap size={10} /> {e.panicEpisodes} {e.panicEpisodes === 1 ? t.panicSingular : t.panicPlural}
                  </Badge>
                )}
                {e.avoidanceBehavior && <Badge tone="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">{t.avoided}</Badge>}
              </>}
              chips={e.physicalSymptoms.length > 0 && e.physicalSymptoms.map(s => (
                <Chip key={s}>{SYMPTOM_LABELS[pickLang(language)][s] ?? s}</Chip>
              ))}
              notes={e.notes}
            />
          ))}
        </div>
      </Card>
    </>
  );
};

export default AnxietySection;
