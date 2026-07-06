import React, { useEffect, useMemo, useState } from 'react';
import { Zap, AlertTriangle, Shield, Users, Activity } from 'lucide-react';
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

interface Entry {
  dateKey: string;
  cravingIntensity: number;     // 0-10
  consumptionCount: number;
  relapseRisk: number;          // 1-5
  usedCopingSkills: boolean;
  socialSupportContact: boolean;
  mainTrigger: string;
  notes: string;
}

const STR = {
  es: {
    noData: 'Sin registros de consumo en este rango.',
    kpiCraving: 'Craving promedio', kpiConsumption: 'Días con consumo',
    kpiSupport: 'Contacto con red de apoyo', kpiSkills: 'Uso de herramientas',
    chartCraving: 'Intensidad del craving (0-10)',
    chartRisk: 'Riesgo percibido de recaída (1-5)',
    chartConsumption: 'Consumo reportado por día',
    history: 'Historial detallado', entries: 'registros',
    sober: 'Sobrio', used: 'Consumo', support: 'Red', skills: 'Coping',
  },
  en: {
    noData: 'No substance entries in this range.',
    kpiCraving: 'Avg. craving', kpiConsumption: 'Consumption days',
    kpiSupport: 'Support contact', kpiSkills: 'Coping skills used',
    chartCraving: 'Craving intensity (0-10)',
    chartRisk: 'Perceived relapse risk (1-5)',
    chartConsumption: 'Reported consumption per day',
    history: 'Detailed history', entries: 'entries',
    sober: 'Sober', used: 'Use', support: 'Support', skills: 'Coping',
  },
};

const SubstanceSection: React.FC<BaseSectionProps> = ({ user, rangeDays, language, chartColors }) => {
  const t = STR[pickLang(language)];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, CLINICAL_COLLECTIONS.users, user.uid, CLINICAL_COLLECTIONS.substance));
        const list: Entry[] = [];
        snap.forEach(d => {
          const data = d.data() as Partial<Entry>;
          list.push({
            dateKey: data.dateKey ?? d.id,
            cravingIntensity: data.cravingIntensity ?? 0,
            consumptionCount: data.consumptionCount ?? 0,
            relapseRisk: data.relapseRisk ?? 1,
            usedCopingSkills: !!data.usedCopingSkills,
            socialSupportContact: !!data.socialSupportContact,
            mainTrigger: data.mainTrigger ?? '',
            notes: data.notes ?? '',
          });
        });
        list.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        setEntries(list);
      } catch (err) { console.error('SubstanceSection', err); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const filtered = useMemo(() => entries.filter(e => inRange(e.dateKey, rangeDays)), [entries, rangeDays]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const sumCraving = filtered.reduce((a, e) => a + e.cravingIntensity, 0);
    const consumptionDays = filtered.filter(e => e.consumptionCount > 0).length;
    const support = filtered.filter(e => e.socialSupportContact).length;
    const skills = filtered.filter(e => e.usedCopingSkills).length;
    return {
      avgCraving: sumCraving / filtered.length,
      consumptionDays,
      supportPct: (support / filtered.length) * 100,
      skillsPct: (skills / filtered.length) * 100,
    };
  }, [filtered]);

  if (loading) return <SectionLoader />;
  if (entries.length === 0 || filtered.length === 0) return <SectionEmpty title={t.noData} />;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Zap size={18} />} label={t.kpiCraving} value={`${stats!.avgCraving.toFixed(1)}/10`}
          accent="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-950/30" border="border-orange-100 dark:border-orange-900" />
        <KpiCard icon={<AlertTriangle size={18} />} label={t.kpiConsumption} value={String(stats!.consumptionDays)}
          accent="text-rose-600 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-950/30" border="border-rose-100 dark:border-rose-900" />
        <KpiCard icon={<Users size={18} />} label={t.kpiSupport} value={`${stats!.supportPct.toFixed(0)}%`}
          accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30" border="border-emerald-100 dark:border-emerald-900" />
        <KpiCard icon={<Shield size={18} />} label={t.kpiSkills} value={`${stats!.skillsPct.toFixed(0)}%`}
          accent="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-950/30" border="border-indigo-100 dark:border-indigo-900" />
      </div>

      <Card className="p-6 h-80">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartCraving}</h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="subCrav" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
            <YAxis stroke={chartColors.text} domain={[0, 10]} />
            <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
            <Area type="monotone" dataKey="cravingIntensity" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#subCrav)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartRisk}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={filtered}>
              <defs>
                <linearGradient id="subRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} domain={[1, 5]} allowDecimals={false} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Area type="monotone" dataKey="relapseRisk" stroke="#e11d48" strokeWidth={2} fillOpacity={1} fill="url(#subRisk)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartConsumption}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={filtered}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} allowDecimals={false} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Bar dataKey="consumptionCount" radius={[4, 4, 0, 0]}>
                {filtered.map((e, i) => (
                  <Cell key={i} fill={e.consumptionCount === 0 ? '#cbd5e1' : '#e11d48'} />
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
                <Badge tone="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"><Zap size={10} /> {e.cravingIntensity}/10</Badge>
                {e.consumptionCount > 0 ? (
                  <Badge tone="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"><AlertTriangle size={10} /> {e.consumptionCount} {t.used.toLowerCase()}</Badge>
                ) : (
                  <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Shield size={10} /> {t.sober}</Badge>
                )}
                {e.socialSupportContact && (
                  <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Users size={10} /> {t.support}</Badge>
                )}
                {e.usedCopingSkills && (
                  <Badge tone="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"><Shield size={10} /> {t.skills}</Badge>
                )}
              </>}
              chips={<>
                <Chip>Riesgo: {e.relapseRisk}/5</Chip>
                {e.mainTrigger && <Chip>🎯 {e.mainTrigger.slice(0, 50)}</Chip>}
              </>}
              notes={e.notes}
            />
          ))}
        </div>
      </Card>
    </>
  );
};

export default SubstanceSection;
