import {
  medicalFlagLabels,
  medicalRiskIconName,
  patientMedicalSeverity,
  type MedicalAlertSeverity
} from '../patients/medical-flags.constants';

export { medicalRiskIconName };
import { Appointment } from './models/appointment.models';

export function appointmentPatientMedicalSeverity(
  apt: Pick<Appointment, 'patientMedicalFlags' | 'isInfectiousPatient'>
): MedicalAlertSeverity | null {
  const fromFlags = patientMedicalSeverity(apt.patientMedicalFlags);
  if (fromFlags) return fromFlags;
  if (apt.isInfectiousPatient) return 'biosecurity';
  return null;
}

/** @deprecated Usar `medicalRiskIconName` (ligature Material). */
export function medicalRiskIconChar(sev: MedicalAlertSeverity): string {
  return medicalRiskIconName(sev);
}

export function appointmentMedicalTitle(
  apt: Pick<Appointment, 'patientMedicalFlags' | 'isInfectiousPatient'>
): string {
  const flags = apt.patientMedicalFlags;
  if (flags?.length) {
    return medicalFlagLabels(flags).join(', ');
  }
  if (apt.isInfectiousPatient) {
    return 'Paciente infeccioso — última cita del día';
  }
  return '';
}
