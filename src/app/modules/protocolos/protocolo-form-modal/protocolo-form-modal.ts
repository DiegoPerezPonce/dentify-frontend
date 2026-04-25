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
import { ProtocoloService } from '../protocolo.service';
import { StockMaterialService } from '../../stock/stock-material.service';
import {
  ProtocoloCreatePayload,
  ProtocoloTratamiento,
  ProtocoloUpdatePayload
} from '../models/protocolo.models';
import { StockMaterial } from '../../stock/models/stock-material.models';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-protocolo-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './protocolo-form-modal.html',
  styleUrl: './protocolo-form-modal.scss'
})
export class ProtocoloFormModalComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private protocoloService = inject(ProtocoloService);
  private stockMaterialService = inject(StockMaterialService);

  @Input() isOpen = false;
  @Input() protocolo: ProtocoloTratamiento | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly form: FormGroup;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly materiales = signal<StockMaterial[]>([]);

  constructor() {
    this.form = this.fb.group({
      nombre_tratamiento: ['', Validators.required],
      material_id: ['', Validators.required],
      cantidad_necesaria: [1, [Validators.required, Validators.min(0.0001)]],
      notas_paso_a_paso: ['']
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['protocolo'] || changes['isOpen']) && this.isOpen) {
      this.error.set(null);
      this.stockMaterialService.list().subscribe({
        next: (r) => this.materiales.set(r.items),
        error: () => this.materiales.set([])
      });
      this.resetForm();
    }
  }

  resetForm(): void {
    this.error.set(null);

    if (this.protocolo) {
      this.form.patchValue({
        nombre_tratamiento: this.protocolo.nombre_tratamiento,
        material_id: String(this.protocolo.material?.id ?? ''),
        cantidad_necesaria: this.protocolo.cantidad_necesaria,
        notas_paso_a_paso: this.protocolo.notas_paso_a_paso ?? ''
      });
    } else {
      this.form.reset({
        nombre_tratamiento: '',
        material_id: '',
        cantidad_necesaria: 1,
        notas_paso_a_paso: ''
      });
    }
  }

  get isEditMode(): boolean {
    return this.protocolo !== null;
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Editar paso de protocolo' : 'Nuevo paso de protocolo';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const fv = this.form.value as {
      nombre_tratamiento: string;
      material_id: string;
      cantidad_necesaria: number;
      notas_paso_a_paso: string;
    };

    const notas = fv.notas_paso_a_paso?.trim() ? fv.notas_paso_a_paso.trim() : null;

    if (this.isEditMode && this.protocolo) {
      const payload: ProtocoloUpdatePayload = {
        nombre_tratamiento: fv.nombre_tratamiento.trim(),
        material_id: Number(fv.material_id),
        cantidad_necesaria: Number(fv.cantidad_necesaria),
        notas_paso_a_paso: notas ?? ''
      };

      this.protocoloService.update(this.protocolo.id, payload).subscribe({
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
      const payload: ProtocoloCreatePayload = {
        nombre_tratamiento: fv.nombre_tratamiento.trim(),
        material_id: Number(fv.material_id),
        cantidad_necesaria: Number(fv.cantidad_necesaria),
        notas_paso_a_paso: notas
      };

      this.protocoloService.create(payload).subscribe({
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
    if (control.errors['min']) {
      return 'La cantidad debe ser mayor que cero';
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
    return 'Error al guardar. Intenta nuevamente.';
  }
}
