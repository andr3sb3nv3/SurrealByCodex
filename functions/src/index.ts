import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { DocumentReference, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import nodemailer from 'nodemailer';

initializeApp();

const mailHost = defineSecret('MAIL_HOST');
const mailPort = defineSecret('MAIL_PORT');
const mailSecure = defineSecret('MAIL_SECURE');
const mailUser = defineSecret('MAIL_USER');
const mailPass = defineSecret('MAIL_PASS');
const mailFrom = defineSecret('MAIL_FROM');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DailyMetricKey =
  | 'estado_animo'
  | 'nivel_energia'
  | 'nivel_deporte'
  | 'calidad_sueno'
  | 'social_confort'
  | 'nivel_motivacion'
  | 'nivel_concentracion'
  | 'regulacion_emocional';

type ClinicalMetricKey =
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

interface SeedDemoDataInput {
  targetUid?: string;
  months?: number;
  consistency?: 'inconsistent' | 'always';
  includeDailyMetrics?: DailyMetricKey[];
  evolvingMetrics?: boolean;
  dailyGoalsCount?: number;
  includeClinicalMetrics?: ClinicalMetricKey[];
}

const TARGETED_DEMO_UIDS = [
  'InconsistentStreak2025',
  'DemoMetricas1111111111',
  'DemoMetricas2222222222',
] as const;

const TARGETED_DEMO_COLLECTIONS = [
  'daily_logs',
  'Set_goals',
  'deepClinicalLogsAnxiety',
  'deepClinicalLogsDepression',
  'deepClinicalLogsBipolar',
  'deepClinicalLogsSchizophrenia',
  'deepClinicalLogsOCD',
  'deepClinicalLogsTrauma',
  'deepClinicalLogsSleep',
  'deepClinicalLogsPersonality',
  'deepClinicalLogsADHD',
  'deepClinicalLogsSubstance',
] as const;

const DEFAULT_DAILY_METRICS: DailyMetricKey[] = [
  'estado_animo',
  'nivel_energia',
  'nivel_deporte',
  'calidad_sueno',
  'social_confort',
  'nivel_motivacion',
  'nivel_concentracion',
  'regulacion_emocional',
];

const DEFAULT_CLINICAL_METRICS: ClinicalMetricKey[] = [
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

const CLINICAL_COLLECTION_BY_KEY: Record<ClinicalMetricKey, string> = {
  anxiety: 'deepClinicalLogsAnxiety',
  depression: 'deepClinicalLogsDepression',
  bipolar: 'deepClinicalLogsBipolar',
  schizophrenia: 'deepClinicalLogsSchizophrenia',
  ocd: 'deepClinicalLogsOCD',
  trauma: 'deepClinicalLogsTrauma',
  sleep: 'deepClinicalLogsSleep',
  personality: 'deepClinicalLogsPersonality',
  adhd: 'deepClinicalLogsADHD',
  substance: 'deepClinicalLogsSubstance',
};

const DEMO_META: Record<string, { displayName: string; email: string }> = {
  InconsistentStreak2025: { displayName: 'Demo Clínico 0110000000', email: 'demo4@surreal.horizons' },
  DemoMetricas1111111111: { displayName: 'Demo Clínico 0001000001', email: 'demo5@surreal.horizons' },
  DemoMetricas2222222222: { displayName: 'Demo Clínico 1111111111', email: 'demo6@surreal.horizons' },
};

const CATEGORIES = ['Salud', 'Trabajo', 'Intelectual', 'Espiritual', 'Social', 'General'];
const REFLECTIONS = [
  'Me sentí un poco cansado hoy, pero logré terminar las tareas principales.',
  'Buen entrenamiento, la energía subió después del mediodía.',
  'Necesito organizar mejor mi sueño, me estoy acostando muy tarde.',
  'Día productivo en el trabajo, aunque descuidé un poco la dieta.',
  'Salí a caminar para despejar la mente, funcionó muy bien.',
  '',
];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (p: number) => Math.random() < p;
const pickOne = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKeyLocal = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const shiftMonths = (date: Date, months: number): Date => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const targetMonth = month + months;
  const lastDayOfTargetMonth = new Date(year, targetMonth + 1, 0).getDate();
  return new Date(year, targetMonth, Math.min(day, lastDayOfTargetMonth), 12, 0, 0, 0);
};

const getLastMonthsDateRange = (months: number, referenceDate = new Date()) => {
  const safeMonths = Math.max(1, Math.min(24, Math.round(months)));
  const endDate = parseDateKeyLocal(formatDateKey(referenceDate));
  const startDate = shiftMonths(endDate, -safeMonths);
  return {
    startDate,
    endDate,
    startKey: formatDateKey(startDate),
    endKey: formatDateKey(endDate),
  };
};

const listDateKeysInRange = (startDate: Date, endDate: Date): string[] => {
  const keys: string[] = [];
  const iter = new Date(startDate);
  iter.setHours(12, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(12, 0, 0, 0);
  while (iter.getTime() <= end.getTime()) {
    keys.push(formatDateKey(iter));
    iter.setDate(iter.getDate() + 1);
  }
  return keys;
};

const sanitizeDailyMetrics = (raw: unknown): DailyMetricKey[] => {
  if (!Array.isArray(raw)) return DEFAULT_DAILY_METRICS;
  const allowed = new Set(DEFAULT_DAILY_METRICS);
  const metrics = raw.filter((item): item is DailyMetricKey => typeof item === 'string' && allowed.has(item as DailyMetricKey));
  return metrics.length > 0 ? [...new Set(metrics)] : DEFAULT_DAILY_METRICS;
};

const sanitizeClinicalMetrics = (raw: unknown): ClinicalMetricKey[] => {
  if (!Array.isArray(raw)) return DEFAULT_CLINICAL_METRICS;
  const allowed = new Set(DEFAULT_CLINICAL_METRICS);
  const metrics = raw.filter((item): item is ClinicalMetricKey => typeof item === 'string' && allowed.has(item as ClinicalMetricKey));
  return metrics.length > 0 ? [...new Set(metrics)] : DEFAULT_CLINICAL_METRICS;
};

const toBoundedInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
};

const buildGoals = (goalsCount: number, consistentAlways: boolean) => {
  const completed = consistentAlways ? goalsCount : rnd(0, goalsCount);
  const all = Array.from({ length: goalsCount }, (_, i) => ({
    tarea: `Objetivo ${i + 1}`,
    categoria: pickOne(CATEGORIES),
  }));
  return {
    completed,
    objetivos_completados: all.slice(0, completed),
    objetivos_pendientes: all.slice(completed),
  };
};

const generateDailyLog = (
  dateKey: string,
  selectedMetrics: Set<DailyMetricKey>,
  goalsCount: number,
  consistentAlways: boolean,
  evolvingMetrics: boolean,
  recent: number
) => {
  const date = parseDateKeyLocal(dateKey);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const base = consistentAlways ? (isWeekend ? 9 : 8) : (isWeekend ? 7 : 6);
  const volatility = consistentAlways ? 1 : 2;
  const metricValue = (n: number) => clamp(n + rnd(-volatility, volatility), 1, 10);
  const goals = buildGoals(goalsCount, consistentAlways);
  const drift = evolvingMetrics ? Math.round((recent - 0.5) * 2) : 0;

  const log: Record<string, unknown> = {
    fecha: dateKey,
    timestamp: date.getTime(),
    reflexion: chance(0.45) ? pickOne(REFLECTIONS) : '',
    progreso_porcentaje: Math.round((goals.completed / goalsCount) * 100),
    objetivos_completados: goals.objetivos_completados,
    objetivos_pendientes: goals.objetivos_pendientes,
  };

  const values: Record<DailyMetricKey, number> = {
    estado_animo: metricValue(base),
    nivel_energia: metricValue(base - 1),
    nivel_deporte: consistentAlways ? metricValue(9) : (chance(0.45) ? metricValue(6) : 1),
    calidad_sueno: metricValue(consistentAlways ? 9 : 7),
    social_confort: metricValue(consistentAlways ? 8 : 6),
    nivel_motivacion: metricValue(consistentAlways ? 9 : 5),
    nivel_concentracion: metricValue(consistentAlways ? 9 : 6),
    regulacion_emocional: metricValue(consistentAlways ? 9 : 6),
  };

  for (const metric of selectedMetrics) {
    log[metric] = clamp(values[metric] + drift, 1, 10);
  }

  return log;
};

const generateClinicalDoc = (metric: ClinicalMetricKey, dateKey: string, recent: number, back: number, dow: number) => {
  const improvingHigh = (start: number, end: number) => Math.round(start + (end - start) * recent + rnd(-2, 2));
  const base = { dateKey, updatedAt: Date.now() };
  switch (metric) {
    case 'anxiety':
      return { ...base, generalAnxiety: clamp(improvingHigh(75, 35), 10, 95), panicEpisodes: chance(0.12 - recent * 0.08) ? rnd(1, 2) : 0 };
    case 'depression':
      return { ...base, moodIntensity: clamp(improvingHigh(3, 8), 1, 10), energyLevel: clamp(improvingHigh(3, 8), 1, 10) };
    case 'bipolar': {
      const cycle = Math.sin((back / 45) * Math.PI * 2);
      return { ...base, globalMood: clamp(Math.round(cycle * 2 + rnd(-1, 1)), -5, 5), energyLevel: clamp(5 + Math.round(cycle * 2), 1, 10) };
    }
    case 'schizophrenia':
      return { ...base, stressLevel: clamp(Math.round((dow === 1 ? 4 : 3) - recent + rnd(-1, 1)), 1, 5), medicationAdherence: chance(0.92) };
    case 'ocd':
      return { ...base, obsessionIntensity: clamp(improvingHigh(70, 30), 5, 95), ritualTimeMinutes: clamp(improvingHigh(80, 15), 0, 180) };
    case 'trauma':
      return { ...base, hypervigilanceLevel: clamp(improvingHigh(8, 4), 1, 10), flashbacks: chance(0.25 - recent * 0.16) ? rnd(1, 2) : 0 };
    case 'sleep':
      return { ...base, sleepQuality: clamp(Math.round(2 + recent * 2 + rnd(-1, 1)), 1, 5), hoursSlept: clamp(6 + recent * 2 + rnd(-1, 1), 3, 10) };
    case 'personality':
      return { ...base, emotionalStability: clamp(improvingHigh(4, 8), 1, 10), interpersonalConflict: chance(0.28 - recent * 0.15) };
    case 'adhd':
      return { ...base, focusLevel: clamp(improvingHigh(4, 8), 1, 10), taskCompletion: clamp(improvingHigh(4, 8), 1, 10) };
    case 'substance':
      return { ...base, cravingIntensity: clamp(improvingHigh(8, 3), 1, 10), usedSubstance: chance(0.18 - recent * 0.14) };
  }
};

const mapFirestoreError = (error: unknown): HttpsError => {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: string }).code)
    : '';
  const message = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message?: string }).message)
    : 'Error desconocido de Firestore.';

  if (code.includes('resource-exhausted') || message.toLowerCase().includes('quota')) {
    return new HttpsError('resource-exhausted', 'Firebase/Firestore quota excedida. No se pudieron generar datos completos.');
  }
  if (code.includes('permission-denied')) {
    return new HttpsError('permission-denied', 'Permisos insuficientes para generar datos demo.');
  }
  return new HttpsError('internal', message);
};

interface RecoverPasswordInput {
  recoveryEmail?: string;
  continueUrl?: string;
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const buildResetEmailHtml = (accountEmail: string, resetLink: string) => `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:auto;">
    <h2 style="margin:0 0 8px;">Recuperar contraseña</h2>
    <p style="margin:0 0 16px;">Recibimos una solicitud para restablecer la contraseña de la cuenta <b>${accountEmail}</b>.</p>
    <p style="margin:0 0 20px;">
      <a href="${resetLink}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">Restablecer contraseña</a>
    </p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Si no solicitaste este cambio, podés ignorar este email.</p>
  </div>
`;

export const requestPasswordRecovery = onCall(
  {
    region: 'us-central1',
    secrets: [mailHost, mailPort, mailSecure, mailUser, mailPass, mailFrom],
  },
  async (request: CallableRequest<RecoverPasswordInput>) => {
    const { recoveryEmail, continueUrl } = (request.data ?? {}) as RecoverPasswordInput;

    if (!recoveryEmail || !EMAIL_REGEX.test(recoveryEmail)) {
      throw new HttpsError('invalid-argument', 'El email de recuperación no es válido.');
    }

    const normalizedRecoveryEmail = normalizeEmail(recoveryEmail);
    const usersSnap = await getFirestore()
      .collection('users')
      .where('recoveryEmail', '==', normalizedRecoveryEmail)
      .limit(1)
      .get();

    let accountEmail: string | null = null;

    if (!usersSnap.empty) {
      const uid = usersSnap.docs[0].id;
      try {
        const userByUid = await getAuth().getUser(uid);
        accountEmail = userByUid.email ?? null;
      } catch {
        accountEmail = null;
      }
    }

    if (!accountEmail) {
      try {
        const userByEmail = await getAuth().getUserByEmail(normalizedRecoveryEmail);
        accountEmail = userByEmail.email ?? null;
      } catch {
        accountEmail = null;
      }
    }

    if (!accountEmail) {
      throw new HttpsError('not-found', 'No existe una cuenta con ese email.');
    }

    const resetLink = await getAuth().generatePasswordResetLink(accountEmail, continueUrl ? { url: continueUrl } : undefined);

    const transporter = nodemailer.createTransport({
      host: mailHost.value(),
      port: Number(mailPort.value()),
      secure: String(mailSecure.value()).toLowerCase() === 'true',
      auth: {
        user: mailUser.value(),
        pass: mailPass.value(),
      },
    });

    await transporter.sendMail({
      from: mailFrom.value(),
      to: normalizedRecoveryEmail,
      subject: 'Recuperación de contraseña - Surreal Horizons',
      html: buildResetEmailHtml(accountEmail, resetLink),
    });

    return {
      ok: true,
      message: 'Te enviamos un email para restablecer tu contraseña.',
    };
  }
);

export const seedDemoData = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '512MiB',
    invoker: 'public',
  },
  async (request: CallableRequest<SeedDemoDataInput>) => {
    const input = (request.data ?? {}) as SeedDemoDataInput;
    const targetUid = input.targetUid;

    if (!targetUid || !TARGETED_DEMO_UIDS.includes(targetUid as typeof TARGETED_DEMO_UIDS[number])) {
      throw new HttpsError('invalid-argument', 'Demo inválido. Sólo se pueden generar demos 4, 5 y 6.');
    }

    if (request.auth?.uid !== targetUid) {
      throw new HttpsError('permission-denied', 'Sólo el demo activo puede generar sus propios datos.');
    }

    const months = toBoundedInt(input.months, 6, 1, 24);
    const goalsCount = toBoundedInt(input.dailyGoalsCount, 3, 1, 10);
    const selectedDailyMetrics = new Set(sanitizeDailyMetrics(input.includeDailyMetrics));
    const selectedClinicalMetrics = sanitizeClinicalMetrics(input.includeClinicalMetrics);
    const consistentAlways = input.consistency === 'always';
    const evolvingMetrics = Boolean(input.evolvingMetrics);
    const { startDate, endDate, startKey, endKey } = getLastMonthsDateRange(months);
    const dateKeys = listDateKeysInRange(startDate, endDate);
    const db = getFirestore();
    const meta = DEMO_META[targetUid];

    let batch = db.batch();
    let opCount = 0;
    let dailyLogsWritten = 0;
    let clinicalLogsWritten = 0;

    const commitAndResetBatch = async () => {
      if (opCount === 0) return;
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    };

    const setInBatch = async (ref: DocumentReference, data: Record<string, unknown>) => {
      batch.set(ref, data);
      opCount++;
      if (opCount >= 450) await commitAndResetBatch();
    };

    const deleteInBatch = async (ref: DocumentReference) => {
      batch.delete(ref);
      opCount++;
      if (opCount >= 450) await commitAndResetBatch();
    };

    try {
      for (const col of TARGETED_DEMO_COLLECTIONS) {
        const snap = await db.collection('users').doc(targetUid).collection(col).get();
        for (const row of snap.docs) {
          await deleteInBatch(row.ref);
        }
      }

      await setInBatch(db.collection('users').doc(targetUid), {
        uid: targetUid,
        displayName: meta.displayName,
        email: meta.email,
        createdAt: new Date(Date.now() - dateKeys.length * 86400000).toISOString(),
        photoURL: null,
        isDemo: true,
        clinicalMetrics: selectedClinicalMetrics,
      });

      await setInBatch(db.collection('users').doc(targetUid).collection('settings').doc('clinicalMetrics'), {
        clinicalMetrics: selectedClinicalMetrics,
        updatedAt: Date.now(),
      });

      await setInBatch(db.collection('users').doc(targetUid).collection('Set_goals').doc('current'), {
        updatedAt: Date.now(),
        goals: Array.from({ length: goalsCount }, (_, i) => ({
          id: i + 1,
          text: `Objetivo ${i + 1}`,
          category: 'General',
          completed: false,
          resourceKey: 'general',
        })),
      });

      for (let idx = 0; idx < dateKeys.length; idx++) {
        const dateKey = dateKeys[idx];
        const date = parseDateKeyLocal(dateKey);
        const back = dateKeys.length - idx - 1;
        const recent = dateKeys.length > 1 ? idx / (dateKeys.length - 1) : 1;
        const dailyLog = generateDailyLog(
          dateKey,
          selectedDailyMetrics,
          goalsCount,
          consistentAlways,
          evolvingMetrics,
          recent
        );

        await setInBatch(db.collection('users').doc(targetUid).collection('daily_logs').doc(dateKey), dailyLog);
        dailyLogsWritten++;

        for (const metric of selectedClinicalMetrics) {
          const collectionName = CLINICAL_COLLECTION_BY_KEY[metric];
          await setInBatch(
            db.collection('users').doc(targetUid).collection(collectionName).doc(dateKey),
            generateClinicalDoc(metric, dateKey, recent, back, date.getDay())
          );
          clinicalLogsWritten++;
        }
      }

      await commitAndResetBatch();

      const dailyVerification = await db
        .collection('users')
        .doc(targetUid)
        .collection('daily_logs')
        .where('fecha', '>=', startKey)
        .where('fecha', '<=', endKey)
        .count()
        .get();

      const clinicalVerification: Record<ClinicalMetricKey, number> = {} as Record<ClinicalMetricKey, number>;
      for (const metric of selectedClinicalMetrics) {
        const countSnap = await db
          .collection('users')
          .doc(targetUid)
          .collection(CLINICAL_COLLECTION_BY_KEY[metric])
          .where('dateKey', '>=', startKey)
          .where('dateKey', '<=', endKey)
          .count()
          .get();
        clinicalVerification[metric] = countSnap.data().count;
      }

      const expectedClinicalLogs = dateKeys.length * selectedClinicalMetrics.length;
      const verifiedDailyLogs = dailyVerification.data().count;
      const verifiedClinicalLogs = Object.values(clinicalVerification).reduce((sum, count) => sum + count, 0);

      return {
        ok: verifiedDailyLogs === dateKeys.length && verifiedClinicalLogs === expectedClinicalLogs,
        targetUid,
        startKey,
        endKey,
        expectedDays: dateKeys.length,
        dailyLogsWritten,
        clinicalLogsWritten,
        verifiedDailyLogs,
        verifiedClinicalLogs,
        expectedClinicalLogs,
        clinicalVerification,
      };
    } catch (error: unknown) {
      throw mapFirestoreError(error);
    }
  }
);
