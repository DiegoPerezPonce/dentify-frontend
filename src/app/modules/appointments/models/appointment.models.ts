import { AppointmentKind } from './clinical-catalog.models';

/**
 * Appointment entity
 */
export interface Appointment {
  id: number;
  patientId: number;
  patientName?: string;
  dentistId: number;
  dentistName?: string;
  boxId?: number;
  boxName?: string;
  startDateTime: string; // ISO 8601
  endDateTime: string; // ISO 8601
  duration: number; // minutes
  appointmentKind?: AppointmentKind | string;
  catalogTreatmentId?: number;
  specialtyName?: string;
  treatment?: string;
  notes?: string;
  status: AppointmentStatus;
  isInfectiousPatient?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

/**
 * DTO para crear una nueva cita
 */
export interface AppointmentCreateDTO {
  patientId: number;
  dentistId: number;
  boxId?: number;
  startDateTime: string;
  duration: number;
  appointmentKind?: AppointmentKind | string;
  catalogTreatmentId?: number;
  treatment?: string;
  notes?: string;
  isInfectiousPatient?: boolean;
  /** Si se omite, el API usa estado inicial programada. */
  status?: AppointmentStatus;
}

/**
 * DTO para actualizar una cita existente
 */
export interface AppointmentUpdateDTO {
  patientId?: number;
  dentistId?: number;
  boxId?: number;
  startDateTime?: string;
  duration?: number;
  appointmentKind?: AppointmentKind | string;
  catalogTreatmentId?: number;
  treatment?: string;
  notes?: string;
  status?: AppointmentStatus;
  isInfectiousPatient?: boolean;
}

/**
 * Query params para listar citas
 */
export interface AppointmentListQuery {
  page?: number;
  pageSize?: number;
  startDate?: string; // Filter by date range
  endDate?: string;
  dentistId?: number;
  boxId?: number;
  patientId?: number;
  status?: AppointmentStatus;
}

/**
 * Resultado de la lista de citas
 */
export interface AppointmentListResult {
  items: Appointment[];
  total: number;
}
