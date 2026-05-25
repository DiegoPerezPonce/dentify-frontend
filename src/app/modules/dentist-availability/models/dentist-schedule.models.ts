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

export const SHIFT_ICONS: Record<DentistWorkShift, string> = {
  morning: 'wb_twilight',
  afternoon: 'wb_sunny',
  full_day: 'schedule',
  off: 'event_busy'
};

export const SHIFT_LABELS: Record<DentistWorkShift, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  full_day: 'Todo el día',
  off: 'Libre'
};

export function shiftLabelFor(shift: DentistWorkShift): string {
  return SHIFT_LABELS[shift] ?? '—';
}

/** Franjas de turno según el horario actual de la clínica (para desplegables y resúmenes). */
export function buildShiftOptions(clinic: ClinicScheduleSavePayload): Array<{
  value: DentistWorkShift;
  label: string;
  description: string;
}> {
  return [
    {
      value: 'morning',
      label: SHIFT_LABELS.morning,
      description: `${clinic.openTime} – ${clinic.morningEndTime}`
    },
    {
      value: 'afternoon',
      label: SHIFT_LABELS.afternoon,
      description: `${clinic.afternoonStartTime} – ${clinic.closeTime}`
    },
    {
      value: 'full_day',
      label: SHIFT_LABELS.full_day,
      description: `${clinic.openTime} – ${clinic.closeTime}`
    },
    { value: 'off', label: SHIFT_LABELS.off, description: 'Sin consulta' }
  ];
}

export function defaultWeekDraft(): WeeklyScheduleDay[] {
  return WEEKDAYS_MON_SAT.map((d) => ({
    weekday: d.weekday,
    shift: 'off' as DentistWorkShift
  }));
}
