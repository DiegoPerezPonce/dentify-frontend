import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { PedagogicalNoticeService } from '../../modules/notifications/pedagogical-notice.service';
import {
  formatSessionRemainingLabel,
  getSessionRemainingMs,
  ROLE_ADMIN
} from '../../core/utils/jwt-roles';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss'
})
export class AppShellComponent implements OnInit {
  protected auth = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private pedagogicalNoticeService = inject(PedagogicalNoticeService);

  /** Dispara recomputación del tiempo de sesión cada 30 s. */
  private readonly sessionTick = signal(0);

  readonly ROLE_ADMIN = ROLE_ADMIN;

  readonly sessionRemainingLine = computed(() => {
    this.sessionTick();
    return formatSessionRemainingLabel(this.auth.getToken());
  });

  readonly sessionRemainingUrgent = computed(() => {
    this.sessionTick();
    const ms = getSessionRemainingMs(this.auth.getToken());
    return ms != null && ms <= 5 * 60 * 1000;
  });

  /** Solo UI: oculta el bloque Administración sin cambiar permisos. */
  readonly adminNavCollapsed = signal(false);

  toggleAdminNav(): void {
    this.adminNavCollapsed.update((v) => !v);
  }

  /** Aviso pedagógico visible para alumnos (y admins); texto estático hasta API #36. */
  readonly showPedagogicalNotice = signal(true);
  readonly pedagogicalNoticeTitle = signal<string | null>(null);
  readonly pedagogicalNoticeBody = signal<string | null>(null);

  ngOnInit(): void {
    const id = window.setInterval(() => this.sessionTick.update((n) => n + 1), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(id));
    this.loadPedagogicalBanner();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  private loadPedagogicalBanner(): void {
    this.pedagogicalNoticeService.list(1, 1).subscribe({
      next: ({ items }) => {
        const first = items[0];
        this.pedagogicalNoticeTitle.set(first?.title ?? null);
        this.pedagogicalNoticeBody.set(first?.body ?? null);
      },
      error: () => {
        this.pedagogicalNoticeTitle.set(null);
        this.pedagogicalNoticeBody.set(null);
      }
    });
  }
}
