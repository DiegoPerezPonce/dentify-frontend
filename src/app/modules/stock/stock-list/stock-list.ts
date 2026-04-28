import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockMaterialService } from '../stock-material.service';
import { StockMaterial, LOW_STOCK_THRESHOLD } from '../models/stock-material.models';
import { HttpErrorResponse } from '@angular/common/http';
import { RestockFormModalComponent } from '../restock-form-modal/restock-form-modal';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [CommonModule, RestockFormModalComponent],
  templateUrl: './stock-list.html',
  styleUrl: './stock-list.scss'
})
export class StockListComponent implements OnInit {
  private stockService = inject(StockMaterialService);

  readonly materials = signal<StockMaterial[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showRestockModal = signal(false);
  readonly selectedMaterial = signal<StockMaterial | null>(null);

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
