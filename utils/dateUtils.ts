import { Language } from '../types';

const getLocale = (lang: Language): string => {
  switch (lang) {
    case 'es': return 'es-ES';
    case 'en': return 'en-US';
    case 'fr': return 'fr-FR';
    case 'de': return 'de-DE';
    case 'it': return 'it-IT';
    case 'ru': return 'ru-RU';
    case 'zh': return 'zh-CN';
    default: return 'en-US';
  }
};

export const formatDateFriendly = (dateString: string, lang: Language = 'es', includeYear: boolean = true): string => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  
  const locale = getLocale(lang);
  
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  if (includeYear) options.year = 'numeric';
  
  return date.toLocaleDateString(locale, options);
};

export const getMonthName = (dateString: string, lang: Language = 'es'): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const locale = getLocale(lang);

  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
};

export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Día "útil": antes de las 04:00 la jornada se considera la del día anterior.
// Ej.: 03:00 del 4-nov edita el registro del 3-nov.
export const DAY_CUTOFF_HOUR = 4;

export const getTodayKey = (): string => {
  const now = new Date();
  if (now.getHours() < DAY_CUTOFF_HOUR) {
    return formatDateKey(subDays(now, 1));
  }
  return formatDateKey(now);
};

export const subDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};
