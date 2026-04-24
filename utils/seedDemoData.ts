import { writeBatch, doc, getDoc } from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { DailyLog } from '../types';
import {
  DEFAULT_CLINICAL_METRICS,
  persistUserClinicalMetrics,
  type ClinicalMetricKey,
} from './clinicalMetricsConfig';
export { clearTargetedDemoUserData } from './clearDemoData';

// UIDs deben coincidir con los definidos en App.tsx
const DEMO_1_UID = 'JDzx9vojl2dlKs5sg0gInEhRiHF3';
const DEMO_2_UID = 'K9xL2vPq5mZ8jR3wT7nB4cE1aD6s';
const DEMO_3_UID = 'PerfectStreak2025';
const DEMO_4_UID = 'InconsistentStreak2025';
// Demo 5: UID termina en 10 dígitos distintos de cero → activa los 10
// módulos clínicos (parseEnabledModules lo lee como '1111111111').
const DEMO_5_UID = 'DemoMetricas1111111111';
// Demo 6: también termina en 10 dígitos distintos de cero para activar
// los 10 módulos clínicos y mantener paridad con Demo 5.
const DEMO_6_UID = 'DemoMetricas2222222222';
const TARGETED_DEMO_UIDS = [DEMO_4_UID, DEMO_5_UID, DEMO_6_UID] as const;
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

type DailyMetricKey = keyof Pick<DailyLog,
  'estado_animo' | 'nivel_energia' | 'nivel_deporte' | 'calidad_sueno' |
  'social_confort' | 'nivel_motivacion' | 'nivel_concentracion' | 'regulacion_emocional'
>;

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

export interface DemoSeedConfig {
  months?: number;
  consistency?: 'inconsistent' | 'always';
  includeDailyMetrics?: DailyMetricKey[];
  evolvingMetrics?: boolean;
  dailyGoalsCount?: number;
  includeClinicalMetrics?: ClinicalMetricKey[];
}

const removeUndefinedFields = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => removeUndefinedFields(item)) as T;
  }
  if (value && typeof value === 'object') {
    const cleaned = Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, val]) => {
      if (val === undefined) return acc;
      acc[key] = removeUndefinedFields(val);
      return acc;
    }, {});
    return cleaned as T;
  }
  return value;
};

const DEMO_1_META = {
  uid: DEMO_1_UID,
  displayName: 'Usuario Demo 1',
  email: 'demo@surreal.horizons',
  photoURL: null,
  initial: 'D1'
};

const DEMO_2_META = {
  uid: DEMO_2_UID,
  displayName: 'Usuario Demo 2',
  email: 'demo2@surreal.horizons',
  photoURL: null,
  initial: 'D2'
};

const CATEGORIES = ["Salud", "Trabajo", "Intelectual", "Espiritual", "Social", "General"];

const REFLECTIONS_DEMO_2 = [
  "Me sentí un poco cansado hoy, pero logré terminar las tareas principales.",
  "Buen entrenamiento, la energía subió después del mediodía.",
  "Necesito organizar mejor mi sueño, me estoy acostando muy tarde.",
  "Día productivo en el trabajo, aunque descuidé un poco la dieta.",
  "Salí a caminar para despejar la mente, funcionó muy bien.",
  "Un poco de ansiedad por la mañana, pero la meditación ayudó.",
  "Cena con la familia, gran momento para desconectar.",
  "Me costó concentrarme hoy, demasiadas distracciones.",
  "Logré leer 20 páginas de mi libro, objetivo cumplido.",
  "Me siento motivado para empezar la semana con fuerza.",
  "Hoy fue un día difícil, pero mañana será mejor.",
  "Demasiado tiempo en redes sociales, debo controlarlo.",
  "Hice yoga por primera vez, me sentí genial.",
  "Olvidé tomar agua suficiente, me duele un poco la cabeza.",
  "Charla inspiradora con un amigo, me dio nuevas ideas."
];

const REFLECTIONS_DEMO_1 = [
  "Día de alto rendimiento. Foco total y energía al 100%.",
  "Rutina de mañana impecable. Me siento imparable.",
  "Excelente sesión de gimnasio, superé mi marca personal.",
  "Dormí 8 horas profundas, la recuperación fue clave.",
  "Claridad mental absoluta durante la sesión de trabajo profundo.",
  "Agradecido por el progreso de esta semana.",
  "Equilibrio perfecto entre trabajo y descanso hoy.",
  "La visualización matutina me ayudó a mantenerme enfocado.",
  "Terminé el proyecto importante antes de la fecha límite.",
  "Sesión de lectura muy productiva, aprendí conceptos clave.",
  "Me sentí en 'flow' durante horas. Gran satisfacción.",
  "Dieta limpia y entrenamiento intenso. El cuerpo responde bien.",
  "Networking efectivo hoy, nuevas oportunidades a la vista.",
  "Revisión semanal completada, todo en orden para la próxima semana.",
  "Meditación profunda, gran sensación de paz interior."
];

const generateRandomLog = (dateStr: string, isHighPerformer: boolean): DailyLog => {
  const isWeekend = new Date(dateStr).getDay() % 6 === 0;

  // Escala 1-10. High performer: 8-9 ±1. Promedio: 5-7 ±2.
  const baseMood = isHighPerformer ? (isWeekend ? 9 : 8) : (isWeekend ? 7 : 6);
  const volatility = isHighPerformer ? 1 : 2;

  const getMetric = (base: number) => Math.min(10, Math.max(1, base + Math.floor(Math.random() * (volatility * 2 + 1)) - volatility));

  const mood = getMetric(baseMood);
  const energy = getMetric(mood - 1);
  const sleep = getMetric(isHighPerformer ? 9 : 7);

  // El "0" original significaba "no hizo deporte"; ahora usamos 1 (mínimo).
  const sport = isHighPerformer
    ? (Math.random() > 0.2 ? getMetric(9) : 1)
    : (Math.random() > 0.6 ? getMetric(6) : 1);

  const reflectionList = isHighPerformer ? REFLECTIONS_DEMO_1 : REFLECTIONS_DEMO_2;
  const reflection = Math.random() > 0.3 ? reflectionList[Math.floor(Math.random() * reflectionList.length)] : "";

  const completedCount = isHighPerformer
    ? Math.floor(Math.random() * 2) + 8
    : Math.floor(Math.random() * 5) + 2;

  const totalGoals = 10;

  const generateGoals = (count: number, prefix: string) => {
    return Array(count).fill(null).map((_, i) => ({
        tarea: `${prefix} ${i + 1}`,
        categoria: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    }));
  };

  return {
    fecha: dateStr,
    timestamp: new Date(dateStr).getTime(),
    estado_animo: mood,
    nivel_energia: energy,
    nivel_deporte: sport,
    calidad_sueno: sleep,
    social_confort: getMetric(isHighPerformer ? 8 : 6),
    nivel_motivacion: getMetric(isHighPerformer ? 9 : 5),
    nivel_concentracion: getMetric(isHighPerformer ? 9 : 6),
    regulacion_emocional: getMetric(isHighPerformer ? 9 : 6),
    reflexion: reflection,
    progreso_porcentaje: Math.round((completedCount / totalGoals) * 100),
    objetivos_completados: generateGoals(completedCount, "Tarea Completada"),
    objetivos_pendientes: generateGoals(totalGoals - completedCount, "Tarea Pendiente"),
  };
};

export const seedDemoUsers = async (
  targetUid?: string,
  config: DemoSeedConfig = {}
): Promise<{success: boolean, error?: string}> => {
  if (!db || !auth) {
    return { success: false, error: "Database not initialized" };
  }

  // Ensure we are at least logged in anonymously to pass basic rules
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn("Could not sign in anonymously:", e);
    }
  }

  // Nuevo flujo focalizado por demo (botón "Generar demo" sobre el usuario actual).
  if (targetUid && [DEMO_4_UID, DEMO_5_UID, DEMO_6_UID].includes(targetUid)) {
    try {
      const goalsData = {
        updatedAt: Date.now(),
        goals: [
          { id: 1, text: "Chequeo diario de bienestar", category: "Salud", completed: false, resourceKey: 'general' },
          { id: 2, text: "Cumplir prioridad del día", category: "Trabajo", completed: false, resourceKey: 'focus' },
          { id: 3, text: "Espacio de autocuidado", category: "Espiritual", completed: false, resourceKey: 'mindfulness' }
        ]
      };

      const userMeta: Record<string, { displayName: string; email: string }> = {
        [DEMO_4_UID]: { displayName: 'Demo Clínico 0110000000', email: 'demo4@surreal.horizons' }, // Depresión + Bipolar
        [DEMO_5_UID]: { displayName: 'Demo Clínico 0001000001', email: 'demo5@surreal.horizons' }, // Psicótico + Consumo
        [DEMO_6_UID]: { displayName: 'Demo Clínico 1111111111', email: 'demo6@surreal.horizons' }, // Todos
      };

      const currentMeta = userMeta[targetUid];
      if (!currentMeta) return { success: false, error: 'invalid-demo-target' };

      let batch = writeBatch(db);
      let opCount = 0;
      const commitAndResetBatch = async () => {
        if (opCount > 0) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      };
      const addToBatch = async (ref: DocumentReference, data: object) => {
        batch.set(ref, removeUndefinedFields(data));
        opCount++;
        if (opCount >= 450) await commitAndResetBatch();
      };

      const cfgMonths = Math.max(1, Math.min(24, Math.round(config.months ?? (targetUid === DEMO_4_UID ? 3 : 12))));
      const goalsCount = Math.max(1, Math.min(10, Math.round(config.dailyGoalsCount ?? 3)));
      const selectedDailyMetrics = new Set<DailyMetricKey>((config.includeDailyMetrics?.length ? config.includeDailyMetrics : DEFAULT_DAILY_METRICS));
      const selectedClinicalMetrics = new Set<ClinicalMetricKey>((config.includeClinicalMetrics?.length ? config.includeClinicalMetrics : DEFAULT_CLINICAL_METRICS));
      const consistentAlways = (config.consistency ?? (targetUid === DEMO_5_UID ? 'inconsistent' : 'always')) === 'always';
      const evolvingMetrics = Boolean(config.evolvingMetrics);

      const buildGoals = () => {
        const completed = rnd(0, goalsCount);
        const all = Array.from({ length: goalsCount }, (_, i) => ({
          tarea: `Objetivo ${i + 1}`,
          categoria: CATEGORIES[i % CATEGORIES.length],
        }));
        return {
          completed,
          objetivos_completados: all.slice(0, completed),
          objetivos_pendientes: all.slice(completed),
        };
      };

      const maybeReflection = () => chance(0.45)
        ? pickOne(REFLECTIONS_DEMO_2)
        : '';

      const days = cfgMonths * 30;
      const omitProbability = consistentAlways ? 0 : 0.35;
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      await addToBatch(doc(db, 'users', targetUid), {
        uid: targetUid,
        displayName: currentMeta.displayName,
        email: currentMeta.email,
        createdAt: new Date(Date.now() - days * 86400000).toISOString(),
        photoURL: null,
        isDemo: true,
        clinicalMetrics: Array.from(selectedClinicalMetrics),
      });
      await addToBatch(doc(db, 'users', targetUid, 'settings', 'clinicalMetrics'), {
        clinicalMetrics: Array.from(selectedClinicalMetrics),
        updatedAt: Date.now(),
      });
      await addToBatch(doc(db, 'users', targetUid, 'Set_goals', 'current'), goalsData);

      for (let back = days - 1; back >= 0; back--) {
        const d = new Date(today);
        d.setDate(today.getDate() - back);
        const dateStr = d.toISOString().split('T')[0];
        const recent = 1 - (back / Math.max(days, 1));
        const dow = d.getDay();

        if (chance(omitProbability)) continue;

        const log = generateRandomLog(dateStr, targetUid !== DEMO_5_UID);
        const goalsProgress = buildGoals();
        log.reflexion = maybeReflection();
        log.objetivos_completados = goalsProgress.objetivos_completados;
        log.objetivos_pendientes = goalsProgress.objetivos_pendientes;
        log.progreso_porcentaje = Math.round((goalsProgress.completed / goalsCount) * 100);

        for (const metric of DEFAULT_DAILY_METRICS) {
          if (!selectedDailyMetrics.has(metric)) {
            delete log[metric];
          }
        }
        if (evolvingMetrics) {
          const drift = Math.round((recent - 0.5) * 2);
          for (const metric of DEFAULT_DAILY_METRICS) {
            const current = log[metric];
            if (typeof current !== 'number') continue;
            log[metric] = clamp(current + drift, 1, 10);
          }
        }

        await addToBatch(doc(db, 'users', targetUid, 'daily_logs', dateStr), log);

        if ((targetUid === DEMO_4_UID || targetUid === DEMO_6_UID) && selectedClinicalMetrics.has('depression')) {
          await addToBatch(doc(db, 'users', targetUid, 'deepClinicalLogsDepression', dateStr), genDepressionDay(dateStr, recent, dow));
        }
        if ((targetUid === DEMO_4_UID || targetUid === DEMO_6_UID) && selectedClinicalMetrics.has('bipolar')) {
          await addToBatch(doc(db, 'users', targetUid, 'deepClinicalLogsBipolar', dateStr), genBipolarDay(dateStr, back));
        }

        if ((targetUid === DEMO_5_UID || targetUid === DEMO_6_UID) && selectedClinicalMetrics.has('schizophrenia')) {
          await addToBatch(doc(db, 'users', targetUid, 'deepClinicalLogsSchizophrenia', dateStr), genSchizoDay(dateStr, recent));
        }
        if ((targetUid === DEMO_5_UID || targetUid === DEMO_6_UID) && selectedClinicalMetrics.has('substance')) {
          await addToBatch(doc(db, 'users', targetUid, 'deepClinicalLogsSubstance', dateStr), genSubstanceDay(dateStr, recent));
        }

        if (targetUid === DEMO_6_UID && selectedClinicalMetrics.has('anxiety')) {
          await addToBatch(doc(db, 'users', targetUid, 'deepClinicalLogsAnxiety', dateStr), genAnxietyDay(dateStr, recent, dow));
        }
        if (targetUid === DEMO_6_UID && selectedClinicalMetrics.has('ocd')) {
          await addToBatch(doc(db, 'users', targetUid, 'deepClinicalLogsOCD', dateStr), genOCDDay(dateStr, recent));
        }
        if (targetUid === DEMO_6_UID && selectedClinicalMetrics.has('trauma')) {
          await addToBatch(doc(db, 'users', targetUid, 'deepClinicalLogsTrauma', dateStr), genTraumaDay(dateStr, recent));
        }
        if (targetUid === DEMO_6_UID && selectedClinicalMetrics.has('sleep')) {
          await addToBatch(doc(db, 'users', targetUid, 'deepClinicalLogsSleep', dateStr), genSleepDay(dateStr, dow));
        }
        if (targetUid === DEMO_6_UID && selectedClinicalMetrics.has('personality')) {
          await addToBatch(doc(db, 'users', targetUid, 'deepClinicalLogsPersonality', dateStr), genPersonalityDay(dateStr, recent));
        }
        if (targetUid === DEMO_6_UID && selectedClinicalMetrics.has('adhd')) {
          await addToBatch(doc(db, 'users', targetUid, 'deepClinicalLogsADHD', dateStr), genADHDDay(dateStr, recent, dow));
        }
      }

      await commitAndResetBatch();
      await persistUserClinicalMetrics(targetUid, Array.from(selectedClinicalMetrics));
      return { success: true };
    } catch (error: unknown) {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';
      if (code === 'permission-denied') return { success: false, error: 'permission-denied' };
      const message = typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: string }).message)
        : 'unknown';
      return { success: false, error: message };
    }
  }
  
  try {
    const today = new Date();
    console.log("Iniciando generación de datos para Demos 1, 2, 3 y 4...");

    // Helper para manejar batches de Firestore (max 500 ops)
    let batch = writeBatch(db);
    let opCount = 0;

    const commitAndResetBatch = async () => {
        if (opCount > 0) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
        }
    };

    const addToBatch = async (ref: DocumentReference, data: object) => {
        batch.set(ref, removeUndefinedFields(data));
        opCount++;
        if (opCount >= 450) { // Margen de seguridad antes de 500
            await commitAndResetBatch();
        }
    };

    // 0. CREAR DOCUMENTOS RAÍZ DE LOS USUARIOS (Para que aparezcan en la colección 'users')
    // Demo 3
    await addToBatch(doc(db, 'users', DEMO_3_UID), {
      uid: DEMO_3_UID,
      displayName: 'Usuario Demo 3',
      email: 'demo3@surreal.horizons',
      createdAt: new Date('2024-12-31').toISOString(),
      photoURL: null,
      isDemo: true
    });
    // Demo 4
    await addToBatch(doc(db, 'users', DEMO_4_UID), {
      uid: DEMO_4_UID,
      displayName: 'Usuario Demo 4',
      email: 'demo4@surreal.horizons',
      createdAt: new Date('2024-12-31').toISOString(),
      photoURL: null,
      isDemo: true
    });

    // 1. Generar registros para Demo 1 y Demo 2 (Últimos 60 días)
    const DAYS_TO_GENERATE_SHORT = 60;
    
    for (let i = 0; i < DAYS_TO_GENERATE_SHORT; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Demo 1
      const log1 = generateRandomLog(dateStr, true);
      const ref1 = doc(db, 'users', DEMO_1_UID, 'daily_logs', dateStr);
      await addToBatch(ref1, log1);

      // Demo 2
      const log2 = generateRandomLog(dateStr, false);
      const ref2 = doc(db, 'users', DEMO_2_UID, 'daily_logs', dateStr);
      await addToBatch(ref2, log2);
    }

    // 2. Generar AÑO COMPLETO 2025 para Demo 3 y Demo 4
    const start2025 = new Date('2025-01-01');
    const end2025 = new Date('2025-12-31');
    
    // Clonar fecha para iterar sin modificar la original incorrectamente
    const iterDate = new Date(start2025);

    while (iterDate <= end2025) {
        const dateStr = iterDate.toISOString().split('T')[0];

        // DEMO 3: Racha Perfecta (100% de los días, métricas altas: 9-10)
        const log3 = generateRandomLog(dateStr, true);
        log3.estado_animo = Math.min(10, Math.max(9, log3.estado_animo || 9));
        log3.progreso_porcentaje = 100; // Siempre completa objetivos
        const ref3 = doc(db, 'users', DEMO_3_UID, 'daily_logs', dateStr);
        await addToBatch(ref3, log3);

        // DEMO 4: Inconsistente (Solo algunos días, métricas promedio)
        // 60% de probabilidad de tener registro
        if (Math.random() > 0.4) {
            const log4 = generateRandomLog(dateStr, false); // Usuario promedio
            const ref4 = doc(db, 'users', DEMO_4_UID, 'daily_logs', dateStr);
            await addToBatch(ref4, log4);
        }

        // Avanzar al siguiente día
        iterDate.setDate(iterDate.getDate() + 1);
    }

    // 3. Configurar objetivos por defecto para todos
    const goalsData = {
      updatedAt: Date.now(),
      goals: [
        { id: 1, text: "Leer 20 min", category: "Intelectual", completed: false, resourceKey: 'reading' },
        { id: 2, text: "Entrenamiento físico", category: "Salud", completed: false, resourceKey: 'exercise' },
        { id: 3, text: "Meditación", category: "Espiritual", completed: false, resourceKey: 'meditation' }
      ]
    };

    await addToBatch(doc(db, 'users', DEMO_1_UID, 'Set_goals', 'current'), goalsData);
    await addToBatch(doc(db, 'users', DEMO_2_UID, 'Set_goals', 'current'), goalsData);
    await addToBatch(doc(db, 'users', DEMO_3_UID, 'Set_goals', 'current'), goalsData);
    await addToBatch(doc(db, 'users', DEMO_4_UID, 'Set_goals', 'current'), goalsData);

    // 4. Establecer Conexiones (Demo 1 <-> Demo 2)
    await addToBatch(doc(db, 'users', DEMO_1_UID, 'outgoing_connections', DEMO_2_META.email), {
      email: DEMO_2_META.email,
      addedAt: Date.now()
    });
    await addToBatch(doc(db, 'users', DEMO_2_UID, 'incoming_connections', DEMO_1_UID), {
      ownerUid: DEMO_1_UID,
      displayName: DEMO_1_META.displayName,
      email: DEMO_1_META.email,
      initial: DEMO_1_META.initial
    });

    await addToBatch(doc(db, 'users', DEMO_2_UID, 'outgoing_connections', DEMO_1_META.email), {
      email: DEMO_1_META.email,
      addedAt: Date.now()
    });
    await addToBatch(doc(db, 'users', DEMO_1_UID, 'incoming_connections', DEMO_2_UID), {
      ownerUid: DEMO_2_UID,
      displayName: DEMO_2_META.displayName,
      email: DEMO_2_META.email,
      initial: DEMO_2_META.initial
    });

    // 5. DEMO 3 — Métricas clínicas completas (últimos 365 días, los 10 módulos).
    // Esto permite comparar en Dashboard los indicadores base vs clínicos.
    const today3 = new Date();
    today3.setHours(12, 0, 0, 0);
    for (let back = 364; back >= 0; back--) {
      const d = new Date(today3);
      d.setDate(today3.getDate() - back);
      const dateStr = d.toISOString().split('T')[0];
      const recent = 1 - (back / 365); // 0 = hace un año, 1 = hoy
      const dow = d.getDay();

      await addToBatch(
        doc(db, 'users', DEMO_3_UID, 'deepClinicalLogsAnxiety', dateStr),
        genAnxietyDay(dateStr, recent, dow)
      );
      await addToBatch(
        doc(db, 'users', DEMO_3_UID, 'deepClinicalLogsDepression', dateStr),
        genDepressionDay(dateStr, recent, dow)
      );
      await addToBatch(
        doc(db, 'users', DEMO_3_UID, 'deepClinicalLogsBipolar', dateStr),
        genBipolarDay(dateStr, back)
      );
      await addToBatch(
        doc(db, 'users', DEMO_3_UID, 'deepClinicalLogsSchizophrenia', dateStr),
        genSchizoDay(dateStr, recent)
      );
      await addToBatch(
        doc(db, 'users', DEMO_3_UID, 'deepClinicalLogsOCD', dateStr),
        genOCDDay(dateStr, recent)
      );
      await addToBatch(
        doc(db, 'users', DEMO_3_UID, 'deepClinicalLogsTrauma', dateStr),
        genTraumaDay(dateStr, recent)
      );
      await addToBatch(
        doc(db, 'users', DEMO_3_UID, 'deepClinicalLogsSleep', dateStr),
        genSleepDay(dateStr, dow)
      );
      await addToBatch(
        doc(db, 'users', DEMO_3_UID, 'deepClinicalLogsPersonality', dateStr),
        genPersonalityDay(dateStr, recent)
      );
      await addToBatch(
        doc(db, 'users', DEMO_3_UID, 'deepClinicalLogsADHD', dateStr),
        genADHDDay(dateStr, recent, dow)
      );
      await addToBatch(
        doc(db, 'users', DEMO_3_UID, 'deepClinicalLogsSubstance', dateStr),
        genSubstanceDay(dateStr, recent)
      );
    }

    // 6. DEMO 5 + DEMO 6 — 365 días completos (dashboard base + 10 módulos clínicos).
    const seedFullClinicalDemo = async (uid: string, displayName: string, email: string): Promise<void> => {
      const rootSnap = await getDoc(doc(db, 'users', uid));
      if (!rootSnap.exists()) {
        await addToBatch(doc(db, 'users', uid), {
          uid,
          displayName,
          email,
          createdAt: new Date(Date.now() - 366 * 86400000).toISOString(),
          photoURL: null,
          isDemo: true
        });
        await addToBatch(doc(db, 'users', uid, 'Set_goals', 'current'), goalsData);
      }

      const todayX = new Date();
      todayX.setHours(12, 0, 0, 0);
      const todayKey = todayX.toISOString().split('T')[0];
      const [dailyToday, clinicalToday] = await Promise.all([
        getDoc(doc(db, 'users', uid, 'daily_logs', todayKey)),
        getDoc(doc(db, 'users', uid, 'deepClinicalLogsAnxiety', todayKey)),
      ]);

      // Si ya existe muestra dashboard+clínica para hoy, asumimos seed completo.
      if (dailyToday.exists() && clinicalToday.exists()) {
        console.log(`${displayName} ya existe con dashboard + clínico, se saltea regeneración masiva.`);
        return;
      }

      for (let back = 364; back >= 0; back--) {
        const d = new Date(todayX);
        d.setDate(todayX.getDate() - back);
        const dateStr = d.toISOString().split('T')[0];
        const recent = 1 - (back / 365); // 0 = hace un año, 1 = hoy
        const dow = d.getDay(); // 0=Dom

        // Dashboard base completo (métricas + objetivos) para poder comparar
        // contra clínicas en el dashboard principal.
        const log5 = generateRandomLog(dateStr, true);
        log5.estado_animo = Math.min(10, Math.max(9, log5.estado_animo || 9));
        log5.nivel_energia = Math.min(10, Math.max(8, log5.nivel_energia || 8));
        log5.nivel_deporte = Math.min(10, Math.max(8, log5.nivel_deporte || 8));
        log5.calidad_sueno = Math.min(10, Math.max(8, log5.calidad_sueno || 8));
        log5.social_confort = Math.min(10, Math.max(8, log5.social_confort || 8));
        log5.nivel_motivacion = Math.min(10, Math.max(8, log5.nivel_motivacion || 8));
        log5.nivel_concentracion = Math.min(10, Math.max(8, log5.nivel_concentracion || 8));
        log5.regulacion_emocional = Math.min(10, Math.max(8, log5.regulacion_emocional || 8));
        log5.progreso_porcentaje = 100;
        log5.objetivos_pendientes = [];
        await addToBatch(doc(db, 'users', uid, 'daily_logs', dateStr), log5);

      // --- Anxiety: arco de mejora (70% → 35%)
        await addToBatch(
          doc(db, 'users', uid, 'deepClinicalLogsAnxiety', dateStr),
          genAnxietyDay(dateStr, recent, dow)
        );
      // --- Depression: arco de mejora (ánimo bajo → estable)
        await addToBatch(
          doc(db, 'users', uid, 'deepClinicalLogsDepression', dateStr),
          genDepressionDay(dateStr, recent, dow)
        );
      // --- Bipolar: ciclos con estabilización progresiva
        await addToBatch(
          doc(db, 'users', uid, 'deepClinicalLogsBipolar', dateStr),
          genBipolarDay(dateStr, back)
        );
      // --- Schizophrenia: estable con adherencia alta
        await addToBatch(
          doc(db, 'users', uid, 'deepClinicalLogsSchizophrenia', dateStr),
          genSchizoDay(dateStr, recent)
        );
      // --- OCD: mejora de resistencias vs rituales
        await addToBatch(
          doc(db, 'users', uid, 'deepClinicalLogsOCD', dateStr),
          genOCDDay(dateStr, recent)
        );
      // --- Trauma: recuperación gradual
        await addToBatch(
          doc(db, 'users', uid, 'deepClinicalLogsTrauma', dateStr),
          genTraumaDay(dateStr, recent)
        );
      // --- Sleep: consistente con algo de ruido
        await addToBatch(
          doc(db, 'users', uid, 'deepClinicalLogsSleep', dateStr),
          genSleepDay(dateStr, dow)
        );
      // --- Personality: progreso DBT
        await addToBatch(
          doc(db, 'users', uid, 'deepClinicalLogsPersonality', dateStr),
          genPersonalityDay(dateStr, recent)
        );
      // --- ADHD: estable
        await addToBatch(
          doc(db, 'users', uid, 'deepClinicalLogsADHD', dateStr),
          genADHDDay(dateStr, recent, dow)
        );
      // --- Substance: arco de sobriedad
        await addToBatch(
          doc(db, 'users', uid, 'deepClinicalLogsSubstance', dateStr),
          genSubstanceDay(dateStr, recent)
        );
      }
    };

    await seedFullClinicalDemo(DEMO_5_UID, 'Demo Métricas 1111111111', 'demo5@surreal.horizons');
    await seedFullClinicalDemo(DEMO_6_UID, 'Demo Métricas 2222222222', 'demo6@surreal.horizons');

    // Final Commit
    await commitAndResetBatch();
    console.log("Datos generados exitosamente para Demo 1, 2, 3, 4, 5 y 6.");
    return { success: true };

  } catch (error: unknown) {
    console.error("Error al generar datos demo:", error);
    // Return specific error code for UI handling
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code)
      : '';
    if (code === 'permission-denied') {
        return { success: false, error: 'permission-denied' };
    }
    const message = typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: string }).message)
      : 'unknown';
    return { success: false, error: message };
  }
};

// -------------------------------------------------------------------------
// Generadores por módulo clínico para Demo 5. Cada uno devuelve un doc para
// un día específico. `recent` ∈ [0, 1] (0 = hace ~1 año, 1 = hoy) permite
// simular arcos de mejora. `dow` = day of week para patrones semanales.
// -------------------------------------------------------------------------

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (p: number) => Math.random() < p;
const pickOne = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function genAnxietyDay(dateKey: string, recent: number, dow: number) {
  // 70% hace un año, ~35% ahora + ruido. Sube los lunes/domingos.
  const weekend = dow === 0 || dow === 6 ? -4 : dow === 1 ? 5 : 0;
  const base = Math.round(70 - recent * 35 + weekend + rnd(-10, 10));
  const symptoms = ['palpitations', 'muscleTension', 'sweating', 'shortness', 'chestPressure', 'dizziness'];
  const selected: string[] = [];
  const n = chance(0.6 - recent * 0.4) ? rnd(1, 3) : 0;
  for (let i = 0; i < n; i++) {
    const s = pickOne(symptoms);
    if (!selected.includes(s)) selected.push(s);
  }
  const notesPool = [
    "Tuve que dar una presentación, mucha tensión en el pecho.",
    "Una discusión familiar me dejó ansiosa toda la tarde.",
    "Logré mantenerme tranquilo en el subte.",
    "Desde la mañana me costó respirar.",
    "Día calmado, técnicas de respiración ayudaron.",
    "",
  ];
  return {
    dateKey,
    generalAnxiety: clamp(base, 10, 95),
    panicEpisodes: chance(0.12 - recent * 0.1) ? rnd(1, 3) : 0,
    physicalSymptoms: selected,
    anticipatoryAnxiety: clamp(Math.round(4 - recent * 2 + rnd(-1, 1)), 1, 5),
    avoidanceBehavior: chance(0.35 - recent * 0.25),
    notes: chance(0.2) ? pickOne(notesPool) : "",
    updatedAt: Date.now(),
  };
}

function genDepressionDay(dateKey: string, recent: number, dow: number) {
  const weekendBoost = dow === 0 || dow === 6 ? 1 : 0;
  const mood = clamp(Math.round(3 + recent * 4 + weekendBoost + rnd(-2, 2)), 1, 10);
  const energy = clamp(mood + rnd(-2, 1), 1, 10);
  const anhedoniaPool = recent < 0.3 ? [5, 5, 3] : recent < 0.7 ? [3, 3, 5, 1] : [1, 1, 3];
  const appetitePool: Array<'increased' | 'normal' | 'decreased'> =
    recent < 0.4 ? ['decreased', 'decreased', 'normal'] : ['normal', 'normal', 'increased', 'decreased'];
  const notesPool = [
    "Me costó levantarme de la cama.",
    "Salí a caminar y me sentí un poco mejor.",
    "Nada me causa interés ahora.",
    "Un mensaje de un amigo me alegró.",
    "Lloré sin razón específica.",
    "",
  ];
  return {
    dateKey,
    moodIntensity: mood,
    energyLevel: energy,
    anhedonia: pickOne(anhedoniaPool),
    socialInteraction: chance(0.3 + recent * 0.4),
    appetiteChange: pickOne(appetitePool),
    notes: chance(0.25) ? pickOne(notesPool) : "",
    updatedAt: Date.now(),
  };
}

function genBipolarDay(dateKey: string, back: number) {
  // Ciclo suave tipo sinusoide con período ~45 días; estabiliza con el tiempo.
  const cycle = Math.sin((back / 45) * Math.PI * 2);
  const amplitude = 1 + (back / 365) * 2; // amplitud decrece hacia hoy
  const mood = clamp(Math.round(cycle * amplitude + rnd(-1, 1)), -5, 5);
  const sleep = mood > 2 ? rnd(4, 6) : mood < -2 ? rnd(9, 11) : rnd(6, 9);
  const irritabilityPool = mood > 2 ? [3, 5] : mood < -2 ? [0, 1] : [0, 0, 1, 3];
  return {
    dateKey,
    globalMood: mood,
    energyLevel: clamp(5 + mood + rnd(-1, 1), 1, 10),
    sleepHours: sleep,
    irritability: pickOne(irritabilityPool),
    racingThoughts: mood > 2,
    medicationAdherence: chance(0.92),
    notes: chance(0.15)
      ? pickOne([
          "Dormí poco y tengo ideas a mil.",
          "Día raro, siento todo apagado.",
          "Estable, controlado.",
          "Compré algo impulsivamente, me preocupa.",
          "",
        ])
      : "",
    updatedAt: Date.now(),
  };
}

function genSchizoDay(dateKey: string, recent: number) {
  return {
    dateKey,
    medicationTaken: chance(0.93),
    sideEffects: clamp(Math.round(2 - recent + rnd(-1, 1)), 0, 5),
    auditoryHallucinations: chance(0.2 - recent * 0.15) ? rnd(1, 3) : 0,
    ideasOfReference: chance(0.25 - recent * 0.15) ? rnd(1, 3) : 0,
    thoughtControl: chance(0.15) ? rnd(1, 2) : 0,
    anhedonia: clamp(Math.round(3 - recent * 2 + rnd(-1, 1)), 0, 5),
    avolition: clamp(Math.round(3 - recent * 2 + rnd(-1, 1)), 0, 5),
    concentration: clamp(Math.round(2 + recent * 2 + rnd(-1, 1)), 1, 5),
    stressLevel: clamp(Math.round(3 - recent * 1 + rnd(-1, 1)), 0, 5),
    notes: chance(0.1)
      ? pickOne([
          "Escuché susurros en la noche.",
          "Día tranquilo, sin voces.",
          "Sentí que me miraban en el colectivo.",
          "Medicación me dejó somnoliento.",
          "",
        ])
      : "",
    updatedAt: Date.now(),
  };
}

function genOCDDay(dateKey: string, recent: number) {
  const obsession = clamp(Math.round(70 - recent * 40 + rnd(-10, 10)), 10, 95);
  const rituals = clamp(Math.round(7 - recent * 5 + rnd(-2, 2)), 0, 10);
  const resistances = clamp(Math.round(2 + recent * 6 + rnd(-1, 2)), 0, 10);
  return {
    dateKey,
    obsessionIntensity: obsession,
    compulsionFrequency: rituals,
    resistanceCount: resistances,
    ruminationTime: clamp(Math.round(4 - recent * 2 + rnd(-1, 1)), 1, 5),
    sudsLevel: clamp(Math.round((obsession / 10) + rnd(-1, 1)), 0, 10),
    thoughtBelief: clamp(Math.round(60 - recent * 35 + rnd(-15, 15)), 0, 100),
    triggerContext: chance(0.25)
      ? pickOne([
          "Toqué una perilla y pensé que me iba a contaminar.",
          "Duda sobre si cerré la puerta.",
          "Imagen intrusiva en medio del trabajo.",
          "",
        ])
      : "",
    updatedAt: Date.now(),
  };
}

function genTraumaDay(dateKey: string, recent: number) {
  return {
    dateKey,
    intrusionFrequency: chance(0.45 - recent * 0.3) ? rnd(1, 3) : 0,
    hypervigilanceLevel: clamp(Math.round(7 - recent * 3 + rnd(-2, 2)), 0, 10),
    avoidanceBehavior: chance(0.4 - recent * 0.3),
    dissociationLevel: pickOne(recent < 0.4 ? [2, 5, 0] : [0, 0, 2]),
    physicalTension: clamp(Math.round(4 - recent * 2 + rnd(-1, 1)), 0, 5),
    groundingSuccess: chance(0.6 + recent * 0.3),
    notes: chance(0.15)
      ? pickOne([
          "Un ruido fuerte me activó el corazón a mil.",
          "Pude usar 5-4-3-2-1 y funcionó.",
          "Tuve una pesadilla sobre eso.",
          "",
        ])
      : "",
    updatedAt: Date.now(),
  };
}

function genSleepDay(dateKey: string, dow: number) {
  const isWeekend = dow === 0 || dow === 6;
  const bedH = isWeekend ? rnd(23, 25) % 24 : rnd(22, 24) % 24;
  const wakeH = isWeekend ? rnd(8, 10) : rnd(6, 8);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    dateKey,
    bedTime: `${pad(bedH)}:${pad(pickOne([0, 15, 30, 45]))}`,
    wakeTime: `${pad(wakeH)}:${pad(pickOne([0, 15, 30, 45]))}`,
    sleepLatency: rnd(10, 45),
    awakeningsCount: chance(0.4) ? rnd(1, 3) : 0,
    sleepQuality: rnd(2, 5),
    daytimeSleepiness: rnd(1, 4),
    usedMedication: chance(0.2),
    caffeineIntake: isWeekend ? rnd(0, 2) : rnd(1, 4),
    updatedAt: Date.now(),
  };
}

function genPersonalityDay(dateKey: string, recent: number) {
  return {
    dateKey,
    impulsivityLevel: clamp(Math.round(4 - recent * 2 + rnd(-1, 1)), 0, 5),
    emotionalStability: clamp(Math.round(3 + recent * 4 + rnd(-2, 1)), 0, 10),
    relationshipConflict: chance(0.35 - recent * 0.2),
    fearOfAbandonment: clamp(Math.round(3 - recent * 2 + rnd(-1, 1)), 0, 5),
    selfImageStability: clamp(Math.round(3 + recent * 4 + rnd(-2, 1)), 0, 10),
    usedCrisisSkills: chance(0.5 + recent * 0.4),
    notes: chance(0.15)
      ? pickOne([
          "Discutí con mi pareja pero logré frenarme.",
          "Hoy me odié, no pude salir de ese loop.",
          "Usé TIPP y me funcionó.",
          "",
        ])
      : "",
    updatedAt: Date.now(),
  };
}

function genADHDDay(dateKey: string, recent: number, dow: number) {
  const isWeekend = dow === 0 || dow === 6;
  return {
    dateKey,
    focusLevel: clamp(Math.round(4 + recent * 3 + rnd(-2, 2)), 1, 10),
    hyperactivity: clamp(Math.round(3 - recent * 1 + rnd(-1, 1)), 0, 5),
    impulsivity: clamp(Math.round(3 - recent * 1 + rnd(-1, 1)), 0, 5),
    completedTasks: isWeekend ? rnd(0, 3) : clamp(Math.round(2 + recent * 5 + rnd(-2, 2)), 0, 10),
    timeManagement: clamp(Math.round(2 + recent * 2 + rnd(-1, 1)), 1, 5),
    medicationTaken: chance(0.88),
    notes: chance(0.1)
      ? pickOne([
          "Pomodoro me salvó el día.",
          "No pude arrancar con nada hasta las 5 PM.",
          "Hiper-foco 3 horas, olvidé comer.",
          "",
        ])
      : "",
    updatedAt: Date.now(),
  };
}

function genSubstanceDay(dateKey: string, recent: number) {
  return {
    dateKey,
    cravingIntensity: clamp(Math.round(7 - recent * 5 + rnd(-2, 2)), 0, 10),
    consumptionCount: chance(0.08 - recent * 0.06) ? rnd(1, 2) : 0,
    relapseRisk: clamp(Math.round(4 - recent * 2 + rnd(-1, 1)), 1, 5),
    usedCopingSkills: chance(0.5 + recent * 0.4),
    socialSupportContact: chance(0.35 + recent * 0.3),
    mainTrigger: chance(0.3)
      ? pickOne(["Fin de semana sin planes", "Aburrimiento", "Pelea con mi pareja", "Reunión laboral", "Ansiedad de la mañana"])
      : "",
    notes: "",
    updatedAt: Date.now(),
  };
}
