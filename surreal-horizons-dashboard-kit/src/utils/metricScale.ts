// Escala canónica de las métricas diarias (ánimo, energía, deporte, social,
// motivación, concentración, regulación, sueño).
export const METRIC_MIN = 1;
export const METRIC_MAX = 10;
export const METRIC_DEFAULT = 5;

const clamp = (val: number) => Math.min(METRIC_MAX, Math.max(METRIC_MIN, val));

// Acepta valores nuevos (1-10), valores viejos guardados en escala 0-100,
// undefined/null y strings numéricos. Devuelve siempre un número entre 1 y 10.
export const normalizeMetric = (val: unknown): number => {
  if (val === undefined || val === null || val === '') return METRIC_DEFAULT;
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return METRIC_DEFAULT;
  // Compatibilidad con datos viejos (0-100).
  if (num > METRIC_MAX) return clamp(Math.round(num / 10));
  if (num < METRIC_MIN) return METRIC_MIN;
  return clamp(Math.round(num));
};
