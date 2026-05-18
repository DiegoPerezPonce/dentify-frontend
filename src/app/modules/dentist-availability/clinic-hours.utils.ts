import { ClinicScheduleSettings } from './models/dentist-schedule.models';

export function timeToMinutes(hhmm: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function toFullCalendarTime(hhmm: string): string {
  return hhmm.length === 5 ? `${hhmm}:00` : hhmm;
}

/** Comprueba que inicio + duración caen dentro de apertura–cierre de clínica. */
export function isAppointmentWithinClinicHours(
  start: Date,
  durationMinutes: number,
  clinic: ClinicScheduleSettings
): boolean {
  if (Number.isNaN(start.getTime()) || durationMinutes < 1) return false;

  const open = timeToMinutes(clinic.openTime);
  const close = timeToMinutes(clinic.closeTime);
  const startM = start.getHours() * 60 + start.getMinutes();
  const endM = startM + durationMinutes;

  if (open < 0 || close < 0) return false;

  return startM >= open && endM <= close;
}

export function clinicHoursRangeLabel(clinic: ClinicScheduleSettings): string {
  return `${clinic.openTime} – ${clinic.closeTime}`;
}

export function clinicHoursErrorMessage(clinic: ClinicScheduleSettings): string {
  return `La cita debe estar dentro del horario de la clínica (${clinicHoursRangeLabel(clinic)}).`;
}

/** Mensaje detallado para alertas al usuario (incluye hora elegida). */
export function clinicHoursErrorMessageForSlot(
  start: Date,
  durationMinutes: number,
  clinic: ClinicScheduleSettings
): string {
  const startLabel = start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const endLabel = end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return (
    `No se puede agendar de ${startLabel} a ${endLabel}. ` +
    `El horario de la clínica es ${clinicHoursRangeLabel(clinic)}.`
  );
}

/** Hora de inicio para que la cita termine al cierre de la clínica ese día. */
export function lastAppointmentStartOnDay(
  day: Date,
  durationMinutes: number,
  clinic: ClinicScheduleSettings
): Date | null {
  if (Number.isNaN(day.getTime()) || durationMinutes < 1) return null;

  const open = timeToMinutes(clinic.openTime);
  const close = timeToMinutes(clinic.closeTime);
  if (open < 0 || close < 0) return null;

  const startMinutes = close - durationMinutes;
  if (startMinutes < open) return null;

  const result = new Date(day);
  result.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  return result;
}
