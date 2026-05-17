import { Dentist } from './dentist.models';

/** Tratamiento ofrecido en citas; `specialty` debe coincidir con `Dentist.especialidad`. */
export interface AppointmentTreatmentOption {
  value: string;
  label: string;
  specialty: string;
}

export const APPOINTMENT_TREATMENTS: readonly AppointmentTreatmentOption[] = [
  { value: 'Limpieza dental', label: 'Limpieza dental', specialty: 'Limpieza dental' },
  { value: 'Odontología general', label: 'Odontología general', specialty: 'Odontología General' },
  { value: 'Endodoncia', label: 'Endodoncia', specialty: 'Endodoncia' },
  { value: 'Ortodoncia', label: 'Ortodoncia', specialty: 'Ortodoncia' },
  { value: 'Periodoncia', label: 'Periodoncia', specialty: 'Periodoncia' },
  { value: 'Odontopediatría', label: 'Odontopediatría', specialty: 'Odontopediatría' },
  {
    value: 'Cirugía oral',
    label: 'Cirugía oral',
    specialty: 'Cirugía Oral y Maxilofacial'
  },
  { value: 'Prostodoncia', label: 'Prostodoncia / prótesis', specialty: 'Prostodoncia' },
  { value: 'Estética dental', label: 'Estética dental', specialty: 'Estética Dental' },
  { value: 'Implantología', label: 'Implantología', specialty: 'Implantología' }
] as const;

function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLocaleLowerCase('es');
}

export function getTreatmentOption(value: string | null | undefined): AppointmentTreatmentOption | null {
  if (!value?.trim()) return null;
  const n = norm(value);
  return APPOINTMENT_TREATMENTS.find((t) => norm(t.value) === n) ?? null;
}

export function getRequiredSpecialtyForTreatment(value: string | null | undefined): string | null {
  return getTreatmentOption(value)?.specialty ?? null;
}

export function dentistMatchesTreatment(dentist: Dentist, treatmentValue: string | null | undefined): boolean {
  const required = getRequiredSpecialtyForTreatment(treatmentValue);
  if (!required) return false;
  return norm(dentist.especialidad) === norm(required);
}

export function filterDentistsByTreatment(
  dentists: Dentist[],
  treatmentValue: string | null | undefined
): Dentist[] {
  const required = getRequiredSpecialtyForTreatment(treatmentValue);
  if (!required) return [];
  return dentists.filter((d) => dentistMatchesTreatment(d, treatmentValue));
}
