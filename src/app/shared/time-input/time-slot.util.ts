export function normalizeTimeHHmm(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? '').trim());
  if (!match) return '';
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const min = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function splitDatetimeLocalValue(value: string): { date: string; time: string } {
  const raw = String(value ?? '').trim();
  if (!raw) return { date: '', time: '' };
  const [date, timePart] = raw.split('T');
  return { date: date ?? '', time: normalizeTimeHHmm(timePart ?? '') };
}

export function splitTimeHHmm(value: string): { hours: string; minutes: string } {
  const normalized = normalizeTimeHHmm(value);
  if (!normalized) return { hours: '', minutes: '' };
  const [hours, minutes] = normalized.split(':');
  return { hours, minutes };
}

/** Solo dígitos, máximo dos caracteres (horas o minutos). Si hay más, conserva los dos últimos. */
export function formatTimePartTyping(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length <= 2 ? digits : digits.slice(-2);
}

export function clampHourPart(raw: string): string {
  const digits = formatTimePartTyping(raw);
  if (!digits) return '00';
  const h = Math.min(23, Math.max(0, Number(digits)));
  return String(h).padStart(2, '0');
}

export function clampMinutePart(raw: string): string {
  const digits = formatTimePartTyping(raw);
  if (!digits) return '00';
  const min = Math.min(59, Math.max(0, Number(digits)));
  return String(min).padStart(2, '0');
}

/**
 * Primer valor tras enfocar: sustituye en lugar de concatenar (p. ej. "00" + "2" → "2").
 */
export function firstInputDigits(previous: string, raw: string): string {
  const prev = formatTimePartTyping(previous);
  const next = formatTimePartTyping(raw);
  if (!prev) return next.slice(0, 2);
  if (next.length <= prev.length || !next.startsWith(prev)) {
    return next.slice(0, 2);
  }
  return next.slice(prev.length).slice(0, 2);
}

/** Combina horas y minutos si hay al menos un dígito de hora y dos de minuto. */
export function mergeTimeParts(hours: string, minutes: string): string {
  const h = formatTimePartTyping(hours);
  const m = formatTimePartTyping(minutes);
  if (!h || m.length < 2) return '';
  return normalizeTimeHHmm(`${h}:${m}`);
}

/** Formatea entrada parcial a HH:mm mientras se escribe (solo dígitos). */
export function formatInlineTimeTyping(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function parseInlineTimeValue(raw: string): string {
  const typed = formatInlineTimeTyping(raw);
  if (typed.length < 5) return '';
  return normalizeTimeHHmm(typed);
}

export function mergeDatetimeLocal(date: string, time: string): string {
  const d = String(date ?? '').trim();
  const t = normalizeTimeHHmm(time);
  if (!d || !t) return '';
  return `${d}T${t}`;
}
