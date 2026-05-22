export type DentistWorkShift = 'morning' | 'afternoon' | 'full_day' | 'off';

export interface ClinicScheduleSettings {
  openTime: string;
  closeTime: string;
  morningEndTime: string;
  afternoonStartTime: string;
  overlapNote?: string;
}

export type ClinicScheduleSavePayload = Pick<
  ClinicScheduleSettings,
  'openTime' | 'closeTime' | 'morningEndTime' | 'afternoonStartTime'
>;

export interface WeeklyScheduleDay {
  weekday: number;
  shift: DentistWorkShift;
  startTime?: string | null;
  endTime?: string | null;
  shiftLabel?: string | null;
}

export interface DentistWeeklySchedule {
  dentistId: number;
  dentistName?: string;
  clinic: ClinicScheduleSettings;
  days: WeeklyScheduleDay[];
}

export interface WeeklyScheduleSavePayload {
  days: Array<{
    weekday: number;
    shift: DentistWorkShift;
  }>;
}

export const WEEKDAYS_MON_SAT: Array<{ weekday: number; label: string }> = [
  { weekday: 1, label: 'Lunes' },
  { weekday: 2, label: 'Martes' },
  { weekday: 3, label: 'Miércoles' },
  { weekday: 4, label: 'Jueves' },
  { weekday: 5, label: 'Viernes' },
  { weekday: 6, label: 'Sábado' }
];

export const SHIFT_OPTIONS: Array<{
  value: DentistWorkShift;
  label: string;
  description: string;
}> = [
  { value: 'morning', label: 'Mañana', description: '08:00 – 15:00' },
  { value: 'afternoon', label: 'Tarde', description: '14:00 – 21:00' },
  { value: 'full_day', label: 'Todo el día', description: '08:00 – 21:00' },
  { value: 'off', label: 'Libre', description: 'Sin consulta' }
];

export function defaultWeekDraft(): WeeklyScheduleDay[] {
  return WEEKDAYS_MON_SAT.map((d) => ({
    weekday: d.weekday,
    shift: 'off' as DentistWorkShift
  }));
}
