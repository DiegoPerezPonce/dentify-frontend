import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AppointmentService } from '../appointment.service';
import { DentistService } from '../dentist.service';
import { BoxService } from '../box.service';
import { PatientService } from '../../patients/patient.service';
import { Appointment, AppointmentCreateDTO, AppointmentStatus } from '../models/appointment.models';
import { Dentist } from '../models/dentist.models';
import { Box } from '../models/box.models';
import { PatientRow } from '../../patients/models/patient-list.models';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-appointment-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-form-modal.html',
  styleUrl: './appointment-form-modal.scss'
})
export class AppointmentFormModalComponent implements OnInit {
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

  readonly form: FormGroup;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly loadingResources = signal(true);

  readonly dentists = signal<Dentist[]>([]);
  readonly boxes = signal<Box[]>([]);
  readonly patients = signal<PatientRow[]>([]);

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

    if (this.appointment) {
      this.populateForm(this.appointment);
    } else if (this.preselectedStart) {
      this.form.patchValue({
        startDateTime: this.preselectedStart
      });
      
      if (this.preselectedEnd && this.preselectedStart) {
        const start = new Date(this.preselectedStart);
        const end = new Date(this.preselectedEnd);
        const durationMinutes = (end.getTime() - start.getTime()) / 60000;
        this.form.patchValue({ duration: Math.max(15, durationMinutes) });
      }
    }
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
      boxId: appointment.boxId,
      startDateTime: appointment.startDateTime,
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
    
    const dto: AppointmentCreateDTO = {
      patientId: Number(formValue.patientId),
      dentistId: Number(formValue.dentistId),
      boxId: Number(formValue.boxId),
      startDateTime: formValue.startDateTime,
      duration: Number(formValue.duration),
      treatment: formValue.treatment || undefined,
      notes: formValue.notes || undefined,
      isInfectiousPatient: formValue.isInfectiousPatient || false
    };

    const operation = this.appointment
      ? this.appointmentService.update(this.appointment.id, dto)
      : this.appointmentService.create(dto);

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
    this.form.reset();
    this.error.set(null);
    this.close.emit();
  }

  get isEditMode(): boolean {
    return this.appointment !== null;
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Editar Cita' : 'Nueva Cita';
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
