import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export type ClinicalMetricKey =
  | 'anxiety'
  | 'depression'
  | 'bipolar'
  | 'schizophrenia'
  | 'ocd'
  | 'trauma'
  | 'sleep'
  | 'personality'
  | 'adhd'
  | 'substance';

export const DEFAULT_CLINICAL_METRICS: ClinicalMetricKey[] = [
  'depression',
  'bipolar',
  'schizophrenia',
  'substance',
  'anxiety',
  'ocd',
  'trauma',
  'sleep',
  'personality',
  'adhd',
];

const CLINICAL_METRIC_SET = new Set<ClinicalMetricKey>(DEFAULT_CLINICAL_METRICS);

export const CLINICAL_METRIC_TO_MODULE_ID: Record<ClinicalMetricKey, string> = {
  anxiety: 'anxiety_log',
  depression: 'depression_tracker',
  bipolar: 'mood_tracker',
  schizophrenia: 'schizophrenia_tracker',
  ocd: 'ocd_tracker',
  trauma: 'trauma_log',
  sleep: 'sleep_journal',
  personality: 'personality_tracker',
  adhd: 'adhd_tracker',
  substance: 'substance_tracker',
};

export const sanitizeClinicalMetrics = (raw: unknown): ClinicalMetricKey[] => {
  if (!Array.isArray(raw)) return [];
  const out: ClinicalMetricKey[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    if (!CLINICAL_METRIC_SET.has(item as ClinicalMetricKey)) continue;
    const key = item as ClinicalMetricKey;
    if (!out.includes(key)) out.push(key);
  }
  return out;
};

export const resolveUserClinicalMetrics = async (uid: string): Promise<ClinicalMetricKey[]> => {
  if (!db) return DEFAULT_CLINICAL_METRICS;
  const settingsRef = doc(db, 'users', uid, 'settings', 'clinicalMetrics');
  const userRef = doc(db, 'users', uid);
  const [settingsSnap, userSnap] = await Promise.all([getDoc(settingsRef), getDoc(userRef)]);

  const settingsMetrics = sanitizeClinicalMetrics(settingsSnap.data()?.clinicalMetrics);
  if (settingsMetrics.length > 0) return settingsMetrics;

  const userMetrics = sanitizeClinicalMetrics(userSnap.data()?.clinicalMetrics);
  if (userMetrics.length > 0) return userMetrics;

  return DEFAULT_CLINICAL_METRICS;
};

export const persistUserClinicalMetrics = async (uid: string, clinicalMetrics: ClinicalMetricKey[]): Promise<void> => {
  if (!db) return;
  const normalized = sanitizeClinicalMetrics(clinicalMetrics);
  const payload = { clinicalMetrics: normalized.length > 0 ? normalized : DEFAULT_CLINICAL_METRICS, updatedAt: Date.now() };
  await Promise.all([
    setDoc(doc(db, 'users', uid), payload, { merge: true }),
    setDoc(doc(db, 'users', uid, 'settings', 'clinicalMetrics'), payload, { merge: true }),
  ]);
};
