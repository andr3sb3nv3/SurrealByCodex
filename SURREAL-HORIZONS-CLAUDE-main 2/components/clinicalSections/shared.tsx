import React from 'react';
import { User } from 'firebase/auth';
import { Loader2, Database, MessageSquare } from 'lucide-react';
import { Language } from '../../types';

export interface ChartColors {
  grid: string;
  text: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

export type RangeDays = 7 | 30 | 90 | 365;

export interface BaseSectionProps {
  user: User;
  rangeDays: RangeDays;
  language: Language;
  chartColors: ChartColors;
}

export const pickLang = (language: Language): 'es' | 'en' => (language === 'es' ? 'es' : 'en');

export const friendlyDate = (dateKey: string, language: Language): string =>
  new Date(dateKey + 'T12:00:00').toLocaleDateString(
    language === 'es' ? 'es-AR' : 'en-US',
    { weekday: 'short', day: 'numeric', month: 'short' }
  );

export const inRange = (dateKey: string, rangeDays: RangeDays): boolean => {
  const cutoff = Date.now() - rangeDays * 86400000;
  return new Date(dateKey + 'T12:00:00').getTime() >= cutoff;
};

export const buildTooltipStyle = (cc: ChartColors): React.CSSProperties => ({
  background: cc.tooltipBg,
  border: `1px solid ${cc.tooltipBorder}`,
  borderRadius: '8px',
  color: cc.tooltipText,
});

// ---------- Shared UI ----------
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  bg: string;
  border: string;
  valueClass?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, accent, bg, border, valueClass }) => (
  <div className={`p-4 rounded-2xl border ${border} ${bg}`}>
    <div className={`flex items-center gap-2 ${accent} mb-2`}>
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <p className={`font-black text-slate-900 dark:text-slate-100 ${valueClass ?? 'text-2xl'}`}>
      {value}
    </p>
  </div>
);

export const SectionLoader: React.FC = () => (
  <div className="py-16 flex items-center justify-center text-slate-400">
    <Loader2 className="animate-spin" size={22} />
  </div>
);

interface SectionEmptyProps {
  title: string;
  hint?: string;
}
export const SectionEmpty: React.FC<SectionEmptyProps> = ({ title, hint }) => (
  <div className="text-center py-16 text-slate-500">
    <Database size={42} className="mx-auto mb-3 opacity-50" />
    <p className="font-bold">{title}</p>
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

interface HistoryItemProps {
  dateKey: string;
  language: Language;
  badges: React.ReactNode;
  chips?: React.ReactNode;
  notes?: string;
  extra?: React.ReactNode;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ dateKey, language, badges, chips, notes, extra }) => (
  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-black uppercase text-slate-400">{dateKey}</span>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">
          {friendlyDate(dateKey, language)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">{badges}</div>
    </div>
    {chips && <div className="flex flex-wrap gap-1.5 mb-2">{chips}</div>}
    {extra && <div className="mb-2">{extra}</div>}
    {notes && notes.trim() !== '' && (
      <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
        <MessageSquare size={12} className="shrink-0 mt-0.5 text-slate-400" />
        <span>"{notes}"</span>
      </div>
    )}
  </div>
);

export const Badge: React.FC<{ tone: string; children: React.ReactNode }> = ({ tone, children }) => (
  <span
    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${tone}`}
  >
    {children}
  </span>
);

export const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300">
    {children}
  </span>
);
