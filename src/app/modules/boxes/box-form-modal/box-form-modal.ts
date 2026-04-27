import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BoxService } from '../box.service';
import { DentistService } from '../../dentists/dentist.service';
import { Box, BoxCreatePayload, BoxUpdatePayload } from '../models/box.models';
import { Dentist } from '../../dentists/models/dentist.models';
import { HttpErrorResponse } from '@angular/common/http';

export const BOX_ESTADOS = ['disponible', 'ocupado', 'mantenimiento'] as const;

@Component({
  selector: 'app-box-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './box-form-modal.html',
  styleUrl: './box-form-modal.scss'
})
export class BoxFormModalComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private boxService = inject(BoxService);
  private dentistService = inject(DentistService);

  @Input() isOpen = false;
  @Input() box: Box | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly form: FormGroup;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly dentists = signal<Dentist[]>([]);
  readonly estados = BOX_ESTADOS;

  constructor() {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      estado: ['disponible', Validators.required],
      dentistSelect: ['']
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['box'] || changes['isOpen']) && this.isOpen) {
      this.error.set(null);
      this.dentistService.list().subscribe({
        next: (r) => this.dentists.set(r.items),
        error: () => this.dentists.set([])
      });
      this.resetForm();
    }
  }

  resetForm(): void {
    this.error.set(null);

    if (this.box) {
      this.form.patchValue({
        nombre: this.box.nombre,
        descripcion: this.box.descripcion ?? '',
        estado: this.box.estado || 'disponible',
        dentistSelect: this.box.dentistId != null ? String(this.box.dentistId) : ''
      });
    } else {
      this.form.reset({
        nombre: '',
        descripcion: '',
        estado: 'disponible',
        dentistSelect: ''
      });
    }
  }

  get isEditMode(): boolean {
    return this.box !== null;
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Editar gabinete' : 'Nuevo gabinete';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const fv = this.form.value as {
      nombre: string;
      descripcion: string;
      estado: string;
      dentistSelect: string;
    };

    if (this.isEditMode && this.box) {
      const payload: BoxUpdatePayload = {
        nombre: fv.nombre.trim(),
        descripcion: fv.descripcion?.trim() ? fv.descripcion.trim() : null,
        estado: fv.estado
      };

      const sel = fv.dentistSelect ?? '';
      if (sel === '') {
        if (this.box.dentistId != null) {
          payload.clear_dentist = true;
        }
      } else {
        payload.dentist_id = Number(sel);
      }

      this.boxService.update(this.box.id, payload).subscribe({
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
      const payload: BoxCreatePayload = {
        nombre: fv.nombre.trim(),
        descripcion: fv.descripcion?.trim() ? fv.descripcion.trim() : null,
        estado: fv.estado
      };
      const sel = fv.dentistSelect ?? '';
      if (sel !== '') {
        payload.dentist_id = Number(sel);
      }

      this.boxService.create(payload).subscribe({
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
      return `Error del servidor (${err.status}): ${err.error?.message || err.statusText}`;
    }
    return 'Error al guardar el gabinete. Intenta nuevamente.';
  }
}
