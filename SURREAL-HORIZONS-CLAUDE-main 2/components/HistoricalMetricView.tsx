import React, { useState, useMemo } from 'react';
import { X, Calendar, Target, Quote, TrendingUp } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DailyLog } from '../types';

export interface HistoricalMetricDef {
  key: string;
  dbField: keyof DailyLog;
  label: string;
  color: string;
  tailwindText: string;
  tailwindBg: string;
  tailwindBorder: string;
}

interface ChartColors {
  grid: string;
  text: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

interface HistoricalLabels {
  title: string;
  selectMetric: string;
  rangeMonths: (n: number) => string;
  hint: string;
  noDataInRange: string;
  reflection: string;
  progress: string;
  completed: string;
  pending: string;
  valueOutOf10: (v: number) => string;
  average?: string;
  entries?: string;
}

interface Props {
  metrics: HistoricalMetricDef[];
  rawData: DailyLog[];
  initialMetricKey?: string;
  chartColors: ChartColors;
  labels: HistoricalLabels;
  onClose: () => void;
}

type RangeMonths = 3 | 6 | 12;

const HistoricalMetricView: React.FC<Props> = ({
  metrics, rawData, initialMetricKey, chartColors, labels, onClose
}) => {
  const [selectedMetricKey, setSelectedMetricKey] = useState<string>(
    initialMetricKey && metrics.some(m => m.key === initialMetricKey)
      ? initialMetricKey
      : (metrics[0]?.key ?? '')
  );
  const [range, setRange] = useState<RangeMonths>(6);
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);

  const currentMetric = useMemo(
    () => metrics.find(m => m.key === selectedMetricKey) ?? metrics[0],
    [metrics, selectedMetricKey]
  );

  const filteredData = useMemo(() => {
    if (!currentMetric) return [];
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setMonth(cutoff.getMonth() - range);
    const field = currentMetric.dbField as string;
    return rawData
      .filter(log => new Date(log.fecha).getTime() >= cutoff.getTime())
      .filter(log => {
        const v = (log as any)[field];
        return typeof v === 'number' && !Number.isNaN(v);
      })
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [rawData, currentMetric, range]);

  const average = useMemo(() => {
    if (!currentMetric || filteredData.length === 0) return null;
    const field = currentMetric.dbField as string;
    const values = filteredData
      .map(log => (log as any)[field])
      .filter((v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v));
    if (values.length === 0) return null;
    const sum = values.reduce((acc: number, v: number) => acc + v, 0);
    return { value: sum / values.length, count: values.length };
  }, [filteredData, currentMetric]);

  const gradId = `histGrad-${currentMetric?.key ?? 'x'}`;

  const handleChartClick = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      const payload = e.activePayload[0].payload as DailyLog;
      if (payload) setSelectedLog(payload);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full my-auto max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{labels.title}</h2>
              <p className="text-xs text-slate-500">{labels.hint}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              {labels.selectMetric}
            </p>
            <div className="flex flex-wrap gap-2">
              {metrics.map(m => {
                const isActive = selectedMetricKey === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMetricKey(m.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      isActive
                        ? `${m.tailwindBg} ${m.tailwindText} ${m.tailwindBorder}`
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            {([3, 6, 12] as RangeMonths[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  range === r
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {labels.rangeMonths(r)}
              </button>
            ))}
          </div>

          {average && currentMetric && (
            <div
              className={`flex items-center justify-between gap-3 p-4 rounded-2xl border ${currentMetric.tailwindBg} ${currentMetric.tailwindBorder}`}
            >
              <div className="flex flex-col">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${currentMetric.tailwindText}`}>
                  {labels.average ?? 'Promedio'} · {currentMetric.label}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {average.count} {labels.entries ?? 'registros'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-black ${currentMetric.tailwindText}`}>
                  {average.value.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400 font-medium">/10</span>
              </div>
            </div>
          )}

          {filteredData.length === 0 || !currentMetric ? (
            <div className="text-center py-16 text-slate-400 text-sm">{labels.noDataInRange}</div>
          ) : (
            <div className="h-72 md:h-80 select-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredData}
                  onClick={handleChartClick}
                  margin={{ top: 10, right: 12, left: -8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentMetric.color} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={currentMetric.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis
                    dataKey="fecha"
                    stroke={chartColors.text}
                    fontSize={11}
                    tickFormatter={(val: string) => val.slice(5)}
                    minTickGap={30}
                  />
                  <YAxis stroke={chartColors.text} domain={[0, 10]} />
                  <Tooltip
                    contentStyle={{
                      background: chartColors.tooltipBg,
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      borderRadius: '8px',
                      color: chartColors.tooltipText,
                    }}
                    labelFormatter={(label: string) => label}
                    formatter={(val: number) => [val, currentMetric.label]}
                  />
                  <Area
                    type="monotone"
                    dataKey={currentMetric.dbField as string}
                    stroke={currentMetric.color}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#${gradId})`}
                    connectNulls={false}
                    activeDot={{ r: 6, cursor: 'pointer', stroke: currentMetric.color, strokeWidth: 2, fill: chartColors.tooltipBg }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {selectedLog && currentMetric && (
        <DayDetailModal
          log={selectedLog}
          metrics={metrics}
          labels={labels}
          highlightMetricKey={currentMetric.key}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

interface DayDetailProps {
  log: DailyLog;
  metrics: HistoricalMetricDef[];
  labels: HistoricalLabels;
  highlightMetricKey: string;
  onClose: () => void;
}

const DayDetailModal: React.FC<DayDetailProps> = ({ log, metrics, labels, highlightMetricKey, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-[130] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full my-auto max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-1">
              <Calendar size={12} /> {log.fecha}
            </p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {new Date(log.fecha + 'T12:00:00').toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {metrics.map(m => {
              const val = (log as any)[m.dbField];
              if (typeof val !== 'number') return null;
              const highlighted = m.key === highlightMetricKey;
              return (
                <div
                  key={m.key}
                  className={`p-3 rounded-xl transition-all ${
                    highlighted
                      ? `${m.tailwindBg} border-2 ${m.tailwindBorder}`
                      : 'bg-slate-50 dark:bg-slate-800 border-2 border-transparent'
                  }`}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${m.tailwindText}`}>{m.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {val}
                    <span className="text-xs text-slate-400 font-medium ml-1">/10</span>
                  </p>
                </div>
              );
            })}
          </div>

          {log.reflexion && log.reflexion.trim() !== '' && (
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                <Quote size={12} /> {labels.reflection}
              </p>
              <p className="text-sm italic text-slate-700 dark:text-slate-300 leading-relaxed">
                “{log.reflexion}”
              </p>
            </div>
          )}

          {typeof log.progreso_porcentaje === 'number' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{labels.progress}</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{log.progreso_porcentaje}</p>
                <p className="text-sm text-slate-400 mb-1">%</p>
              </div>
              <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, log.progreso_porcentaje))}%` }}
                />
              </div>
            </div>
          )}

          {log.objetivos_completados && log.objetivos_completados.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1.5">
                <Target size={12} /> {labels.completed}
              </p>
              <ul className="space-y-1.5">
                {log.objetivos_completados.map((o, i) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                    <span>{o.tarea}{o.categoria && <span className="text-xs text-slate-400 ml-1.5">· {o.categoria}</span>}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {log.objetivos_pendientes && log.objetivos_pendientes.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                <Target size={12} /> {labels.pending}
              </p>
              <ul className="space-y-1.5">
                {log.objetivos_pendientes.map((o, i) => (
                  <li key={i} className="text-sm text-slate-500 dark:text-slate-400 flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">○</span>
                    <span>{o.tarea}{o.categoria && <span className="text-xs text-slate-400 ml-1.5">· {o.categoria}</span>}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoricalMetricView;
