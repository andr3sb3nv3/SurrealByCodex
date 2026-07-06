import React from 'react';
import { Language } from '../types';
import AnxietyTracker from '../components/patologiaModules/AnxietyTracker';
import DepressionTracker from '../components/patologiaModules/DepressionTracker';
import BipolarTracker from '../components/patologiaModules/BipolarTracker';
import SchizophreniaTracker from '../components/patologiaModules/SchizophreniaTracker';
import OCDTracker from '../components/patologiaModules/OCDTracker';
import TraumaTracker from '../components/patologiaModules/TraumaTracker';
import SleepTracker from '../components/patologiaModules/SleepTracker';
import PersonalityTracker from '../components/patologiaModules/PersonalityTracker';
import ADHDTracker from '../components/patologiaModules/ADHDTracker';
import SubstanceTracker from '../components/patologiaModules/SubstanceTracker';

export interface ModuleDef {
  index: number;
  id: string;
  name: string;
}

// Posición del dígito dentro del sufijo de 10 dígitos → patología asociada.
// Si el dígito en esa posición es > 0 el módulo se activa en el panel del
// paciente; el valor (1-9) se interpreta como severidad.
export const MODULE_MAPPING: ModuleDef[] = [
  { index: 0, id: 'anxiety_log',          name: 'Registro de Ansiedad' },
  { index: 1, id: 'depression_tracker',   name: 'Métricas de Depresión' },
  { index: 2, id: 'mood_tracker',         name: 'Estado de Ánimo' },
  { index: 3, id: 'schizophrenia_tracker',name: 'Espectro Psicótico' },
  { index: 4, id: 'ocd_tracker',          name: 'Control de TOC' },
  { index: 5, id: 'trauma_log',           name: 'Registro de Trauma' },
  { index: 6, id: 'sleep_journal',        name: 'Diario de Sueño' },
  { index: 7, id: 'personality_tracker',  name: 'Rasgos de Personalidad' },
  { index: 8, id: 'adhd_tracker',         name: 'Foco y TDAH' },
  { index: 9, id: 'substance_tracker',    name: 'Consumo y Craving' },
];

export interface EnabledModule extends ModuleDef {
  severity: number; // 1..9
}

type Candidate = string | null | undefined;

/**
 * Extrae el código de 10 dígitos que el Psiquiatra agrega al final del
 * username. Acepta cualquier separador previo (`user_1200000000`,
 * `1200000000`, `Ana.1200000000`, `user_1200000000@user.local`, etc.):
 * busca la última corrida de dígitos de al menos 10 caracteres.
 * Devuelve null si no encuentra.
 */
export function extractPatologiaCode(identifier: Candidate | Candidate[]): string | null {
  const candidates = Array.isArray(identifier) ? identifier : [identifier];
  for (const raw of candidates) {
    if (!raw) continue;
    // Busca TODAS las corridas de dígitos y se queda con la última de ≥10.
    const runs = raw.trim().match(/\d+/g);
    if (!runs) continue;
    for (let i = runs.length - 1; i >= 0; i--) {
      if (runs[i].length >= 10) return runs[i].slice(-10);
    }
  }
  return null;
}

export function parseEnabledModules(identifier: Candidate | Candidate[]): EnabledModule[] {
  const code = extractPatologiaCode(identifier);
  if (!code) {
    if (typeof console !== 'undefined') {
      const candidates = Array.isArray(identifier) ? identifier : [identifier];
      console.debug('[patologiaModules] no 10-digit code found in', candidates.filter(Boolean));
    }
    return [];
  }
  return MODULE_MAPPING
    .map(mod => ({ ...mod, severity: parseInt(code[mod.index], 10) }))
    .filter(m => Number.isFinite(m.severity) && m.severity > 0);
}

/**
 * Registro de componentes específicos por patología. Se completa a medida
 * que se implementan los trackers individuales. Si un módulo está activo
 * pero no tiene entry acá, el contenedor muestra un placeholder.
 */
export interface PatologiaModuleProps {
  userId: string;
  severity: number;
  dateKey: string;
  readOnly: boolean;
  language: Language;
}

export const MODULE_COMPONENTS: Record<string, React.FC<PatologiaModuleProps>> = {
  anxiety_log: AnxietyTracker,
  depression_tracker: DepressionTracker,
  mood_tracker: BipolarTracker,
  schizophrenia_tracker: SchizophreniaTracker,
  ocd_tracker: OCDTracker,
  trauma_log: TraumaTracker,
  sleep_journal: SleepTracker,
  personality_tracker: PersonalityTracker,
  adhd_tracker: ADHDTracker,
  substance_tracker: SubstanceTracker,
};
