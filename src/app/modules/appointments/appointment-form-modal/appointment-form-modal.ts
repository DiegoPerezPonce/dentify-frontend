import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
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
import { TreatmentCategoryService } from '../treatment-category.service';
import { TreatmentService } from '../treatment.service';
import { TreatmentCatalogPickerComponent } from '../treatment-catalog-picker/treatment-catalog-picker';
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
import {
  APPOINTMENT_KIND_OPTIONS,
  AppointmentKind,
  findCatalogTreatmentInGroups,
  filterDentistsBySpecialtyName,
  flattenCatalogTreatments,
  getAppointmentKindLabel,
  getAppointmentKindTreatmentHint,
  TreatmentCategoryGroup
} from '../models/clinical-catalog.models';
import { Subscription } from 'rxjs';

export type AppointmentModalViewMode = 'create' | 'detail' | 'edit';

@Component({
  selector: 'app-appointment-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TreatmentCatalogPickerComponent],
  templateUrl: './appointment-form-modal.html',
  styleUrl: './appointment-form-modal.scss'
})
export class AppointmentFormModalComponent implements OnInit, OnChanges, OnDestroy {
  readonly AppointmentStatus = AppointmentStatus;
  readonly appointmentKindOptions = APPOINTMENT_KIND_OPTIONS;
  readonly AppointmentKind = AppointmentKind;

  private fb = inject(FormBuilder);
  private appointmentService = inject(AppointmentService);
  private dentistService = inject(DentistService);
  private boxService = inject(BoxService);
  private patientService = inject(PatientService);
  private treatmentCategoryService = inject(TreatmentCategoryService);
  private treatmentService = inject(TreatmentService);

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
  readonly loadingCatalog = signal(false);
  readonly creatingCustomTreatment = signal(false);

  readonly dentists = signal<Dentist[]>([]);
  readonly boxes = signal<Box[]>([]);
  readonly patients = signal<PatientRow[]>([]);
  readonly treatmentGroups = signal<TreatmentCategoryGroup[]>([]);

  readonly showCustomTreatmentForm = signal(false);
  readonly customTreatmentName = signal('');
  readonly customTreatmentDuration = signal(30);
  readonly customCategoryId = signal<number | null>(null);

  private readonly formTick = signal(0);
  private formSubs: Subscription[] = [];
  private catalogLoadSeq = 0;

  readonly filteredDentists = computed(() => {
    this.formTick();
    const treatment = this.selectedCatalogTreatment();
    const specialtyName = treatment?.dentistSpecialtyName ?? null;
    const all = this.dentists();
    let list = filterDentistsBySpecialtyName(all, specialtyName);
    const currentId = Number(this.form.get('dentistId')?.value);
    if (currentId && !list.some((d) => d.id === currentId)) {
      const current = all.find((d) => d.id === currentId);
      if (current) list = [current, ...list];
    }
    return list;
  });

  readonly selectedCatalogTreatment = computed(() => {
    this.formTick();
    const id = Number(this.form.get('catalogTreatmentId')?.value);
    return findCatalogTreatmentInGroups(this.treatmentGroups(), id);
  });

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
      appointmentKind: [AppointmentKind.TRATAMIENTO, Validators.required],
      catalogTreatmentId: [null, Validators.required],
      dentistId: [null, Validators.required],
      boxId: [null, Validators.required],
      startDateTime: ['', Validators.required],
      duration: [30, [Validators.required, Validators.min(15)]],
      notes: [''],
      status: [AppointmentStatus.SCHEDULED],
      isInfectiousPatient: [false]
    });
  }

  ngOnInit(): void {
    this.loadResources();
    this.formSubs = [
      this.form.get('appointmentKind')?.valueChanges.subscribe(() => this.onAppointmentKindChange()) ??
        new Subscription(),
      this.form.get('catalogTreatmentId')?.valueChanges.subscribe(() => this.onCatalogTreatmentChange()) ??
        new Subscription()
    ];
  }

  ngOnDestroy(): void {
    this.formSubs.forEach((s) => s.unsubscribe());
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

  private syncModalFromInputs(): void {
    if (!this.isOpen) {
      this.viewMode = 'create';
      return;
    }
    this.error.set(null);
    if (this.appointment) {
      this.viewMode = 'detail';
      void this.populateForm(this.appointment);
      return;
    }
    this.viewMode = 'create';
    this.resetFormForCreate();
    if (this.preselectedStart) {
      this.form.patchValue({ startDateTime: toDatetimeLocalInput(this.preselectedStart) });
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
      appointmentKind: AppointmentKind.TRATAMIENTO,
      catalogTreatmentId: null,
      dentistId: null,
      boxId: null,
      startDateTime: '',
      duration: 30,
      notes: '',
      status: AppointmentStatus.SCHEDULED,
      isInfectiousPatient: false
    });
    this.treatmentGroups.set([]);
    this.showCustomTreatmentForm.set(false);
    this.customCategoryId.set(null);
    this.formTick.update((n) => n + 1);
  }

  switchToEdit(): void {
    if (!this.appointment) return;
    this.viewMode = 'edit';
    void this.populateForm(this.appointment);
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
        void this.reloadCatalog();
        this.formTick.update((n) => n + 1);
      })
      .catch((err) => {
        console.error('Error loading resources:', err);
        this.error.set('Error al cargar recursos. Verifica que el backend esté funcionando.');
        this.loadingResources.set(false);
      });
  }

  /** Citas antiguas con tipo `revision` se muestran como primera visita en el formulario. */
  private normalizeAppointmentKind(kind: string | null | undefined): AppointmentKind {
    if (kind === AppointmentKind.REVISION || kind === 'revision') {
      return AppointmentKind.PRIMERA_VISITA;
    }
    if (kind && Object.values(AppointmentKind).includes(kind as AppointmentKind)) {
      return kind as AppointmentKind;
    }
    return AppointmentKind.TRATAMIENTO;
  }

  private async populateForm(appointment: Appointment): Promise<void> {
    const kind = this.normalizeAppointmentKind(appointment.appointmentKind);
    this.form.patchValue({
      patientId: appointment.patientId,
      appointmentKind: kind,
      catalogTreatmentId: appointment.catalogTreatmentId ?? null,
      dentistId: appointment.dentistId,
      boxId: appointment.boxId ?? null,
      startDateTime: toDatetimeLocalInput(appointment.startDateTime),
      duration: appointment.duration,
      notes: appointment.notes || '',
      status: appointment.status,
      isInfectiousPatient: appointment.isInfectiousPatient || false
    });
    await this.reloadCatalog();
    if (!appointment.catalogTreatmentId && appointment.treatment) {
      const flat = flattenCatalogTreatments(this.treatmentGroups());
      const match = flat.find(
        (t) => t.name.toLocaleLowerCase('es') === appointment.treatment!.toLocaleLowerCase('es')
      );
      if (match) {
        this.form.patchValue({ catalogTreatmentId: match.id });
      }
    }
    this.formTick.update((n) => n + 1);
  }

  private onAppointmentKindChange(): void {
    this.form.patchValue({ catalogTreatmentId: null, dentistId: null });
    void this.reloadCatalog();
    this.formTick.update((n) => n + 1);
  }

  private onCatalogTreatmentChange(): void {
    const treatment = this.selectedCatalogTreatment();
    if (treatment) {
      this.form.patchValue({ duration: treatment.defaultDurationMinutes });
      const allowed = filterDentistsBySpecialtyName(this.dentists(), treatment.dentistSpecialtyName);
      const dentistId = Number(this.form.get('dentistId')?.value);
      if (dentistId && !allowed.some((d) => d.id === dentistId)) {
        this.form.patchValue({ dentistId: null });
      }
    }
    this.formTick.update((n) => n + 1);
  }

  treatmentHintForKind(): string {
    return getAppointmentKindTreatmentHint(this.form.get('appointmentKind')?.value);
  }

  private async reloadCatalog(): Promise<void> {
    const kind = String(this.form.get('appointmentKind')?.value ?? AppointmentKind.TRATAMIENTO);
    const seq = ++this.catalogLoadSeq;
    this.loadingCatalog.set(true);
    try {
      const groups = await this.treatmentCategoryService
        .listGrouped({ appointmentKind: kind })
        .toPromise();
      if (seq !== this.catalogLoadSeq) {
        return;
      }
      this.treatmentGroups.set(groups || []);

      const currentId = Number(this.form.get('catalogTreatmentId')?.value);
      if (currentId && !findCatalogTreatmentInGroups(groups || [], currentId)) {
        this.form.patchValue({ catalogTreatmentId: null, dentistId: null });
      }

      if (kind === AppointmentKind.PRIMERA_VISITA || kind === 'primera_visita') {
        const flat = flattenCatalogTreatments(groups || []);
        const diagnostico = flat.find((t) => t.name === 'Diagnóstico') ?? flat[0];
        if (diagnostico && !this.form.get('catalogTreatmentId')?.value) {
          this.form.patchValue({ catalogTreatmentId: diagnostico.id });
          this.onCatalogTreatmentChange();
        }
      }
    } catch (e) {
      console.error(e);
      this.treatmentGroups.set([]);
    } finally {
      if (seq === this.catalogLoadSeq) {
        this.loadingCatalog.set(false);
      }
      this.formTick.update((n) => n + 1);
    }
  }

  toggleCustomTreatmentForm(): void {
    this.showCustomTreatmentForm.update((v) => !v);
    if (!this.showCustomTreatmentForm()) {
      this.customTreatmentName.set('');
      this.customTreatmentDuration.set(30);
      this.customCategoryId.set(null);
    }
  }

  submitCustomTreatment(): void {
    const categoryId = this.customCategoryId();
    const name = this.customTreatmentName().trim();
    if (!categoryId || !name) return;
    const group = this.treatmentGroups().find((g) => g.id === categoryId);
    const ref = group?.treatments[0];
    if (!ref) return;

    const kind = this.form.get('appointmentKind')?.value as AppointmentKind;
    const forFirstVisit = kind === AppointmentKind.PRIMERA_VISITA;

    this.creatingCustomTreatment.set(true);
    this.treatmentService
      .create({
        name,
        categoryId,
        dentistSpecialtyId: ref.dentistSpecialtyId,
        defaultDurationMinutes: this.customTreatmentDuration(),
        allowsUrgency: kind !== AppointmentKind.TRATAMIENTO,
        forFirstVisit
      })
      .subscribe({
        next: async (created) => {
          this.creatingCustomTreatment.set(false);
          this.showCustomTreatmentForm.set(false);
          this.customTreatmentName.set('');
          this.customCategoryId.set(null);
          await this.reloadCatalog();
          this.form.patchValue({ catalogTreatmentId: created.id });
          this.onCatalogTreatmentChange();
        },
        error: (err: unknown) => {
          this.creatingCustomTreatment.set(false);
          this.error.set(this.getErrorMessage(err));
        }
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const formValue = this.form.value;
    const catalog = this.selectedCatalogTreatment();
    const payloadBase = {
      patientId: Number(formValue.patientId),
      dentistId: Number(formValue.dentistId),
      boxId: Number(formValue.boxId),
      startDateTime: formValue.startDateTime,
      duration: Number(formValue.duration),
      appointmentKind: formValue.appointmentKind,
      catalogTreatmentId: Number(formValue.catalogTreatmentId),
      treatment: catalog?.name,
      notes: formValue.notes || undefined,
      isInfectiousPatient: formValue.isInfectiousPatient || false,
      status: formValue.status
    };

    this.saving.set(true);
    this.error.set(null);

    const operation =
      this.appointment && this.viewMode === 'edit'
        ? this.appointmentService.update(this.appointment.id, payloadBase satisfies AppointmentUpdateDTO)
        : this.appointmentService.create(payloadBase satisfies AppointmentCreateDTO);

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

  getAppointmentKindLabel(kind: string | undefined): string {
    return getAppointmentKindLabel(kind);
  }

  formatDateTimeDisplay(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
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
        return err.error?.message || 'Datos inválidos. Verifica los campos del formulario.';
      }
      if (err.status === 401) return 'No estás autenticado. Vuelve a iniciar sesión.';
      if (err.status === 403) return 'No tienes permisos para realizar esta acción.';
      return `Error del servidor (${err.status}): ${err.error?.message || err.statusText}`;
    }
    return 'Error al guardar la cita. Intenta nuevamente.';
  }

  getDentistName(dentist: Dentist): string {
    const base = `${dentist.nombre} ${dentist.apellidos}`.trim();
    const spec = dentist.especialidad?.trim();
    return spec ? `${base} (${spec})` : base;
  }

  hasCatalogTreatmentSelected(): boolean {
    return !!this.selectedCatalogTreatment();
  }

  getPatientName(patient: PatientRow): string {
    return `${patient.nombre || ''} ${patient.apellidos || patient.apellido || ''}`.trim() || 'Sin nombre';
  }

  selectedTreatmentCategoryName(): string | null {
    return this.selectedCatalogTreatment()?.categoryName ?? null;
  }

  requiredDentistSpecialtyLabel(): string | null {
    return this.selectedCatalogTreatment()?.dentistSpecialtyName ?? null;
  }
}
