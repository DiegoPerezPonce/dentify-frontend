import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../user.service';
import { User, AVAILABLE_ROLES } from '../models/user.models';
import { HttpErrorResponse } from '@angular/common/http';
import { UserFormModalComponent } from '../user-form-modal/user-form-modal';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, UserFormModalComponent],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss'
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);

  readonly users = signal<User[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showModal = signal(false);
  readonly selectedUser = signal<User | null>(null);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userService.list().subscribe({
      next: (result) => {
        this.users.set(result.items);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.users.set([]);
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  openCreateModal(): void {
    this.selectedUser.set(null);
    this.showModal.set(true);
  }

  openEditModal(user: User): void {
    this.selectedUser.set(user);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedUser.set(null);
  }

  onUserSaved(): void {
    this.loadUsers();
    this.closeModal();
  }

  deleteUser(user: User): void {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario "${user.nombre_usuario}"?`)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.userService.delete(user.id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  getRoleLabel(roleValue: string): string {
    const role = AVAILABLE_ROLES.find(r => r.value === roleValue);
    return role ? role.label : roleValue;
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        return 'Sesión expirada. Vuelve a iniciar sesión.';
      }
      if (err.status === 403) {
        return 'No tienes permisos para gestionar usuarios.';
      }
      if (err.status === 0) {
        return 'No hay conexión con el servidor. Verifica que el backend esté funcionando.';
      }
      return `Error del servidor (${err.status}). Intenta nuevamente.`;
    }
    return 'Error al cargar los usuarios.';
  }
}
