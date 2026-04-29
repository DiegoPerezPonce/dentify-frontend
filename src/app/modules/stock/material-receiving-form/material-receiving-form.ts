import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StockMaterialService } from '../stock-material.service';
import { StockRestockService } from '../stock-restock.service';
import { StockMaterial } from '../models/stock-material.models';
import { StockRestock } from '../models/stock-restock.models';

@Component({
  selector: 'app-material-receiving-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './material-receiving-form.html',
  styleUrl: './material-receiving-form.scss'
})
export class MaterialReceivingFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private stockMaterialService = inject(StockMaterialService);
  private stockRestockService = inject(StockRestockService);

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly materials = signal<StockMaterial[]>([]);
  readonly history = signal<StockRestock[]>([]);

  readonly form = this.fb.group({
    material_id: ['', Validators.required],
    cantidad_recibida: ['', [Validators.required, Validators.min(0.01)]],
    proveedor: ['', Validators.required],
    fecha: ['', Validators.required]
  });

  ngOnInit(): void {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    this.form.patchValue({ fecha: localDate });
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.stockMaterialService.list().subscribe({
      next: (materialsRes) => {
        this.materials.set(materialsRes.items);
        this.stockRestockService.list().subscribe({
          next: (historyRes) => {
            this.history.set(historyRes.items);
            this.loading.set(false);
          },
          error: (err: unknown) => {
            this.loading.set(false);
            this.error.set(this.getErrorMessage(err));
          }
        });
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    this.success.set(null);

    this.stockRestockService
      .create({
        material_id: Number(value.material_id),
        cantidad_recibida: Number(value.cantidad_recibida),
        proveedor: String(value.proveedor),
        fecha: String(value.fecha)
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.success.set('Recepción registrada correctamente.');
          this.form.patchValue({
            material_id: '',
            cantidad_recibida: '',
            proveedor: ''
          });
          this.loadData();
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.error.set(this.getErrorMessage(err));
        }
      });
  }

  formatDate(value: string): string {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 400) return 'Datos inválidos. Revisa el formulario.';
      if (err.status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
      if (err.status === 403) return 'No tienes permisos para registrar recepciones.';
      if (err.status === 0) return 'No hay conexión con el servidor.';
      return `Error del servidor (${err.status}).`;
    }
    return 'No se pudo completar la operación.';
  }
}
