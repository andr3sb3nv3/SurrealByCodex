import { Goal, ResourceItem } from './types';

export const RESOURCES_DB: Record<string, ResourceItem[] | ResourceItem> = {
  reading: [
    { title: "El Almohadón de Plumas (H. Quiroga)", url: "https://ciudadseva.com/texto/el-almohadon-de-plumas/", time: "8 min" },
    { title: "Continuidad de los Parques (J. Cortázar)", url: "https://ciudadseva.com/texto/continuidad-de-los-parques/", time: "3 min" }
  ],
  exercise: [
    { title: "Rutina Cardio 30 min", url: "https://www.youtube.com/results?search_query=cardio+30+minutos+en+casa", type: "video" }
  ],
  meditation: [
    { title: "Meditación Guiada 10 min", url: "https://www.youtube.com/results?search_query=meditacion+guiada+10+minutos", type: "video" }
  ],
  water: { tip: "Consejo: Ten una botella de 1L en tu escritorio. Si la ves, beberás. Intenta terminarla antes de las 14:00." },
  sleep: { tip: "Método 10-3-2-1: 10h antes sin cafeína, 3h sin comida, 2h sin trabajo, 1h sin pantallas." },
  general: { tip: "Divide esta tarea en pasos de 2 minutos. ¿Cuál es la acción más pequeña que puedes tomar ahora mismo?" }
};

export const DEFAULT_GOALS: Goal[] = [
  { id: 1, text: "Leer 15 páginas", category: "Intelectual", completed: false, resourceKey: 'reading' },
  { id: 2, text: "Ejercicio físico (30 min)", category: "Salud", completed: false, resourceKey: 'exercise' },
  { id: 3, text: "Meditar 10 min", category: "Espiritual", completed: false, resourceKey: 'meditation' },
  { id: 4, text: "Beber 2 litros de agua", category: "Salud", completed: false, resourceKey: 'water' },
  { id: 5, text: "Planificar el día siguiente", category: "General", completed: false, resourceKey: 'general' },
  { id: 6, text: "Llamar a un familiar/amigo", category: "Social", completed: false, resourceKey: 'general' },
  { id: 7, text: "Trabajo profundo (2 horas)", category: "Trabajo", completed: false, resourceKey: 'general' },
  { id: 8, text: "Sin azúcar añadido hoy", category: "Salud", completed: false, resourceKey: 'general' },
  { id: 9, text: "Estiramientos (10 min)", category: "Salud", completed: false, resourceKey: 'exercise' },
  { id: 10, text: "Revisar gastos/finanzas", category: "General", completed: false, resourceKey: 'general' },
  { id: 11, text: "Limpiar/Ordenar espacio", category: "General", completed: false, resourceKey: 'general' },
  { id: 12, text: "Ir a la cama a la hora prevista", category: "Salud", completed: false, resourceKey: 'sleep' },
  { id: 13, text: "Despertar sin posponer alarma", category: "General", completed: false, resourceKey: 'sleep' },
  { id: 14, text: "Desconexión de pantallas", category: "Salud", completed: false, resourceKey: 'sleep' },
  { id: 15, text: "Comer una pieza de fruta/verdura", category: "Salud", completed: false, resourceKey: 'general' },
  { id: 16, text: "Agradecer 3 cosas del día", category: "Espiritual", completed: false, resourceKey: 'general' },
  { id: 17, text: "Aprender algo nuevo", category: "Intelectual", completed: false, resourceKey: 'general' }
];

export const REFLECTIONS_MOCK = [
  "Hoy me sentí con mucha energía y motivación.",
  "Dormí poco, me costó concentrarme.",
  "Necesito mejorar mi regulación emocional ante el estrés.",
  "Gran día de trabajo profundo, la memoria funcionó genial.",
  "Me costó levantarme, pero cumplí con mis hábitos.",
  "Día tranquilo, dediqué tiempo a socializar y me sentí bien.",
  "El ejercicio me cambió el ánimo radicalmente.",
  "Mucha ansiedad por la mañana, pero la controlé.",
  "Agradecido por mi familia y amigos.",
  "Logré terminar el proyecto pendiente, concentración al 100."
];
