import {
  Component,
  computed,
  EventEmitter,
  HostListener,
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
import { AppIconComponent } from '../../../shared/app-icon/app-icon.component';
import { DatetimeInputComponent } from '../../../shared/time-input/datetime-input.component';
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
import { Subscription, catchError, of } from 'rxjs';
import { DentistScheduleService } from '../../dentist-availability/dentist-schedule.service';
import { ClinicScheduleSettings } from '../../dentist-availability/models/dentist-schedule.models';
import {
  clinicHoursErrorMessageForSlot,
  clinicHoursRangeLabel,
  isAppointmentWithinClinicHours,
  lastAppointmentStartOnDay
} from '../../dentist-availability/clinic-hours.utils';
import {
  appointmentMedicalTitle,
  appointmentPatientMedicalSeverity,
  medicalRiskIconName
} from '../appointment-patient-risk.utils';
import {
  medicalFlagLabels,
  patientMedicalSeverity,
  type MedicalAlertSeverity
} from '../../patients/medical-flags.constants';
import { DEFAULT_APPOINTMENT_CLEANING_MINUTES } from '../appointment-duration.constants';

export type AppointmentModalViewMode = 'create' | 'detail' | 'edit';

@Component({
  selector: 'app-appointment-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TreatmentCatalogPickerComponent,
    AppIconComponent,
    DatetimeInputComponent
  ],
  templateUrl: './appointment-form-modal.html',
  styleUrl: './appointment-form-modal.scss'
})
export class AppointmentFormModalComponent implements OnInit, OnChanges, OnDestroy {
  readonly AppointmentStatus = AppointmentStatus;
  readonly defaultCleaningMinutes = DEFAULT_APPOINTMENT_CLEANING_MINUTES;
  readonly appointmentKindOptions = APPOINTMENT_KIND_OPTIONS;
  readonly AppointmentKind = AppointmentKind;

  private fb = inject(FormBuilder);
  private appointmentService = inject(AppointmentService);
  private dentistService = inject(DentistService);
  private boxService = inject(BoxService);
  private patientService = inject(PatientService);
  private treatmentCategoryService = inject(TreatmentCategoryService);
  private treatmentService = inject(TreatmentService);
  private scheduleService = inject(DentistScheduleService);

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
  readonly statusMenuOpen = signal(false);
  readonly error = signal<string | null>(null);
  readonly loadingResources = signal(true);
  readonly loadingCatalog = signal(false);
  readonly creatingCustomTreatment = signal(false);

  readonly dentists = signal<Dentist[]>([]);
  readonly boxes = signal<Box[]>([]);
  readonly patients = signal<PatientRow[]>([]);
  readonly treatmentGroups = signal<TreatmentCategoryGroup[]>([]);

  readonly showCustomTreatmentForm = signal(false);
  readonly clinicSettings = signal<ClinicScheduleSettings | null>(null);
  readonly clinicHoursAlert = signal<string | null>(null);
  readonly infectiousPatientAlert = signal<string | null>(null);
  readonly availableDentistIds = signal<number[]>([]);
  readonly availableBoxIds = signal<number[]>([]);
  readonly loadingAvailableDentists = signal(false);
  readonly loadingAvailableBoxes = signal(false);

  readonly clinicHoursHint = computed(() => {
    const c = this.clinicSettings();
    return c ? clinicHoursRangeLabel(c) : null;
  });
  readonly customTreatmentName = signal('');
  readonly customTreatmentDuration = signal(30);
  readonly customCategoryId = signal<number | null>(null);

  private readonly formTick = signal(0);
  private formSubs: Subscription[] = [];
  private catalogLoadSeq = 0;

  readonly hasScheduleSlotSelected = computed(() => {
    this.formTick();
    const startRaw = this.form.get('startDateTime')?.value as string | undefined;
    if (!startRaw) return false;
    return this.validateClinicHoursFromForm() === null;
  });

  readonly filteredBoxes = computed(() => {
    this.formTick();
    this.availableBoxIds();
    const all = this.boxes();
    let list = all.filter((b) => {
      const estado = (b.estado ?? 'disponible').toLowerCase();
      return estado === 'disponible';
    });

    if (this.hasScheduleSlotSelected()) {
      const allowed = new Set(this.availableBoxIds());
      list = list.filter((b) => allowed.has(b.id));
    } else {
      list = [];
    }

    const currentId = Number(this.form.get('boxId')?.value);
    if (currentId && !list.some((b) => b.id === currentId)) {
      const current = all.find((b) => b.id === currentId);
      if (current) list = [current, ...list];
    }
    return list;
  });

  readonly filteredDentists = computed(() => {
    this.formTick();
    this.availableDentistIds();
    const treatment = this.selectedCatalogTreatment();
    const specialtyName = treatment?.dentistSpecialtyName ?? null;
    const all = this.dentists();
    let list = filterDentistsBySpecialtyName(all, specialtyName);

    if (this.hasScheduleSlotSelected()) {
      const allowed = new Set(this.availableDentistIds());
      list = list.filter((d) => allowed.has(d.id));
    } else {
      list = [];
    }

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

  readonly selectedPatient = computed(() => {
    this.formTick();
    const id = Number(this.form.get('patientId')?.value);
    if (!id) return null;
    return this.patients().find((p) => Number(p.id) === id) ?? null;
  });

  viewMode: AppointmentModalViewMode = 'create';

  readonly statusOptions = [
    { value: AppointmentStatus.SCHEDULED, label: 'Programada' },
    { value: AppointmentStatus.COMPLETED, label: 'Completada' },
    { value: AppointmentStatus.CANCELLED, label: 'Cancelada' },
    { value: AppointmentStatus.NO_SHOW, label: 'No asistió' }
  ];

  /** Estados disponibles desde el detalle (sin entrar en editar). */
  readonly detailStatusOptions = [
    { value: AppointmentStatus.SCHEDULED, label: 'Programada' },
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
      treatmentDuration: [30, [Validators.required, Validators.min(15)]],
      cleaningTimeMinutes: [
        DEFAULT_APPOINTMENT_CLEANING_MINUTES,
        [Validators.required, Validators.min(0), Validators.max(60)]
      ],
      notes: [''],
      status: [AppointmentStatus.SCHEDULED],
      isInfectiousPatient: [false]
    });
  }

  ngOnInit(): void {
    this.loadClinicSettings();
    this.loadResources();
    this.formSubs = [
      this.form.get('appointmentKind')?.valueChanges.subscribe(() => this.onAppointmentKindChange()) ??
        new Subscription(),
      this.form.get('catalogTreatmentId')?.valueChanges.subscribe(() => this.onCatalogTreatmentChange()) ??
        new Subscription(),
      this.form.get('startDateTime')?.valueChanges.subscribe(() => this.onScheduleFieldsChange()) ??
        new Subscription(),
      this.form.get('treatmentDuration')?.valueChanges.subscribe(() => this.onDurationChange()) ??
        new Subscription(),
      this.form.get('cleaningTimeMinutes')?.valueChanges.subscribe(() => this.onDurationChange()) ??
        new Subscription(),
      this.form.get('patientId')?.valueChanges.subscribe(() => this.onPatientChange()) ??
        new Subscription(),
      this.form.get('isInfectiousPatient')?.valueChanges.subscribe(() => this.onInfectiousPatientToggle()) ??
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
    this.clinicHoursAlert.set(null);
    this.infectiousPatientAlert.set(null);
    this.loadClinicSettings();
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
        const totalMinutes = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
        const cleaning = DEFAULT_APPOINTMENT_CLEANING_MINUTES;
        this.form.patchValue({
          cleaningTimeMinutes: cleaning,
          treatmentDuration: Math.max(15, totalMinutes - cleaning)
        });
      }
      void this.loadAvailableDentists();
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
      treatmentDuration: 30,
      cleaningTimeMinutes: DEFAULT_APPOINTMENT_CLEANING_MINUTES,
      notes: '',
      status: AppointmentStatus.SCHEDULED,
      isInfectiousPatient: false
    });
    this.treatmentGroups.set([]);
    this.availableDentistIds.set([]);
    this.showCustomTreatmentForm.set(false);
    this.customCategoryId.set(null);
    this.infectiousPatientAlert.set(null);
    this.formTick.update((n) => n + 1);
  }

  onPatientChange(): void {
    const patient = this.selectedPatient();
    if (!patient || patientMedicalSeverity(patient.medical_flags) !== 'biosecurity') {
      this.infectiousPatientAlert.set(null);
      this.formTick.update((n) => n + 1);
      return;
    }

    const flags = patient.medical_flags ?? [];
    const labels = medicalFlagLabels(flags).join(', ');
    this.infectiousPatientAlert.set(
      labels
        ? `Este paciente tiene alertas de bioseguridad (${labels}). Debe ser la última cita del día.`
        : 'Este paciente está marcado como infeccioso. Debe ser la última cita del día.'
    );

    if (this.viewMode === 'create') {
      this.form.patchValue({ isInfectiousPatient: true }, { emitEvent: false });
      this.applyLastSlotOfDay();
    }

    this.formTick.update((n) => n + 1);
  }

  onInfectiousPatientToggle(): void {
    const checked = Boolean(this.form.get('isInfectiousPatient')?.value);
    if (checked && this.viewMode === 'create') {
      this.applyLastSlotOfDay();
    }
    this.formTick.update((n) => n + 1);
  }

  private applyLastSlotOfDay(): void {
    const clinic = this.clinicSettings();
    if (!clinic) return;

    const duration = this.getTotalDurationMinutes();
    const startRaw = this.form.get('startDateTime')?.value as string | undefined;

    let day: Date;
    if (startRaw) {
      day = new Date(startRaw);
    } else if (this.preselectedStart) {
      day = new Date(this.preselectedStart);
    } else {
      day = new Date();
    }

    const lastStart = lastAppointmentStartOnDay(day, duration, clinic);
    if (!lastStart) {
      this.clinicHoursAlert.set(
        `No cabe una cita de ${duration} min al final del día (${clinicHoursRangeLabel(clinic)}).`
      );
      return;
    }

    this.form.patchValue({ startDateTime: toDatetimeLocalInput(lastStart.toISOString()) });
    const msg = this.validateClinicHoursFromForm();
    this.clinicHoursAlert.set(msg);
    if (!msg) {
      this.error.set(null);
    }
    this.form.patchValue({ dentistId: null, boxId: null });
    void this.loadAvailableDentists();
    void this.loadAvailableBoxes();
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
    const cleaning =
      appointment.cleaningTimeMinutes ?? DEFAULT_APPOINTMENT_CLEANING_MINUTES;
    const treatment =
      appointment.treatmentDurationMinutes ??
      Math.max(15, appointment.duration - cleaning);

    this.form.patchValue({
      patientId: appointment.patientId,
      appointmentKind: kind,
      catalogTreatmentId: appointment.catalogTreatmentId ?? null,
      dentistId: appointment.dentistId,
      boxId: appointment.boxId ?? null,
      startDateTime: toDatetimeLocalInput(appointment.startDateTime),
      treatmentDuration: treatment,
      cleaningTimeMinutes: cleaning,
      notes: appointment.notes || '',
      status: appointment.status,
      isInfectiousPatient: appointment.isInfectiousPatient || false
    });
    await this.reloadCatalog();
    void this.loadAvailableDentists();
    void this.loadAvailableBoxes();
    if (!appointment.catalogTreatmentId && appointment.treatment) {
      const flat = flattenCatalogTreatments(this.treatmentGroups());
      const match = flat.find(
        (t) => t.name.toLocaleLowerCase('es') === appointment.treatment!.toLocaleLowerCase('es')
      );
      if (match) {
        this.form.patchValue({ catalogTreatmentId: match.id });
      }
    }
    this.onPatientChange();
    this.formTick.update((n) => n + 1);
  }

  private onAppointmentKindChange(): void {
    this.form.patchValue({ catalogTreatmentId: null, dentistId: null, boxId: null });
    this.availableDentistIds.set([]);
    this.availableBoxIds.set([]);
    void this.reloadCatalog();
    this.formTick.update((n) => n + 1);
  }

  private onCatalogTreatmentChange(): void {
    const treatment = this.selectedCatalogTreatment();
    if (treatment) {
      this.form.patchValue({ treatmentDuration: treatment.defaultDurationMinutes });
    }
    this.form.patchValue({ dentistId: null, boxId: null });
    void this.loadAvailableDentists();
    void this.loadAvailableBoxes();
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

  private loadClinicSettings(): void {
    this.scheduleService
      .getClinicSettings()
      .pipe(catchError(() => of(null)))
      .subscribe((clinic) => this.clinicSettings.set(clinic));
  }

  onDurationChange(): void {
    if (this.viewMode === 'create' && this.form.get('isInfectiousPatient')?.value) {
      this.applyLastSlotOfDay();
      return;
    }
    this.onScheduleFieldsChange();
  }

  onScheduleFieldsChange(): void {
    const msg = this.validateClinicHoursFromForm();
    this.clinicHoursAlert.set(msg);
    if (!msg) {
      this.error.set(null);
    }
    this.form.patchValue({ dentistId: null, boxId: null });
    void this.loadAvailableDentists();
    void this.loadAvailableBoxes();
    this.formTick.update((n) => n + 1);
  }

  private loadAvailableDentists(): void {
    const startRaw = this.form.get('startDateTime')?.value as string | undefined;
    const duration = this.getTotalDurationMinutes();

    if (!startRaw || this.validateClinicHoursFromForm() !== null || duration < 1) {
      this.availableDentistIds.set([]);
      this.loadingAvailableDentists.set(false);
      return;
    }

    const excludeId =
      this.appointment && this.viewMode === 'edit' ? this.appointment.id : null;

    this.loadingAvailableDentists.set(true);
    this.scheduleService.getAvailableDentistIds(startRaw, duration, excludeId).subscribe({
      next: (ids) => {
        this.availableDentistIds.set(ids);
        this.loadingAvailableDentists.set(false);
        const dentistId = Number(this.form.get('dentistId')?.value);
        if (dentistId && !ids.includes(dentistId)) {
          this.form.patchValue({ dentistId: null });
        }
        this.formTick.update((n) => n + 1);
      },
      error: () => {
        this.availableDentistIds.set([]);
        this.loadingAvailableDentists.set(false);
        this.formTick.update((n) => n + 1);
      }
      });
  }

  private loadAvailableBoxes(): void {
    const startRaw = this.form.get('startDateTime')?.value as string | undefined;
    const duration = this.getTotalDurationMinutes();

    if (!startRaw || this.validateClinicHoursFromForm() !== null || duration < 1) {
      this.availableBoxIds.set([]);
      this.loadingAvailableBoxes.set(false);
      return;
    }

    const excludeId =
      this.appointment && this.viewMode === 'edit' ? this.appointment.id : null;

    this.loadingAvailableBoxes.set(true);
    this.scheduleService.getAvailableBoxIds(startRaw, duration, excludeId).subscribe({
      next: (ids) => {
        this.availableBoxIds.set(ids);
        this.loadingAvailableBoxes.set(false);
        const boxId = Number(this.form.get('boxId')?.value);
        if (boxId && !ids.includes(boxId)) {
          this.form.patchValue({ boxId: null });
        }
        this.formTick.update((n) => n + 1);
      },
      error: () => {
        this.availableBoxIds.set([]);
        this.loadingAvailableBoxes.set(false);
        this.formTick.update((n) => n + 1);
      }
    });
  }

  private validateClinicHoursFromForm(): string | null {
    const clinic = this.clinicSettings();
    const startRaw = this.form.get('startDateTime')?.value as string | undefined;
    if (!clinic || !startRaw) return null;

    const start = new Date(startRaw);
    const duration = this.getTotalDurationMinutes();
    if (Number.isNaN(start.getTime()) || duration < 1) return null;

    if (!isAppointmentWithinClinicHours(start, duration, clinic)) {
      return clinicHoursErrorMessageForSlot(start, duration, clinic);
    }
    return null;
  }

  private showClinicHoursAlert(message: string): void {
    this.clinicHoursAlert.set(message);
    this.error.set(message);
    window.alert(message);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const hoursError = this.validateClinicHoursFromForm();
    if (hoursError) {
      this.form.get('startDateTime')?.markAsTouched();
      this.form.get('treatmentDuration')?.markAsTouched();
      this.form.get('cleaningTimeMinutes')?.markAsTouched();
      this.showClinicHoursAlert(hoursError);
      return;
    }

    const formValue = this.form.value;
    const catalog = this.selectedCatalogTreatment();
    const payloadBase = {
      patientId: Number(formValue.patientId),
      dentistId: Number(formValue.dentistId),
      boxId: Number(formValue.boxId),
      startDateTime: formValue.startDateTime,
      duration: this.getTotalDurationMinutes(),
      cleaningTimeMinutes: Number(formValue.cleaningTimeMinutes),
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
    this.statusMenuOpen.set(false);
    this.viewMode = 'create';
    this.resetFormForCreate();
    this.error.set(null);
    this.clinicHoursAlert.set(null);
    this.infectiousPatientAlert.set(null);
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

  toggleStatusMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.statusMenuOpen.update((open) => !open);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.status-change-wrap')) {
      return;
    }
    this.statusMenuOpen.set(false);
  }

  changeAppointmentStatus(newStatus: AppointmentStatus): void {
    const apt = this.appointment;
    if (!apt || apt.status === newStatus || this.saving()) {
      this.statusMenuOpen.set(false);
      return;
    }

    if (newStatus === AppointmentStatus.CANCELLED) {
      if (!confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
        this.statusMenuOpen.set(false);
        return;
      }
    }

    this.statusMenuOpen.set(false);
    this.saving.set(true);
    this.error.set(null);

    const request$ =
      newStatus === AppointmentStatus.CANCELLED
        ? this.appointmentService.cancel(apt.id)
        : this.appointmentService.update(apt.id, { status: newStatus });

    request$.subscribe({
      next: (updated) => {
        this.saving.set(false);
        Object.assign(apt, updated);
        this.saved.emit(updated);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 409) {
        const message = err.error?.message || '';
        if (
          message.includes('5-minute gap') ||
          message.includes('5 minutos entre citas') ||
          message.includes('odontólogo ya tiene')
        ) {
          return message.includes('odontólogo')
            ? message
            : 'El odontólogo ya tiene otra cita en ese horario (mínimo 5 min entre citas).';
        }
        if (message.includes('box ya está ocupado') || message.includes('box is already')) {
          return 'El box ya está ocupado en ese horario.';
        }
        if (message.includes('occupied') || message.includes('ocupado')) {
          return message || 'El odontólogo o el box ya están ocupados en ese horario.';
        }
        if (message.includes('infectious')) {
          return 'Conflicto: Los pacientes infecciosos deben ser la última cita del día.';
        }
        if (message.includes('horario de la clínica') || message.includes('No se puede agendar')) {
          return message;
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

  getTotalDurationMinutes(): number {
    const treatment = Number(this.form.get('treatmentDuration')?.value) || 0;
    const cleaning = Number(this.form.get('cleaningTimeMinutes')?.value) || 0;
    return treatment + cleaning;
  }

  getTreatmentDurationMinutes(): number {
    return Number(this.form.get('treatmentDuration')?.value) || 0;
  }

  getCleaningTimeMinutes(): number {
    return Number(this.form.get('cleaningTimeMinutes')?.value) || 0;
  }

  detailTreatmentDurationMinutes(): number {
    if (!this.appointment) return 0;
    return (
      this.appointment.treatmentDurationMinutes ??
      Math.max(0, this.appointment.duration - (this.appointment.cleaningTimeMinutes ?? 5))
    );
  }

  detailCleaningTimeMinutes(): number {
    return this.appointment?.cleaningTimeMinutes ?? DEFAULT_APPOINTMENT_CLEANING_MINUTES;
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

  detailAppointmentRisk(): MedicalAlertSeverity | null {
    if (!this.appointment) return null;
    return appointmentPatientMedicalSeverity(this.appointment);
  }

  detailAppointmentRiskTitle(): string {
    if (!this.appointment) return '';
    return appointmentMedicalTitle(this.appointment);
  }

  detailRiskIcon(sev: MedicalAlertSeverity): string {
    return medicalRiskIconName(sev);
  }
}
