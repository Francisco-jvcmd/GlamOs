import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export const ECUADOR_TIMEZONE = 'America/Guayaquil';

/**
 * Obtiene la fecha YYYY-MM-DD en la zona horaria oficial de Ecuador (America/Guayaquil - UTC-5)
 */
export function getEcuadorDateString(date: Date | string = new Date()): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ECUADOR_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Comprueba si una fecha/timestamp corresponde al día de "hoy" en Ecuador
 */
export function isTodayEcuador(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  try {
    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) return false;
    const targetDay = getEcuadorDateString(targetDate);
    const todayDay = getEcuadorDateString(new Date());
    return targetDay === todayDay;
  } catch {
    return false;
  }
}

/**
 * Retorna la hora actual (0-23) en Ecuador para saludos y turnos
 */
export function getEcuadorHour(date: Date | string = new Date()): number {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const hourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: ECUADOR_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).format(d);
    return parseInt(hourStr, 10);
  } catch {
    return new Date().getHours();
  }
}

/**
 * Formatea fecha y hora en español y estrictamente en zona horaria de Ecuador (America/Guayaquil)
 */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('es-EC', {
      timeZone: ECUADOR_TIMEZONE,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Formatea fecha larga en español para cabeceras editoriales en Ecuador (ej. "lunes, 19 de octubre")
 */
export function formatEditorialDateEcuador(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('es-EC', {
      timeZone: ECUADOR_TIMEZONE,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  } catch {
    return date.toLocaleDateString('es-EC');
  }
}

export function maskPhone(phone: string) {
  if (!phone || phone.length < 3) return phone;
  return `***-***-*${phone.slice(-3)}`
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function ensureUuid(val?: string | null): string {
  if (!val) return generateUuid();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
    return val.toLowerCase();
  }
  let hex = '';
  for (let i = 0; i < val.length; i++) {
    const code = val.charCodeAt(i);
    hex += (code % 16).toString(16);
  }
  while (hex.length < 32) hex += '0';
  hex = hex.substring(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
