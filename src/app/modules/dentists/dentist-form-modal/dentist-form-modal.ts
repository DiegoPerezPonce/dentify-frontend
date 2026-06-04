import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, signal, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DentistService } from '../dentist.service';
import { Dentist, DentistCreateDTO, DentistUpdateDTO } from '../models/dentist.models';
import { HttpErrorResponse } from '@angular/common/http';
import { SpecialtyService } from '../../../core/catalog/specialty.service';

@Component({
  selector: 'app-dentist-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dentist-form-modal.html',
  styleUrl: './dentist-form-modal.scss'
})
export class DentistFormModalComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private dentistService = inject(DentistService);
  private specialtyService = inject(SpecialtyService);

  @Input() isOpen = false;
  @Input() dentist: Dentist | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly form: FormGroup;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly specialtyOptions = signal<string[]>([]);
  readonly loadingSpecialties = signal(false);

  constructor() {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      apellidos: ['', Validators.required],
      especialidad: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadSpecialtyOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dentist'] || changes['isOpen']) {
      if (this.isOpen) {
        this.resetForm();
        if (this.specialtyOptions().length === 0) {
          this.loadSpecialtyOptions();
        }
      }
    }
  }

  private loadSpecialtyOptions(): void {
    this.loadingSpecialties.set(true);
    this.specialtyService.list().subscribe({
      next: (items) => {
        this.specialtyOptions.set(items.map((s) => s.name).sort((a, b) => a.localeCompare(b, 'es')));
        this.loadingSpecialties.set(false);
      },
      error: () => {
        this.loadingSpecialties.set(false);
      }
    });
  }

  resetForm(): void {
    this.error.set(null);
    
    if (this.dentist) {
      // Edit mode
      this.form.patchValue({
        nombre: this.dentist.nombre,
        apellidos: this.dentist.apellidos,
        especialidad: this.dentist.especialidad,
        email: this.dentist.email
      });
    } else {
      // Create mode
      this.form.reset({
        nombre: '',
        apellidos: '',
        especialidad: '',
        email: ''
      });
    }
  }

  get isEditMode(): boolean {
    return this.dentist !== null;
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Editar Odontólogo' : 'Crear Nuevo Odontólogo';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const formValue = this.form.value;

    if (this.isEditMode && this.dentist) {
      // Update existing dentist
      const dto: DentistUpdateDTO = {
        nombre: formValue.nombre,
        apellidos: formValue.apellidos,
        especialidad: formValue.especialidad,
        email: formValue.email
      };

      this.dentistService.update(this.dentist.id, dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(this.getErrorMessage(err));
        }
      });
    } else {
      // Create new dentist
      const dto: DentistCreateDTO = {
        nombre: formValue.nombre,
        apellidos: formValue.apellidos,
        especialidad: formValue.especialidad,
        email: formValue.email
      };

      this.dentistService.create(dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(this.getErrorMessage(err));
        }
      });
    }
  }

  onClose(): void {
    if (!this.saving()) {
      this.form.reset();
      this.error.set(null);
      this.close.emit();
    }
  }

  getFieldError(fieldName: string): string | null {
    const control = this.form.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio';
    }
    if (control.errors['email']) {
      return 'Ingresa un email válido';
    }

    return 'Campo inválido';
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 400) {
        const message = err.error?.message;
        if (message && typeof message === 'string') {
          return message;
        }
        return 'Datos inválidos. Verifica los campos del formulario.';
      }
      if (err.status === 401) {
        return 'No estás autenticado. Vuelve a iniciar sesión.';
      }
      if (err.status === 403) {
        return 'No tienes permisos para realizar esta acción.';
      }
      if (err.status === 409) {
        return 'El email ya está en uso por otro odontólogo.';
      }
      return `Error del servidor (${err.status}): ${err.error?.message || err.statusText}`;
    }
    return 'Error al guardar el odontólogo. Intenta nuevamente.';
  }
}
