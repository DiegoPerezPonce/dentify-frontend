import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockMaterialService } from '../stock-material.service';
import { StockMaterial, LOW_STOCK_THRESHOLD } from '../models/stock-material.models';
import { HttpErrorResponse } from '@angular/common/http';
import { RestockFormModalComponent } from '../restock-form-modal/restock-form-modal';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RestockFormModalComponent],
  templateUrl: './stock-list.html',
  styleUrl: './stock-list.scss'
})
export class StockListComponent implements OnInit {
  private stockService = inject(StockMaterialService);
  private fb = inject(FormBuilder);

  readonly materials = signal<StockMaterial[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showRestockModal = signal(false);
  readonly selectedMaterial = signal<StockMaterial | null>(null);
  readonly showCatalogModal = signal(false);
  readonly editingMaterial = signal<StockMaterial | null>(null);
  readonly savingCatalog = signal(false);
  readonly catalogError = signal<string | null>(null);

  readonly catalogForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    cantidad_actual: [0, [Validators.required, Validators.min(0)]],
    unidad: ['', [Validators.required, Validators.maxLength(50)]],
    umbral_minimo: [10, [Validators.required, Validators.min(0)]]
  });

  ngOnInit(): void {
    this.loadMaterials();
  }

  loadMaterials(): void {
    this.loading.set(true);
    this.error.set(null);

    this.stockService.list().subscribe({
      next: (result) => {
        this.materials.set(result.items);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.materials.set([]);
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  isLowStock(material: StockMaterial): boolean {
    return material.cantidad_actual <= LOW_STOCK_THRESHOLD;
  }

  getLowStockCount(): number {
    return this.materials().filter((m) => this.isLowStock(m)).length;
  }

  openRestockModal(material: StockMaterial): void {
    this.selectedMaterial.set(material);
    this.showRestockModal.set(true);
  }

  closeRestockModal(): void {
    this.showRestockModal.set(false);
    this.selectedMaterial.set(null);
  }

  onRestockSaved(): void {
    this.loadMaterials();
    this.closeRestockModal();
  }

  openCreateMaterialModal(): void {
    this.editingMaterial.set(null);
    this.catalogError.set(null);
    this.catalogForm.reset({
      nombre: '',
      cantidad_actual: 0,
      unidad: '',
      umbral_minimo: 10
    });
    this.showCatalogModal.set(true);
  }

  openEditMaterialModal(material: StockMaterial): void {
    this.editingMaterial.set(material);
    this.catalogError.set(null);
    this.catalogForm.reset({
      nombre: material.nombre,
      cantidad_actual: material.cantidad_actual,
      unidad: material.unidad,
      umbral_minimo: material.umbral_minimo ?? 10
    });
    this.showCatalogModal.set(true);
  }

  closeCatalogModal(): void {
    this.showCatalogModal.set(false);
    this.editingMaterial.set(null);
    this.catalogError.set(null);
  }

  saveCatalogMaterial(): void {
    if (this.catalogForm.invalid) {
      this.catalogForm.markAllAsTouched();
      return;
    }

    const formValue = this.catalogForm.getRawValue();
    this.savingCatalog.set(true);
    this.catalogError.set(null);

    const payload = {
      nombre: String(formValue.nombre).trim(),
      cantidad_actual: Number(formValue.cantidad_actual),
      unidad: String(formValue.unidad).trim(),
      umbral_minimo: Number(formValue.umbral_minimo)
    };

    const editing = this.editingMaterial();
    const request$ = editing
      ? this.stockService.update(editing.id, payload)
      : this.stockService.create(payload);

    request$.subscribe({
      next: () => {
        this.savingCatalog.set(false);
        this.closeCatalogModal();
        this.loadMaterials();
      },
      error: (err: unknown) => {
        this.savingCatalog.set(false);
        this.catalogError.set(this.getErrorMessage(err));
      }
    });
  }

  deleteMaterial(material: StockMaterial): void {
    if (!confirm(`¿Eliminar "${material.nombre}" del catálogo?`)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.stockService.delete(material.id).subscribe({
      next: () => this.loadMaterials(),
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        return 'Sesión expirada. Vuelve a iniciar sesión.';
      }
      if (err.status === 403) {
        return 'No tienes permisos para ver el inventario.';
      }
      if (err.status === 0) {
        return 'No hay conexión con el servidor. Verifica que el backend esté funcionando.';
      }
      return `Error del servidor (${err.status}). Intenta nuevamente.`;
    }
    return 'Error al cargar el inventario.';
  }
}
