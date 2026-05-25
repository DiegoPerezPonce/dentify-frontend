import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth';
import { PedagogicalNoticeService } from '../../modules/notifications/pedagogical-notice.service';
import { AppIconComponent } from '../../shared/app-icon/app-icon.component';
import { LangSwitcherComponent } from '../../shared/lang-switcher/lang-switcher.component';
import { ThemeConfiguratorComponent } from '../../shared/theme-configurator/theme-configurator.component';
import { ThemeService } from '../../core/theme/theme.service';
import {
  getJwtThemeUserKey,
  getSessionRemainingMs,
  getSessionRemainingParts,
  ROLE_ADMIN,
  SessionRemainingParts
} from '../../core/utils/jwt-roles';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    AppIconComponent,
    ThemeConfiguratorComponent,
    LangSwitcherComponent
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss'
})
export class AppShellComponent implements OnInit {
  protected auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private pedagogicalNoticeService = inject(PedagogicalNoticeService);
  private translate = inject(TranslateService);

  /** Dispara recomputación del tiempo de sesión cada 30 s. */
  private readonly sessionTick = signal(0);

  /** Re-evalúa etiquetas de tiempo al cambiar idioma. */
  private readonly langRefresh = signal(0);

  readonly ROLE_ADMIN = ROLE_ADMIN;

  readonly hasDentistProfile = computed(() => this.auth.getDentistId() != null);

  readonly sessionParts = computed((): SessionRemainingParts | null => {
    this.sessionTick();
    this.langRefresh();
    const p = getSessionRemainingParts(this.auth.getToken());
    return p.kind === 'none' ? null : p;
  });

  readonly sessionRemainingUrgent = computed(() => {
    this.sessionTick();
    const ms = getSessionRemainingMs(this.auth.getToken());
    return ms != null && ms <= 5 * 60 * 1000;
  });

  /** Re-evalúa nombre/email del JWT junto con el tick de sesión. */
  readonly userDisplayName = computed(() => {
    this.sessionTick();
    this.langRefresh();
    const n = this.auth.getDisplayName()?.trim();
    return n || this.translate.instant('NAV.DEFAULT_USER');
  });

  readonly userEmail = computed(() => {
    this.sessionTick();
    this.langRefresh();
    const e = this.auth.getEmail()?.trim();
    return e || null;
  });

  readonly userInitials = computed(() => {
    this.sessionTick();
    this.langRefresh();
    const n = this.auth.getDisplayName()?.trim();
    if (!n) return '?';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  });

  /** Solo UI: oculta el bloque Administración sin cambiar permisos. */
  readonly adminNavCollapsed = signal(false);

  toggleAdminNav(): void {
    this.adminNavCollapsed.update((v) => !v);
  }

  /** Solo en /app/dashboard. */
  readonly isDashboardRoute = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.isDashboardUrl(this.router.url)),
      startWith(this.isDashboardUrl(this.router.url))
    ),
    { initialValue: this.isDashboardUrl(this.router.url) }
  );

  readonly pedagogicalNoticeTitle = signal<string | null>(null);
  readonly pedagogicalNoticeBody = signal<string | null>(null);

  constructor() {
    this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe(() => {
      this.langRefresh.update((n) => n + 1);
    });

    effect(() => {
      const lockBody =
        this.theme.config().menu_mode === 'overlay' && this.theme.overlayMenuOpen();
      document.body.style.overflow = lockBody ? 'hidden' : '';
    });

    effect(() => {
      if (!this.isDashboardRoute()) {
        this.theme.closePanel();
      }
    });

    this.destroyRef.onDestroy(() => {
      document.body.style.overflow = '';
    });
  }

  ngOnInit(): void {
    const userKey = getJwtThemeUserKey(this.auth.getToken());
    if (userKey) {
      this.theme.restoreUserSession(userKey);
    }

    const id = window.setInterval(() => this.sessionTick.update((n) => n + 1), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(id));
    this.loadPedagogicalBanner();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  private isDashboardUrl(url: string): boolean {
    return url.split('?')[0] === '/app/dashboard';
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
