import React, { useEffect, useMemo, useState } from 'react';
import { Wind, UserCircle, Zap, Shield, Users, Heart } from 'lucide-react';
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
  impulsivityLevel: number;
  emotionalStability: number;
  relationshipConflict: boolean;
  fearOfAbandonment: number;
  selfImageStability: number;
  usedCrisisSkills: boolean;
  notes: string;
}

const STR = {
  es: {
    noData: 'Sin registros de personalidad en este rango.',
    kpiStability: 'Estabilidad emocional', kpiSelfImage: 'Autoimagen',
    kpiConflict: 'Días con conflicto', kpiSkills: 'Uso de habilidades',
    chartDual: 'Estabilidad y autoimagen (0-10)',
    chartImpuls: 'Impulsividad por día', chartFear: 'Miedo al abandono',
    stability: 'Estabilidad', selfImage: 'Autoimagen',
    history: 'Historial detallado', entries: 'registros',
    conflict: 'Conflicto', skills: 'DBT ✓',
  },
  en: {
    noData: 'No personality entries in this range.',
    kpiStability: 'Emotional stability', kpiSelfImage: 'Self-image',
    kpiConflict: 'Conflict days', kpiSkills: 'Skills usage',
    chartDual: 'Stability and self-image (0-10)',
    chartImpuls: 'Impulsivity per day', chartFear: 'Fear of abandonment',
    stability: 'Stability', selfImage: 'Self-image',
    history: 'Detailed history', entries: 'entries',
    conflict: 'Conflict', skills: 'DBT ✓',
  },
};

const PersonalitySection: React.FC<BaseSectionProps> = ({ user, rangeDays, language, chartColors }) => {
  const t = STR[pickLang(language)];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'deepClinicalLogsPersonality'));
        const list: Entry[] = [];
        snap.forEach(d => {
          const data = d.data() as Partial<Entry>;
          list.push({
            dateKey: data.dateKey ?? d.id,
            impulsivityLevel: data.impulsivityLevel ?? 0,
            emotionalStability: data.emotionalStability ?? 5,
            relationshipConflict: !!data.relationshipConflict,
            fearOfAbandonment: data.fearOfAbandonment ?? 0,
            selfImageStability: data.selfImageStability ?? 5,
            usedCrisisSkills: data.usedCrisisSkills !== false,
            notes: data.notes ?? '',
          });
        });
        list.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        setEntries(list);
      } catch (err) { console.error('PersonalitySection', err); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const filtered = useMemo(() => entries.filter(e => inRange(e.dateKey, rangeDays)), [entries, rangeDays]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const avg = (fn: (e: Entry) => number) => filtered.reduce((a, e) => a + fn(e), 0) / filtered.length;
    const conflict = filtered.filter(e => e.relationshipConflict).length;
    const skills = filtered.filter(e => e.usedCrisisSkills).length;
    return {
      avgStab: avg(e => e.emotionalStability),
      avgImg: avg(e => e.selfImageStability),
      conflictPct: (conflict / filtered.length) * 100,
      skillsPct: (skills / filtered.length) * 100,
    };
  }, [filtered]);

  if (loading) return <SectionLoader />;
  if (entries.length === 0 || filtered.length === 0) return <SectionEmpty title={t.noData} />;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Wind size={18} />} label={t.kpiStability} value={`${stats!.avgStab.toFixed(1)}/10`}
          accent="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-950/30" border="border-indigo-100 dark:border-indigo-900" />
        <KpiCard icon={<UserCircle size={18} />} label={t.kpiSelfImage} value={`${stats!.avgImg.toFixed(1)}/10`}
          accent="text-rose-600 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-950/30" border="border-rose-100 dark:border-rose-900" />
        <KpiCard icon={<Users size={18} />} label={t.kpiConflict} value={`${stats!.conflictPct.toFixed(0)}%`}
          accent="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-950/30" border="border-orange-100 dark:border-orange-900" />
        <KpiCard icon={<Shield size={18} />} label={t.kpiSkills} value={`${stats!.skillsPct.toFixed(0)}%`}
          accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30" border="border-emerald-100 dark:border-emerald-900" />
      </div>

      <Card className="p-6 h-80">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartDual}</h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="perStab" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="perImg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e11d48" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
            <YAxis stroke={chartColors.text} domain={[0, 10]} />
            <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="emotionalStability" name={t.stability} stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#perStab)" />
            <Area type="monotone" dataKey="selfImageStability" name={t.selfImage} stroke="#e11d48" strokeWidth={2} fillOpacity={1} fill="url(#perImg)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartImpuls}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={filtered}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} domain={[0, 5]} allowDecimals={false} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Bar dataKey="impulsivityLevel" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 h-72">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.chartFear}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={filtered}>
              <defs>
                <linearGradient id="perFear" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="dateKey" stroke={chartColors.text} fontSize={11} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
              <YAxis stroke={chartColors.text} domain={[0, 5]} />
              <Tooltip contentStyle={buildTooltipStyle(chartColors)} />
              <Area type="monotone" dataKey="fearOfAbandonment" stroke="#e11d48" strokeWidth={2} fillOpacity={1} fill="url(#perFear)" />
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
                <Badge tone="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"><Wind size={10} /> {e.emotionalStability}/10</Badge>
                <Badge tone="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"><UserCircle size={10} /> {e.selfImageStability}/10</Badge>
                {e.relationshipConflict && (
                  <Badge tone="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"><Users size={10} /> {t.conflict}</Badge>
                )}
                {e.usedCrisisSkills && (
                  <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Shield size={10} /> {t.skills}</Badge>
                )}
              </>}
              chips={<>
                <Chip><Zap size={10} className="inline mr-1" />Impulsividad: {e.impulsivityLevel}/5</Chip>
                <Chip><Heart size={10} className="inline mr-1" />Miedo abandono: {e.fearOfAbandonment}/5</Chip>
              </>}
              notes={e.notes}
            />
          ))}
        </div>
      </Card>
    </>
  );
};

export default PersonalitySection;
