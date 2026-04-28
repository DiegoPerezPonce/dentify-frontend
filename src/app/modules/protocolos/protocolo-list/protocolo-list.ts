import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProtocoloService } from '../protocolo.service';
import { ProtocoloTratamiento } from '../models/protocolo.models';
import { HttpErrorResponse } from '@angular/common/http';
import { ProtocoloFormModalComponent } from '../protocolo-form-modal/protocolo-form-modal';

@Component({
  selector: 'app-protocolo-list',
  standalone: true,
  imports: [CommonModule, ProtocoloFormModalComponent],
  templateUrl: './protocolo-list.html',
  styleUrl: './protocolo-list.scss'
})
export class ProtocoloListComponent implements OnInit {
  private protocoloService = inject(ProtocoloService);

  readonly protocolos = signal<ProtocoloTratamiento[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showModal = signal(false);
  readonly selectedProtocolo = signal<ProtocoloTratamiento | null>(null);

  ngOnInit(): void {
    this.loadProtocolos();
  }

  loadProtocolos(): void {
    this.loading.set(true);
    this.error.set(null);

    this.protocoloService.list().subscribe({
      next: (result) => {
        this.protocolos.set(result.items);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.protocolos.set([]);
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  openCreateModal(): void {
    this.selectedProtocolo.set(null);
    this.showModal.set(true);
  }

  openEditModal(p: ProtocoloTratamiento): void {
    this.selectedProtocolo.set(p);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedProtocolo.set(null);
  }

  onSaved(): void {
    this.loadProtocolos();
    this.closeModal();
  }

  deleteProtocolo(p: ProtocoloTratamiento): void {
    if (!confirm(`¿Eliminar el paso de protocolo para "${p.nombre_tratamiento}"?`)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.protocoloService.delete(p.id).subscribe({
      next: () => this.loadProtocolos(),
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  materialLabel(p: ProtocoloTratamiento): string {
    const m = p.material;
    if (!m) return '—';
    return `${m.nombre} (${m.cantidad_actual} ${m.unidad} en stock)`;
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        return 'Sesión expirada. Vuelve a iniciar sesión.';
      }
      if (err.status === 403) {
        return 'No tienes permisos para gestionar protocolos.';
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
      return `Error del servidor (${err.status}). Intenta nuevamente.`;
    }
    return 'Error al cargar los protocolos.';
  }
}
