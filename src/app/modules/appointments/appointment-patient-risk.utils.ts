import {
  medicalFlagLabels,
  patientMedicalSeverity,
  type MedicalAlertSeverity
} from '../patients/medical-flags.constants';
import { Appointment } from './models/appointment.models';

export function appointmentPatientMedicalSeverity(
  apt: Pick<Appointment, 'patientMedicalFlags' | 'isInfectiousPatient'>
): MedicalAlertSeverity | null {
  const fromFlags = patientMedicalSeverity(apt.patientMedicalFlags);
  if (fromFlags) return fromFlags;
  if (apt.isInfectiousPatient) return 'biosecurity';
  return null;
}

export function medicalRiskIconChar(sev: MedicalAlertSeverity): string {
  return sev === 'biosecurity' ? '☣' : '!';
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
