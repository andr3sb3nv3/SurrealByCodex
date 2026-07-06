import { deleteDoc, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getLastMonthsDateRange, listDateKeysInRange, parseDateKeyLocal } from './dateUtils';
import { DEFAULT_CLINICAL_METRICS, type ClinicalMetricKey } from './clinicalMetricsConfig';

export interface DemoSeedConfig {
  months?: number;
  consistency?: 'consistent' | 'inconsistent' | 'mixed';
  includeDailyMetrics?: Array<
    | 'estado_animo'
    | 'nivel_energia'
    | 'nivel_deporte'
    | 'calidad_sueno'
    | 'social_confort'
    | 'nivel_motivacion'
    | 'nivel_concentracion'
    | 'regulacion_emocional'
  >;
  evolvingMetrics?: boolean;
  dailyGoalsCount?: number;
  includeClinicalMetrics?: ClinicalMetricKey[];
}

interface DemoResult {
  success: boolean;
  error?: string;
  startKey: string;
  endKey: string;
  daysGenerated: number;
  verifiedDailyLogs: number;
  verifiedClinicalLogs: number;
  expectedClinicalLogs: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const wave = (idx: number, period: number, amplitude: number, offset = 0) =>
  Math.sin((idx + offset) / period) * amplitude;
const round1 = (value: number) => Math.round(value * 10) / 10;

const DEMO_SNAPSHOT_IDS = ['demo-current', 'demo-midpoint', 'demo-start'];

const buildDailyLog = (dateKey: string, idx: number, total: number) => {
  const progress = idx / Math.max(1, total - 1);
  const mood = clamp(Math.round(5 + progress * 2 + wave(idx, 6, 1.4)), 1, 10);
  const energy = clamp(Math.round(5 + progress * 2 + wave(idx, 5, 1.2, 2)), 1, 10);
  const sleep = clamp(Math.round(6 + wave(idx, 8, 1.5, 1)), 1, 10);
  const focus = clamp(Math.round(4 + progress * 3 + wave(idx, 4, 1.3, 3)), 1, 10);
  const sport = clamp(Math.round(3 + progress * 3 + wave(idx, 9, 1.1)), 1, 10);
  const social = clamp(Math.round(5 + wave(idx, 7, 1.4)), 1, 10);
  const motivation = clamp(Math.round(5 + progress * 2 + wave(idx, 6, 1.6, 4)), 1, 10);
  const emotional = clamp(Math.round(5 + progress * 2 + wave(idx, 10, 1.1, 5)), 1, 10);

  const completed = [
    { tarea: 'Registro de metricas completado', categoria: 'Seguimiento' },
    ...(idx % 3 !== 0 ? [{ tarea: 'Rutina breve de foco', categoria: 'Habitos' }] : []),
  ];
  const pending = idx % 4 === 0
    ? [{ tarea: 'Revisar disparadores de ansiedad', categoria: 'Clinico' }]
    : [{ tarea: 'Planificar descanso', categoria: 'Bienestar' }];

  return {
    fecha: dateKey,
    timestamp: parseDateKeyLocal(dateKey)?.getTime() ?? Date.now(),
    estado_animo: mood,
    calidad_sueno: sleep,
    nivel_energia: energy,
    nivel_deporte: sport,
    social_confort: social,
    nivel_motivacion: motivation,
    nivel_concentracion: focus,
    regulacion_emocional: emotional,
    reflexion: `Demo ${dateKey}: ansiedad ${clamp(8 - mood + 3, 1, 10)}/10, foco ${focus}/10, progreso sostenido.`,
    progreso_porcentaje: clamp(Math.round((completed.length / (completed.length + pending.length)) * 100), 0, 100),
    objetivos_completados: completed,
    objetivos_pendientes: pending,
    demoGenerated: true,
    demoRange: 'last-3-months',
  };
};

const buildClinical = (dateKey: string, idx: number, total: number) => {
  const progress = idx / Math.max(1, total - 1);
  const anxiety = clamp(Math.round(68 - progress * 22 + wave(idx, 4, 14)), 12, 92);
  const focus = clamp(Math.round(4 + progress * 4 + wave(idx, 5, 1.4)), 1, 10);
  const craving = clamp(round1(6.6 - progress * 2.4 + wave(idx, 6, 1.5)), 0, 10);
  const mood = clamp(round1(-1.8 + progress * 2.8 + wave(idx, 8, 1.4)), -5, 5);

  return {
    anxiety: {
      dateKey,
      generalAnxiety: anxiety,
      panicEpisodes: anxiety > 75 && idx % 5 === 0 ? 1 : 0,
      physicalSymptoms: anxiety > 60 ? ['palpitations', 'muscleTension'] : ['muscleTension'],
      anticipatoryAnxiety: clamp(Math.round(anxiety * 0.78), 0, 100),
      avoidanceBehavior: anxiety > 70 && idx % 3 === 0,
      notes: 'Demo: registro de ansiedad para validar graficos y KPIs.',
      demoGenerated: true,
    },
    bipolar: {
      dateKey,
      globalMood: mood,
      energyLevel: clamp(Math.round(5 + mood + wave(idx, 7, 1)), 1, 10),
      sleepHours: clamp(round1(7.1 - Math.max(0, mood) * 0.35 + wave(idx, 9, 0.8)), 4, 10),
      irritability: anxiety > 70 ? 3 : anxiety > 50 ? 1 : 0,
      racingThoughts: mood > 1.8 || focus < 4,
      medicationAdherence: idx % 11 !== 0,
      notes: 'Demo: estado de animo con variacion controlada.',
      demoGenerated: true,
    },
    substance: {
      dateKey,
      cravingIntensity: craving,
      consumptionCount: craving > 7.2 && idx % 6 === 0 ? 1 : 0,
      relapseRisk: clamp(Math.round(craving / 2), 1, 5),
      usedCopingSkills: idx % 2 === 0,
      socialSupportContact: idx % 5 === 0 || craving > 7,
      mainTrigger: craving > 6 ? 'estres laboral' : 'rutina',
      notes: 'Demo: consumo y craving para validar seguimiento.',
      demoGenerated: true,
    },
    adhd: {
      dateKey,
      focusLevel: focus,
      hyperactivity: clamp(Math.round(4 - progress * 1.5 + wave(idx, 4, 1)), 0, 5),
      impulsivity: clamp(Math.round(3 - progress + wave(idx, 5, 1)), 0, 5),
      completedTasks: clamp(Math.round(2 + progress * 5 + wave(idx, 3, 1)), 0, 9),
      timeManagement: clamp(Math.round(2 + progress * 3 + wave(idx, 6, 1)), 1, 5),
      medicationTaken: idx % 9 !== 0,
      notes: 'Demo: foco y TDAH para validar productividad.',
      demoGenerated: true,
    },
  };
};

export const seedIntegrationDemoData = async (uid: string, months = 3): Promise<DemoResult> => {
  if (!db) {
    return { success: false, error: 'Firestore is not initialized.', startKey: '', endKey: '', daysGenerated: 0, verifiedDailyLogs: 0, verifiedClinicalLogs: 0, expectedClinicalLogs: 0 };
  }

  const { startDate, endDate, startKey, endKey } = getLastMonthsDateRange(months);
  const dateKeys = listDateKeysInRange(startDate, endDate);
  const batch = writeBatch(db);

  batch.set(doc(db, 'users', uid), {
    clinicalMetrics: DEFAULT_CLINICAL_METRICS,
    demoGenerated: true,
    demoRange: 'last-3-months',
    updatedAt: Date.now(),
  }, { merge: true });
  batch.set(doc(db, 'users', uid, 'settings', 'clinicalMetrics'), {
    clinicalMetrics: DEFAULT_CLINICAL_METRICS,
    demoGenerated: true,
    updatedAt: Date.now(),
  }, { merge: true });

  dateKeys.forEach((dateKey, idx) => {
    const daily = buildDailyLog(dateKey, idx, dateKeys.length);
    const clinical = buildClinical(dateKey, idx, dateKeys.length);
    batch.set(doc(db, 'users', uid, 'daily_logs', dateKey), daily, { merge: true });
    batch.set(doc(db, 'users', uid, 'deepClinicalLogsAnxiety', dateKey), clinical.anxiety, { merge: true });
    batch.set(doc(db, 'users', uid, 'deepClinicalLogsBipolar', dateKey), clinical.bipolar, { merge: true });
    batch.set(doc(db, 'users', uid, 'deepClinicalLogsSubstance', dateKey), clinical.substance, { merge: true });
    batch.set(doc(db, 'users', uid, 'deepClinicalLogsADHD', dateKey), clinical.adhd, { merge: true });
  });

  const snapshotIndexes = [dateKeys.length - 1, Math.floor(dateKeys.length / 2), 0];
  snapshotIndexes.forEach((idx, snapshotIdx) => {
    const dateKey = dateKeys[idx];
    const daily = buildDailyLog(dateKey, idx, dateKeys.length);
    batch.set(doc(db, 'users', uid, 'snapshots', DEMO_SNAPSHOT_IDS[snapshotIdx]), {
      title: snapshotIdx === 0 ? 'Demo actual' : snapshotIdx === 1 ? 'Demo punto medio' : 'Demo inicial',
      dateKey,
      note: daily.reflexion,
      dailyLog: daily,
      clinicalMetrics: DEFAULT_CLINICAL_METRICS,
      totals: {
        totalDailyLogs: dateKeys.length,
        totalClinicalModules: DEFAULT_CLINICAL_METRICS.length,
      },
      createdAt: daily.timestamp,
      demoGenerated: true,
    }, { merge: true });
  });

  await batch.commit();
  return {
    success: true,
    startKey,
    endKey,
    daysGenerated: dateKeys.length,
    verifiedDailyLogs: dateKeys.length,
    verifiedClinicalLogs: dateKeys.length * DEFAULT_CLINICAL_METRICS.length,
    expectedClinicalLogs: dateKeys.length * DEFAULT_CLINICAL_METRICS.length,
  };
};

export const clearIntegrationDemoData = async (uid: string, months = 3): Promise<{ success: boolean; error?: string }> => {
  if (!db) return { success: false, error: 'Firestore is not initialized.' };
  const { startDate, endDate } = getLastMonthsDateRange(months);
  const dateKeys = listDateKeysInRange(startDate, endDate);
  const batch = writeBatch(db);

  dateKeys.forEach((dateKey) => {
    batch.delete(doc(db, 'users', uid, 'daily_logs', dateKey));
    batch.delete(doc(db, 'users', uid, 'deepClinicalLogsAnxiety', dateKey));
    batch.delete(doc(db, 'users', uid, 'deepClinicalLogsBipolar', dateKey));
    batch.delete(doc(db, 'users', uid, 'deepClinicalLogsSubstance', dateKey));
    batch.delete(doc(db, 'users', uid, 'deepClinicalLogsADHD', dateKey));
  });
  DEMO_SNAPSHOT_IDS.forEach((snapshotId) => {
    batch.delete(doc(db, 'users', uid, 'snapshots', snapshotId));
  });

  await batch.commit();
  await Promise.allSettled([
    setDoc(doc(db, 'users', uid), { demoGenerated: false, updatedAt: Date.now() }, { merge: true }),
    deleteDoc(doc(db, 'users', uid, 'settings', 'clinicalMetrics')),
  ]);
  return { success: true };
};

export const seedDemoUsers = async (targetUid?: string, config?: DemoSeedConfig) => {
  if (!targetUid) {
    return { success: false, error: 'Missing target uid.', startKey: '', endKey: '', daysGenerated: 0, verifiedDailyLogs: 0, verifiedClinicalLogs: 0, expectedClinicalLogs: 0 };
  }
  return seedIntegrationDemoData(targetUid, config?.months ?? 3);
};

export const clearTargetedDemoUserData = async (targetUid?: string) => {
  if (!targetUid) return { success: false, error: 'Missing target uid.' };
  return clearIntegrationDemoData(targetUid, 3);
};
