import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  signal
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AppointmentService, toDatetimeLocalInput } from '../appointment.service';
import { DentistService } from '../dentist.service';
import { BoxService } from '../../boxes/box.service';
import { PatientService } from '../../patients/patient.service';
import {
  Appointment,
  AppointmentCreateDTO,
  AppointmentStatus,
  AppointmentUpdateDTO
} from '../models/appointment.models';
import { Dentist } from '../models/dentist.models';
import { Box } from '../../boxes/models/box.models';
import { PatientRow } from '../../patients/models/patient-list.models';
import { HttpErrorResponse } from '@angular/common/http';

export type AppointmentModalViewMode = 'create' | 'detail' | 'edit';

@Component({
  selector: 'app-appointment-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-form-modal.html',
  styleUrl: './appointment-form-modal.scss'
})
export class AppointmentFormModalComponent implements OnInit, OnChanges {
  /** Expuesto al template para comparar estado (p. ej. cita cancelada). */
  readonly AppointmentStatus = AppointmentStatus;

  private fb = inject(FormBuilder);
  private appointmentService = inject(AppointmentService);
  private dentistService = inject(DentistService);
  private boxService = inject(BoxService);
  private patientService = inject(PatientService);

  @Input() isOpen = false;
  @Input() appointment: Appointment | null = null;
  @Input() preselectedStart: string | null = null;
  @Input() preselectedEnd: string | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Appointment>();
  @Output() cancelAppointment = new EventEmitter<Appointment>();
  @Output() deleteAppointment = new EventEmitter<Appointment>();

  readonly form: FormGroup;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly loadingResources = signal(true);

  readonly dentists = signal<Dentist[]>([]);
  readonly boxes = signal<Box[]>([]);
  readonly patients = signal<PatientRow[]>([]);

  /** create = nueva cita; detail = solo lectura al pulsar en el calendario; edit = formulario de edición. */
  viewMode: AppointmentModalViewMode = 'create';

  readonly statusOptions = [
    { value: AppointmentStatus.SCHEDULED, label: 'Programada' },
    { value: AppointmentStatus.CONFIRMED, label: 'Confirmada' },
    { value: AppointmentStatus.COMPLETED, label: 'Completada' },
    { value: AppointmentStatus.CANCELLED, label: 'Cancelada' },
    { value: AppointmentStatus.NO_SHOW, label: 'No asistió' }
  ];

  constructor() {
    this.form = this.fb.group({
      patientId: [null, Validators.required],
      dentistId: [null, Validators.required],
      boxId: [null, Validators.required],
      startDateTime: ['', Validators.required],
      duration: [30, [Validators.required, Validators.min(15)]],
      treatment: [''],
      notes: [''],
      status: [AppointmentStatus.SCHEDULED],
      isInfectiousPatient: [false]
    });
  }

  ngOnInit(): void {
    this.loadResources();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['isOpen'] ||
      changes['appointment'] ||
      changes['preselectedStart'] ||
      changes['preselectedEnd']
    ) {
      this.syncModalFromInputs();
    }
  }

  /** El modal permanece montado: hay que reaccionar cada vez que se abre o cambia la cita seleccionada. */
  private syncModalFromInputs(): void {
    if (!this.isOpen) {
      this.viewMode = 'create';
      return;
    }

    this.error.set(null);

    if (this.appointment) {
      this.viewMode = 'detail';
      this.populateForm(this.appointment);
      return;
    }

    this.viewMode = 'create';
    this.resetFormForCreate();
    if (this.preselectedStart) {
      this.form.patchValue({
        startDateTime: toDatetimeLocalInput(this.preselectedStart)
      });
      if (this.preselectedEnd && this.preselectedStart) {
        const start = new Date(this.preselectedStart);
        const end = new Date(this.preselectedEnd);
        const durationMinutes = (end.getTime() - start.getTime()) / 60000;
        this.form.patchValue({ duration: Math.max(15, Math.round(durationMinutes)) });
      }
    }
  }

  private resetFormForCreate(): void {
    this.form.reset({
      patientId: null,
      dentistId: null,
      boxId: null,
      startDateTime: '',
      duration: 30,
      treatment: '',
      notes: '',
      status: AppointmentStatus.SCHEDULED,
      isInfectiousPatient: false
    });
  }

  switchToEdit(): void {
    if (!this.appointment) return;
    this.viewMode = 'edit';
    this.populateForm(this.appointment);
  }

  private loadResources(): void {
    this.loadingResources.set(true);

    Promise.all([
      this.dentistService.list().toPromise(),
      this.boxService.list().toPromise(),
      this.patientService.list({ page: 1, pageSize: 1000, search: '' }).toPromise()
    ])
      .then(([dentists, boxes, patients]) => {
        this.dentists.set(dentists?.items || []);
        this.boxes.set(boxes?.items || []);
        this.patients.set(patients?.items || []);
        this.loadingResources.set(false);
      })
      .catch((err) => {
        console.error('Error loading resources:', err);
        this.error.set('Error al cargar recursos. Verifica que el backend esté funcionando.');
        this.loadingResources.set(false);
      });
  }

  private populateForm(appointment: Appointment): void {
    this.form.patchValue({
      patientId: appointment.patientId,
      dentistId: appointment.dentistId,
      boxId: appointment.boxId ?? null,
      startDateTime: toDatetimeLocalInput(appointment.startDateTime),
      duration: appointment.duration,
      treatment: appointment.treatment || '',
      notes: appointment.notes || '',
      status: appointment.status,
      isInfectiousPatient: appointment.isInfectiousPatient || false
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const formValue = this.form.value;

    const operation = this.appointment && this.viewMode === 'edit'
      ? this.appointmentService.update(this.appointment.id, {
          patientId: Number(formValue.patientId),
          dentistId: Number(formValue.dentistId),
          boxId: Number(formValue.boxId),
          startDateTime: formValue.startDateTime,
          duration: Number(formValue.duration),
          treatment: formValue.treatment || undefined,
          notes: formValue.notes || undefined,
          isInfectiousPatient: formValue.isInfectiousPatient || false,
          status: formValue.status
        } satisfies AppointmentUpdateDTO)
      : this.appointmentService.create({
          patientId: Number(formValue.patientId),
          dentistId: Number(formValue.dentistId),
          boxId: Number(formValue.boxId),
          startDateTime: formValue.startDateTime,
          duration: Number(formValue.duration),
          treatment: formValue.treatment || undefined,
          notes: formValue.notes || undefined,
          isInfectiousPatient: formValue.isInfectiousPatient || false,
          status: formValue.status
        } satisfies AppointmentCreateDTO);

    operation.subscribe({
      next: (appointment) => {
        this.saving.set(false);
        this.saved.emit(appointment);
        this.onClose();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  onClose(): void {
    this.viewMode = 'create';
    this.resetFormForCreate();
    this.error.set(null);
    this.close.emit();
  }

  get isEditMode(): boolean {
    return this.appointment !== null && this.viewMode === 'edit';
  }

  get modalTitle(): string {
    if (this.viewMode === 'detail') return 'Detalles de la cita';
    if (this.viewMode === 'edit') return 'Editar cita';
    return 'Nueva cita';
  }

  getStatusLabel(status: AppointmentStatus): string {
    return this.statusOptions.find((o) => o.value === status)?.label ?? status;
  }

  formatDateTimeDisplay(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  emitCancelAppointment(): void {
    if (this.appointment) this.cancelAppointment.emit(this.appointment);
  }

  emitDeleteAppointment(): void {
    if (this.appointment) this.deleteAppointment.emit(this.appointment);
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 409) {
        const message = err.error?.message || '';
        if (message.includes('5-minute gap')) {
          return 'Conflicto: El dentista debe tener al menos 5 minutos de separación entre citas.';
        }
        if (message.includes('occupied')) {
          return 'Conflicto: El box o dentista ya está ocupado en ese horario.';
        }
        if (message.includes('infectious')) {
          return 'Conflicto: Los pacientes infecciosos deben ser la última cita del día.';
        }
        return message || 'Conflicto en la programación de la cita.';
      }
      if (err.status === 422) {
        const msg = err.error?.message || err.error?.detail;
        const violations = err.error?.violations;
        if (Array.isArray(violations) && violations.length) {
          const first = violations[0];
          const path = first.propertyPath ?? first.path ?? '';
          const vmsg = first.message ?? first.title ?? '';
          return path ? `${path}: ${vmsg}` : vmsg || msg || 'Datos no válidos para el servidor.';
        }
        return typeof msg === 'string' && msg ? msg : 'Datos no válidos (422). Revisa fecha, hora y campos obligatorios.';
      }
      if (err.status === 400) {
        return 'Datos inválidos. Verifica los campos del formulario.';
      }
      if (err.status === 401) {
        return 'No estás autenticado. Vuelve a iniciar sesión.';
      }
      if (err.status === 403) {
        return 'No tienes permisos para realizar esta acción.';
      }
      return `Error del servidor (${err.status}): ${err.error?.message || err.statusText}`;
    }
    return 'Error al guardar la cita. Intenta nuevamente.';
  }

  getDentistName(dentist: Dentist): string {
    return `${dentist.nombre} ${dentist.apellidos}`.trim();
  }

  getPatientName(patient: PatientRow): string {
    return `${patient.nombre || ''} ${patient.apellidos || patient.apellido || ''}`.trim() || 'Sin nombre';
  }
}
