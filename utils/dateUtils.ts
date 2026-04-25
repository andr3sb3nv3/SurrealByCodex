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

export const isDateKey = (value: unknown): value is string => {
  return typeof value === 'string' && parseDateKeyLocal(value) !== null;
};

export const parseDateKeyLocal = (dateKey: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  return formatDateKey(date) === dateKey ? date : null;
};

const shiftMonths = (date: Date, months: number): Date => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const targetMonth = month + months;
  const lastDayOfTargetMonth = new Date(year, targetMonth + 1, 0).getDate();
  return new Date(year, targetMonth, Math.min(day, lastDayOfTargetMonth), 12, 0, 0, 0);
};

export const getSystemTodayKey = (referenceDate: Date = new Date()): string => {
  return formatDateKey(referenceDate);
};

export const getLastMonthsDateRange = (
  months: number,
  referenceDate: Date = new Date()
): { startDate: Date; endDate: Date; startKey: string; endKey: string } => {
  const safeMonths = Math.max(1, Math.round(months));
  const endDate = parseDateKeyLocal(getSystemTodayKey(referenceDate)) ?? new Date(referenceDate);
  const startDate = shiftMonths(endDate, -safeMonths);

  return {
    startDate,
    endDate,
    startKey: formatDateKey(startDate),
    endKey: formatDateKey(endDate),
  };
};

export const listDateKeysInRange = (startDate: Date, endDate: Date): string[] => {
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

export const isDateKeyInRange = (dateKey: string, startKey: string, endKey: string): boolean => {
  return Boolean(parseDateKeyLocal(dateKey)) && dateKey >= startKey && dateKey <= endKey;
};

export const isDateKeyWithinLastDays = (
  dateKey: string,
  days: number,
  referenceDate: Date = new Date()
): boolean => {
  const parsed = parseDateKeyLocal(dateKey);
  if (!parsed) return false;

  const safeDays = Math.max(1, Math.round(days));
  const endDate = parseDateKeyLocal(getSystemTodayKey(referenceDate)) ?? new Date(referenceDate);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - safeDays);
  startDate.setHours(12, 0, 0, 0);

  return parsed.getTime() >= startDate.getTime() && parsed.getTime() <= endDate.getTime();
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
