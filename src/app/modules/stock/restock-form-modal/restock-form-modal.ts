import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StockRestockService } from '../stock-restock.service';
import { StockMaterial } from '../models/stock-material.models';
import { StockRestockCreateDTO } from '../models/stock-restock.models';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-restock-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './restock-form-modal.html',
  styleUrl: './restock-form-modal.scss'
})
export class RestockFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private restockService = inject(StockRestockService);

  @Input() isOpen = false;
  @Input() material: StockMaterial | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly form: FormGroup;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.form = this.fb.group({
      cantidad_recibida: ['', [Validators.required, Validators.min(0.01)]],
      proveedor: ['', Validators.required],
      fecha: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Set default date to now
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    this.form.patchValue({
      fecha: localDate
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.material) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const formValue = this.form.value;

    const dto: StockRestockCreateDTO = {
      material_id: this.material.id,
      cantidad_recibida: Number(formValue.cantidad_recibida),
      proveedor: formValue.proveedor,
      fecha: formValue.fecha
    };

    this.restockService.create(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
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

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
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
    return 'Error al registrar la recepción. Intenta nuevamente.';
  }
}
