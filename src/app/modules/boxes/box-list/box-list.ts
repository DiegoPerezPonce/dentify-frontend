import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoxService } from '../box.service';
import { Box } from '../models/box.models';
import { HttpErrorResponse } from '@angular/common/http';
import { BoxFormModalComponent } from '../box-form-modal/box-form-modal';

@Component({
  selector: 'app-box-list',
  standalone: true,
  imports: [CommonModule, BoxFormModalComponent],
  templateUrl: './box-list.html',
  styleUrl: './box-list.scss'
})
export class BoxListComponent implements OnInit {
  private boxService = inject(BoxService);

  readonly boxes = signal<Box[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showModal = signal(false);
  readonly selectedBox = signal<Box | null>(null);

  ngOnInit(): void {
    this.loadBoxes();
  }

  loadBoxes(): void {
    this.loading.set(true);
    this.error.set(null);

    this.boxService.list().subscribe({
      next: (result) => {
        this.boxes.set(result.items);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.boxes.set([]);
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  openCreateModal(): void {
    this.selectedBox.set(null);
    this.showModal.set(true);
  }

  openEditModal(box: Box): void {
    this.selectedBox.set(box);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedBox.set(null);
  }

  onBoxSaved(): void {
    this.loadBoxes();
    this.closeModal();
  }

  deleteBox(box: Box): void {
    if (!confirm(`¿Eliminar el gabinete "${box.nombre}"? Si tiene citas asociadas, el servidor puede rechazar el borrado.`)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.boxService.delete(box.id).subscribe({
      next: () => {
        this.loadBoxes();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  estadoClass(estado: string): string {
    const e = (estado || '').toLowerCase();
    if (e === 'disponible') return 'estado-disponible';
    if (e === 'mantenimiento' || e === 'fuera de servicio') return 'estado-mantenimiento';
    return 'estado-otro';
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        return 'Sesión expirada. Vuelve a iniciar sesión.';
      }
      if (err.status === 403) {
        return 'No tienes permisos para gestionar gabinetes.';
      }
      if (err.status === 0) {
        return 'No hay conexión con el servidor. Verifica que el backend esté funcionando.';
      }
      if (err.status === 400 || err.status === 404) {
        const message = err.error?.message;
        if (message && typeof message === 'string') {
          return message;
        }
      }
      if (err.status >= 500) {
        return 'No se pudo completar la operación (p. ej. el gabinete tiene citas asociadas). Revisa los datos e inténtalo de nuevo.';
      }
      return `Error del servidor (${err.status}). Intenta nuevamente.`;
    }
    return 'Error al cargar los gabinetes.';
  }
}
