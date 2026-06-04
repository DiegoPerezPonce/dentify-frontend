import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../shared/app-icon/app-icon.component';
import { PatientService } from '../patient.service';
import { ClinicalHistory, HISTORY_TYPE_COLORS, HISTORY_TYPE_LABELS } from '../models/clinical-history.models';
import { Patient } from '../models/patient.models';
import { getPacienteIdFromRoute } from '../patient-route-id.util';
import { Appointment, AppointmentStatus } from '../../appointments/models/appointment.models';
import {
  getAppointmentKindLabel,
  getAppointmentProcedureLabel
} from '../../appointments/models/clinical-catalog.models';
import { DEFAULT_APPOINTMENT_CLEANING_MINUTES } from '../../appointments/appointment-duration.constants';

const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: 'Programada',
  [AppointmentStatus.COMPLETED]: 'Completada',
  [AppointmentStatus.CANCELLED]: 'Cancelada',
  [AppointmentStatus.NO_SHOW]: 'No asistió'
};

@Component({
  selector: 'app-medical-history',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './medical-history.html',
  styleUrl: './medical-history.scss'
})
export class MedicalHistoryComponent implements OnInit {
  private patientService = inject(PatientService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly appointmentsLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly patient = signal<Patient | null>(null);
  readonly history = signal<ClinicalHistory[]>([]);
  readonly appointments = signal<Appointment[]>([]);
  readonly expandedAppointmentId = signal<number | null>(null);

  readonly typeColors = HISTORY_TYPE_COLORS;
  readonly typeLabels = HISTORY_TYPE_LABELS;

  ngOnInit(): void {
    const id = getPacienteIdFromRoute(this.route);
    if (id && id !== 'nuevo' && /^\d+$/.test(id)) {
      this.loadPatientAndHistory(Number(id));
    } else {
      this.error.set('ID de paciente no válido');
    }
  }

  loadPatientAndHistory(patientId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.patientService.getById(patientId).subscribe({
      next: (patient) => {
        this.patient.set(patient);
        this.loadHistory(patientId);
        this.loadAppointments(patientId);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo cargar los datos del paciente.');
        console.error('Error loading patient:', err);
      }
    });
  }

  loadHistory(patientId: number): void {
    this.patientService.getHistory(patientId).subscribe({
      next: (history) => {
        const sorted = history.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        this.history.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el historial clínico.');
        console.error('Error loading history:', err);
      }
    });
  }

  loadAppointments(patientId: number): void {
    this.appointmentsLoading.set(true);
    this.patientService.getAppointments(patientId).subscribe({
      next: (items) => {
        const sorted = [...items].sort(
          (a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime()
        );
        this.appointments.set(sorted);
        this.appointmentsLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading appointments:', err);
        this.appointments.set([]);
        this.appointmentsLoading.set(false);
      }
    });
  }

  toggleAppointment(id: number): void {
    this.expandedAppointmentId.update((current) => (current === id ? null : id));
  }

  isAppointmentExpanded(id: number): boolean {
    return this.expandedAppointmentId() === id;
  }

  appointmentKindLabel(appt: Appointment): string {
    return getAppointmentKindLabel(appt.appointmentKind);
  }

  appointmentProcedureLabel(appt: Appointment): string {
    const label = getAppointmentProcedureLabel(appt);
    return label === 'Sin procedimiento' ? '—' : label;
  }

  appointmentStatusLabel(status: AppointmentStatus): string {
    return APPOINTMENT_STATUS_LABELS[status] ?? status;
  }

  appointmentStatusClass(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.COMPLETED:
        return 'appt-status--completed';
      case AppointmentStatus.CANCELLED:
        return 'appt-status--cancelled';
      case AppointmentStatus.NO_SHOW:
        return 'appt-status--noshow';
      default:
        return 'appt-status--scheduled';
    }
  }

  treatmentDurationMinutes(appt: Appointment): number {
    return (
      appt.treatmentDurationMinutes ??
      Math.max(0, appt.duration - (appt.cleaningTimeMinutes ?? DEFAULT_APPOINTMENT_CLEANING_MINUTES))
    );
  }

  cleaningTimeMinutes(appt: Appointment): number {
    return appt.cleaningTimeMinutes ?? DEFAULT_APPOINTMENT_CLEANING_MINUTES;
  }

  formatDateTime(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  }

  getTypeColor(tipo: string): string {
    return this.typeColors[tipo.toLowerCase()] || this.typeColors['otro'];
  }

  getTypeLabel(tipo: string): string {
    return this.typeLabels[tipo.toLowerCase()] || tipo;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Hoy';
    if (diffInDays === 1) return 'Ayer';
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    if (diffInDays < 30) return `Hace ${Math.floor(diffInDays / 7)} semanas`;
    if (diffInDays < 365) return `Hace ${Math.floor(diffInDays / 30)} meses`;
    return `Hace ${Math.floor(diffInDays / 365)} años`;
  }

  goBack(): void {
    const id = this.patient()?.id;
    if (id) {
      this.router.navigate(['/app/pacientes', id]);
    } else {
      this.router.navigate(['/app/pacientes']);
    }
  }

  goToPatientEdit(): void {
    const id = this.patient()?.id;
    if (id) {
      this.router.navigate(['/app/pacientes', id, 'editar']);
    }
  }

  goToFirstVisit(): void {
    const id = this.patient()?.id;
    if (id) {
      this.router.navigate(['/app/pacientes', id, 'primera-visita']);
    }
  }

  goToOdontograma(): void {
    const id = this.patient()?.id;
    if (id) {
      this.router.navigate(['/app/pacientes', id, 'odontograma']);
    }
  }

  goToRadiografias(): void {
    const id = this.patient()?.id;
    if (id) {
      this.router.navigate(['/app/pacientes', id, 'radiografias']);
    }
  }
}
