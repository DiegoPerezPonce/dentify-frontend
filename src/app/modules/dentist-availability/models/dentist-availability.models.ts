export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface DentistAvailabilitySlot {
  id: string;
  dentistId: number;
  weekday: Weekday;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface DentistAvailabilityValidationResult {
  ok: boolean;
  message?: string;
}

export const WEEKDAYS: Array<{ value: Weekday; label: string }> = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' }
];
