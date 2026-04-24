import React, { useEffect, useMemo, useState } from 'react';
import { Zap, ShieldAlert, Wind, Eye, CalendarDays } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
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
  intrusionFrequency: number;    // 0-5
  hypervigilanceLevel: number;   // 0-10
  avoidanceBehavior: boolean;
  dissociationLevel: number;     // 0/2/5
  physicalTension: number;       // 0-5
  groundingSuccess: boolean;
  notes: string;
}

const STR = {
  es: {
    noData: 'Sin registros de trauma en este rango.',
    kpiHyper: 'Hipervigilancia', kpiGrounding: 'Anclaje exitoso',
    kpiAvoid: 'Días con evitación', kpiIntrusions: 'Días con intrusiones',
    chartHyper: 'Nivel de alerta (0-10)',
    chartDissoc: 'Disociación y tensión',
    chartIntr: 'Intrusiones / flashbacks por día',
    dissocLabel: { 0: 'Presente', 2: 'Distraído', 5: 'Desconectado' } as Record<number, string>,
    dissoc: 'Disociación', tension: 'Tensión física',
    history: 'Historial detallado', entries: 'registros',
    grounded: 'Anclaje ✓', avoided: 'Evitación', intrusions: 'Intrusiones',
  },
  en: {
    noData: 'No trauma entries in this range.',
    kpiHyper: 'Hypervigilance', kpiGrounding: 'Successful grounding',
    kpiAvoid: 'Days with avoidance', kpiIntrusions: 'Days with intrusions',
    chartHyper: 'Alert level (0-10)',
    chartDissoc: 'Dissociation and tension',
    chartIntr: 'Intrusions / flashbacks per day',
    dissocLabel: { 0: 'Present', 2: 'Distracted', 5: 'Disconnected' } as Record<number, string>,
    dissoc: 'Dissociation', tension: 'Physical tension',
    history: 'Detailed history', entries: 'entries',
    grounded: 'Grounded ✓', avoided: 'Avoidance', intrusions: 'Intrusions',
  },
};

const TraumaSection: React.FC<BaseSectionProps> = ({ user, rangeDays, language, chartColors }) => {
  const t = STR[pickLang(language)];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'deepClinicalLogsTrauma'));
        const list: Entry[] = [];
        snap.forEach(d => {
          const data = d.data() as Partial<Entry>;
          list.push({
            dateKey: data.dateKey ?? d.id,
            intrusionFrequency: data.intrusionFrequency ?? 0,
            hypervigilanceLevel: data.hypervigilanceLevel ?? 0,
            avoidanceBehavior: !!data.avoidanceBehavior,
            dissociationLevel: data.dissociationLevel ?? 0,
            physicalTension: data.physicalTension ?? 0,
            groundingSuccess: data.groundingSuccess !== false,
            notes: data.notes ?? '',
          });
        });
        list.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        setEntries(list);
      } catch (err) { console.error('TraumaSection', err); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const filtered = useMemo(() => entries.filter(e => inRange(e.dateKey, rangeDays)), [entries, rangeDays]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const sumHyper = filtered.reduce((a, e) => a + e.hypervigilanceLevel, 0);
    const grounded = filtered.filter(e => e.groundingSuccess).length;
    const avoid = filtered.filter(e => e.avoidanceBehavior).length;
    const intrusionDays = filtered.filter(e => e.intrusionFrequency > 0).length;
    return {
      avgHyper: sumHyper / filtered.length,
      groundedPct: (grounded / filtered.length) * 100,
      avoidPct: (avoid / filtered.length) * 100,
      intrusionDays,
    };
  }, [filtered]);

  if (loading) return <SectionLoader />;
  if (entries.length === 0 || filtered.length === 0) return <SectionEmpty title={t.noData} />;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<ShieldAlert size={18} />} label={t.kpiHyper} value={`${stats!.avgHyper.toFixed(1)}/10`}
          accent="text-rose-600 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-950/30" border="border-rose-100 dark:border-rose-900" />
        <KpiCard icon={<Wind size={18} />} label={t.kpiGrounding} value={`${stats!.groundedPct.toFixed(0)}%`}
          accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30" border="border-emerald-100 dark:border-emerald-900" />
        <KpiCard icon={<Eye size={18} />} label={t.kpiAvoid} value={`${stats!.avoidPct.toFixed(0)}%`}
          accent="text-slate-600 dark:text-slate-300" bg="bg-slate-100 dark:bg-slate-800/60" border="border-slate-200 dark:border-slate-700" />
        <KpiCard icon={<Zap size={18} />} label={t.kpiIntrusions} value={String(stats!.intrusionDays)}
          accent="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/30" border="border-amber-100 dark:border-amber-900" />
      </div>

      <Card className="p-6 h-80">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartHyper}</h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="trHyper" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e11d48" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
            <YAxis stroke={chartColors.text} domain={[0, 10]} />
            <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
            <Area type="monotone" dataKey="hypervigilanceLevel" stroke="#e11d48" strokeWidth={2} fillOpacity={1} fill="url(#trHyper)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartDissoc}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={filtered}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} domain={[0, 5]} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Bar dataKey="dissociationLevel" name={t.dissoc} fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="physicalTension" name={t.tension} fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartIntr}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={filtered}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} domain={[0, 5]} allowDecimals={false} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Bar dataKey="intrusionFrequency" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                {filtered.map((e, i) => (
                  <Cell key={i} fill={e.intrusionFrequency === 0 ? '#e2e8f0' : '#f59e0b'} />
                ))}
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
                <Badge tone="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"><ShieldAlert size={10} /> {e.hypervigilanceLevel}/10</Badge>
                {e.intrusionFrequency > 0 && (
                  <Badge tone="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><Zap size={10} /> {e.intrusionFrequency} {t.intrusions.toLowerCase()}</Badge>
                )}
                {e.groundingSuccess && (
                  <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Wind size={10} /> {t.grounded}</Badge>
                )}
                {e.avoidanceBehavior && (
                  <Badge tone="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"><Eye size={10} /> {t.avoided}</Badge>
                )}
              </>}
              chips={<>
                <Chip>{t.dissoc}: {t.dissocLabel[e.dissociationLevel] ?? e.dissociationLevel}</Chip>
                <Chip>{t.tension}: {e.physicalTension}/5</Chip>
              </>}
              notes={e.notes}
            />
          ))}
        </div>
      </Card>
    </>
  );
};

export default TraumaSection;
