import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { ROLE_ADMIN } from '../../core/utils/jwt-roles';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss'
})
export class AppShellComponent {
  protected auth = inject(AuthService);
  private router = inject(Router);

  readonly ROLE_ADMIN = ROLE_ADMIN;

  /** Solo UI: oculta el bloque Administración sin cambiar permisos. */
  readonly adminNavCollapsed = signal(false);

  toggleAdminNav(): void {
    this.adminNavCollapsed.update((v) => !v);
  }

  /** Aviso pedagógico visible para alumnos (y admins); texto estático hasta API #36. */
  readonly showPedagogicalNotice = signal(true);

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
