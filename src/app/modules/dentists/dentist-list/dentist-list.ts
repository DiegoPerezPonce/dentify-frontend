import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { DentistFormModalComponent } from '../dentist-form-modal/dentist-form-modal';
import { DentistService } from '../dentist.service';
import { Dentist } from '../models/dentist.models';
import { UserService } from '../../users/user.service';
import { User } from '../../users/models/user.models';

@Component({
  selector: 'app-dentist-list',
  standalone: true,
  imports: [CommonModule, DentistFormModalComponent],
  templateUrl: './dentist-list.html',
  styleUrl: './dentist-list.scss'
})
export class DentistListComponent implements OnInit {
  private userService = inject(UserService);
  private dentistService = inject(DentistService);

  readonly clinicalUsers = signal<User[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showModal = signal(false);
  readonly selectedDentist = signal<Dentist | null>(null);

  ngOnInit(): void {
    this.loadClinicalUsers();
  }

  loadClinicalUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userService.listClinicalProfiles().subscribe({
      next: (result) => {
        this.clinicalUsers.set(result.items);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.clinicalUsers.set([]);
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  openEditModal(user: User): void {
    const id = user.dentistId;
    if (id == null) {
      return;
    }
    this.loading.set(true);
    this.dentistService.getById(id).subscribe({
      next: (d) => {
        this.selectedDentist.set(d);
        this.showModal.set(true);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedDentist.set(null);
  }

  onDentistSaved(): void {
    this.loadClinicalUsers();
    this.closeModal();
  }

  deleteClinicalProfile(user: User): void {
    const id = user.dentistId;
    if (id == null) {
      return;
    }
    const name = this.getDentistFullName(user);
    if (!confirm(`¿Eliminar la ficha de odontólogo de "${name}"? La cuenta de usuario seguirá existiendo sin ficha clínica.`)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.dentistService.delete(id).subscribe({
      next: () => {
        this.loadClinicalUsers();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  getDentistFullName(user: User): string {
    const n = (user.dentistNombre ?? '').trim();
    const a = (user.dentistApellidos ?? '').trim();
    const joined = `${n} ${a}`.trim();
    return joined || user.nombre_usuario;
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
    return 'Error al cargar los datos.';
  }
}
