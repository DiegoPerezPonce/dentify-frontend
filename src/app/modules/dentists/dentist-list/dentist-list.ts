import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DentistService } from '../dentist.service';
import { Dentist } from '../models/dentist.models';
import { HttpErrorResponse } from '@angular/common/http';
import { DentistFormModalComponent } from '../dentist-form-modal/dentist-form-modal';

@Component({
  selector: 'app-dentist-list',
  standalone: true,
  imports: [CommonModule, DentistFormModalComponent],
  templateUrl: './dentist-list.html',
  styleUrl: './dentist-list.scss'
})
export class DentistListComponent implements OnInit {
  private dentistService = inject(DentistService);

  readonly dentists = signal<Dentist[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showModal = signal(false);
  readonly selectedDentist = signal<Dentist | null>(null);

  ngOnInit(): void {
    this.loadDentists();
  }

  loadDentists(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dentistService.list().subscribe({
      next: (result) => {
        this.dentists.set(result.items);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.dentists.set([]);
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  openCreateModal(): void {
    this.selectedDentist.set(null);
    this.showModal.set(true);
  }

  openEditModal(dentist: Dentist): void {
    this.selectedDentist.set(dentist);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedDentist.set(null);
  }

  onDentistSaved(): void {
    this.loadDentists();
    this.closeModal();
  }

  deleteDentist(dentist: Dentist): void {
    if (!confirm(`¿Estás seguro de que deseas eliminar al odontólogo "${dentist.nombre} ${dentist.apellidos}"?`)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.dentistService.delete(dentist.id).subscribe({
      next: () => {
        this.loadDentists();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  getFullName(dentist: Dentist): string {
    return `${dentist.nombre} ${dentist.apellidos}`;
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        return 'Sesión expirada. Vuelve a iniciar sesión.';
      }
      if (err.status === 403) {
        return 'No tienes permisos para gestionar odontólogos.';
      }
      if (err.status === 0) {
        return 'No hay conexión con el servidor. Verifica que el backend esté funcionando.';
      }
      return `Error del servidor (${err.status}). Intenta nuevamente.`;
    }
    return 'Error al cargar los odontólogos.';
  }
}
