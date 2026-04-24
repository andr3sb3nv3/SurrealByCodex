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
const METRIC_ORDER_BY_DIGIT: ClinicalMetricKey[] = [
  'anxiety',
  'depression',
  'bipolar',
  'schizophrenia',
  'ocd',
  'trauma',
  'sleep',
  'personality',
  'adhd',
  'substance',
];

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

const extractTenDigitCode = (identifiers: Array<string | null | undefined>): string | null => {
  for (const raw of identifiers) {
    if (!raw) continue;
    const runs = raw.trim().match(/\d+/g);
    if (!runs) continue;
    for (let i = runs.length - 1; i >= 0; i--) {
      if (runs[i].length >= 10) return runs[i].slice(-10);
    }
  }
  return null;
};

export const deriveClinicalMetricsFromIdentifiers = (identifiers: Array<string | null | undefined>): ClinicalMetricKey[] => {
  const code = extractTenDigitCode(identifiers);
  if (!code) return [];
  const inferred: ClinicalMetricKey[] = [];
  for (let i = 0; i < METRIC_ORDER_BY_DIGIT.length; i++) {
    const digit = Number.parseInt(code[i] ?? '0', 10);
    if (Number.isFinite(digit) && digit > 0) inferred.push(METRIC_ORDER_BY_DIGIT[i]);
  }
  return inferred;
};

export const getClinicalSeverityFromIdentifiers = (
  identifiers: Array<string | null | undefined>,
  metric: ClinicalMetricKey
): number => {
  const code = extractTenDigitCode(identifiers);
  if (!code) return 5;
  const idx = METRIC_ORDER_BY_DIGIT.indexOf(metric);
  if (idx < 0) return 5;
  const severity = Number.parseInt(code[idx] ?? '5', 10);
  return Number.isFinite(severity) && severity > 0 ? severity : 5;
};

export const resolveUserClinicalMetrics = async (
  uid: string,
  identifiers: Array<string | null | undefined> = []
): Promise<ClinicalMetricKey[]> => {
  if (!db) return DEFAULT_CLINICAL_METRICS;
  const settingsRef = doc(db, 'users', uid, 'settings', 'clinicalMetrics');
  const userRef = doc(db, 'users', uid);
  const [settingsSnap, userSnap] = await Promise.all([getDoc(settingsRef), getDoc(userRef)]);

  const settingsMetrics = sanitizeClinicalMetrics(settingsSnap.data()?.clinicalMetrics);
  if (settingsMetrics.length > 0) return settingsMetrics;

  const userMetrics = sanitizeClinicalMetrics(userSnap.data()?.clinicalMetrics);
  if (userMetrics.length > 0) return userMetrics;

  const inferredMetrics = deriveClinicalMetricsFromIdentifiers(identifiers);
  if (inferredMetrics.length > 0) {
    await persistUserClinicalMetrics(uid, inferredMetrics);
    return inferredMetrics;
  }

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
