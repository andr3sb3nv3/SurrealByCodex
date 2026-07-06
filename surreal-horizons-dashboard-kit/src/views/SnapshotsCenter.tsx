import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { Activity, ArrowLeft, BarChart2, Camera, CalendarDays, Database, FileText, Loader2, Plus, ShieldCheck } from 'lucide-react';
import CompanyHeader from '../components/CompanyHeader';
import Card from '../components/ui/Card';
import Toast from '../components/ui/Toast';
import { db } from '../services/firebase';
import { Language, Theme } from '../types';
import { useToast } from '../utils/useToast';
import { formatDateFriendly, getTodayKey } from '../utils/dateUtils';
import { resolveUserClinicalMetrics, type ClinicalMetricKey } from '../utils/clinicalMetricsConfig';

interface Props {
  user: User | null;
  authUser: User | null;
  language: Language;
  theme: Theme;
  isPro: boolean;
  onBack: () => void;
  onAuthRequest: () => void;
  onNavigateToProfile: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToClinicalMetrics: () => void;
  onLogout: () => void;
  onToggleLanguage: (lang: Language) => void;
}

interface SnapshotRecord {
  id: string;
  createdAt?: number;
  dateKey: string;
  title: string;
  note?: string;
  dailyLog?: Record<string, unknown> | null;
  clinicalMetrics: ClinicalMetricKey[];
  totals: {
    totalDailyLogs: number;
    totalClinicalModules: number;
  };
}

const DAILY_LABELS: Array<{ key: string; label: string; color: string }> = [
  { key: 'estado_animo', label: 'Animo', color: 'text-pink-500' },
  { key: 'nivel_energia', label: 'Energia', color: 'text-amber-500' },
  { key: 'nivel_deporte', label: 'Deporte', color: 'text-emerald-500' },
  { key: 'calidad_sueno', label: 'Sueno', color: 'text-indigo-500' },
  { key: 'social_confort', label: 'Social', color: 'text-teal-500' },
  { key: 'nivel_motivacion', label: 'Motivacion', color: 'text-orange-500' },
  { key: 'nivel_concentracion', label: 'Foco', color: 'text-violet-500' },
  { key: 'regulacion_emocional', label: 'Regulacion', color: 'text-sky-500' },
];

const metricLabel = (metric: ClinicalMetricKey) => ({
  anxiety: 'Ansiedad',
  depression: 'Depresion',
  bipolar: 'Estado de Ánimo',
  schizophrenia: 'Psicotico',
  ocd: 'TOC',
  trauma: 'Trauma',
  sleep: 'Sueno clinico',
  personality: 'Personalidad',
  adhd: 'Foco y TDAH',
  substance: 'Consumo y Craving',
}[metric]);

const SnapshotsCenter: React.FC<Props> = ({
  user,
  authUser,
  language,
  isPro,
  onBack,
  onAuthRequest,
  onNavigateToProfile,
  onNavigateToDashboard,
  onNavigateToClinicalMetrics,
  onLogout,
  onToggleLanguage,
}) => {
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, showToast, clearToast } = useToast();
  const todayKey = getTodayKey();

  const selected = useMemo(
    () => snapshots.find(snapshot => snapshot.id === selectedId) ?? snapshots[0] ?? null,
    [snapshots, selectedId]
  );

  const loadSnapshots = async () => {
    if (!user || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snapQuery = query(
        collection(db, 'users', user.uid, 'snapshots'),
        orderBy('createdAt', 'desc'),
        limit(25)
      );
      const snap = await getDocs(snapQuery);
      const list = snap.docs.map((entry) => ({
        id: entry.id,
        ...entry.data(),
      })) as SnapshotRecord[];
      setSnapshots(list);
      setSelectedId(current => current ?? list[0]?.id ?? null);
    } catch (error) {
      console.error('Snapshots load error', error);
      showToast('No se pudieron cargar los snapshots.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, [user?.uid]);

  const createSnapshot = async () => {
    if (!user || !db) return;
    setSaving(true);
    try {
      const [dailySnap, allDailySnap, clinicalMetrics] = await Promise.all([
        getDoc(doc(db, 'users', user.uid, 'daily_logs', todayKey)),
        getDocs(collection(db, 'users', user.uid, 'daily_logs')),
        resolveUserClinicalMetrics(user.uid, [user.displayName, user.email, user.uid]),
      ]);

      const payload = {
        title: `Snapshot ${formatDateFriendly(todayKey, language)}`,
        dateKey: todayKey,
        note: dailySnap.exists() ? (dailySnap.data().reflexion ?? '') : '',
        dailyLog: dailySnap.exists() ? dailySnap.data() : null,
        clinicalMetrics,
        totals: {
          totalDailyLogs: allDailySnap.size,
          totalClinicalModules: clinicalMetrics.length,
        },
        createdAt: Date.now(),
        createdAtServer: serverTimestamp(),
      };

      await addDoc(collection(db, 'users', user.uid, 'snapshots'), payload);
      showToast('Snapshot creado.', 'success');
      await loadSnapshots();
    } catch (error) {
      console.error('Snapshot create error', error);
      showToast('No se pudo crear el snapshot.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
      <CompanyHeader
        onAuthClick={onAuthRequest}
        user={authUser}
        onProfileClick={onNavigateToProfile}
        language={language}
        onToggleLanguage={onToggleLanguage}
        isPro={isPro}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between gap-4 sticky top-20 z-20 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Camera className="text-violet-500" /> Snapshots
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cortes guardados del estado del cliente, metricas y modulos clinicos.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onNavigateToDashboard} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
            <BarChart2 size={14} /> Historico
          </button>
          <button onClick={onNavigateToClinicalMetrics} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-xs font-bold">
            <Activity size={14} /> Clinicas
          </button>
          <button onClick={createSnapshot} disabled={saving || !user} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear snapshot
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-900 dark:text-white">Guardados</h2>
            <span className="text-xs font-bold text-slate-400">{snapshots.length}</span>
          </div>
          {loading ? (
            <div className="py-12 grid place-items-center text-slate-400"><Loader2 className="animate-spin" /></div>
          ) : snapshots.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Database size={36} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm font-bold">Todavia no hay snapshots.</p>
              <p className="text-xs mt-1 text-slate-400">Creá uno para congelar el estado actual.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.map(snapshot => {
                const active = selected?.id === snapshot.id;
                return (
                  <button
                    key={snapshot.id}
                    onClick={() => setSelectedId(snapshot.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${active ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    <p className="text-sm font-black text-slate-900 dark:text-white">{snapshot.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDateFriendly(snapshot.dateKey, language)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <section className="space-y-6">
          {!selected ? (
            <Card className="p-10 text-center text-slate-500">
              <Camera size={44} className="mx-auto mb-3 opacity-50" />
              <p className="font-bold">Seleccioná o creá un snapshot.</p>
            </Card>
          ) : (
            <>
              <Card className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selected.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                      <CalendarDays size={14} /> {formatDateFriendly(selected.dateKey, language)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 min-w-[260px]">
                    <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-300">Registros</p>
                      <p className="text-2xl font-black">{selected.totals?.totalDailyLogs ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-300">Clinicas</p>
                      <p className="text-2xl font-black">{selected.totals?.totalClinicalModules ?? 0}</p>
                    </div>
                  </div>
                </div>
                {selected.note && (
                  <div className="mt-5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                      <FileText size={14} /> Reflexion
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{selected.note}"</p>
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="font-black text-slate-900 dark:text-white mb-4">Metricas diarias capturadas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {DAILY_LABELS.map(metric => {
                    const value = selected.dailyLog?.[metric.key];
                    return (
                      <div key={metric.key} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{metric.label}</p>
                        <p className={`text-2xl font-black ${metric.color}`}>{typeof value === 'number' ? value : '-'}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-orange-500" /> Modulos clinicos activos
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(selected.clinicalMetrics ?? []).map(metric => (
                    <span key={metric} className="px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-xs font-black">
                      {metricLabel(metric)}
                    </span>
                  ))}
                </div>
              </Card>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default SnapshotsCenter;
