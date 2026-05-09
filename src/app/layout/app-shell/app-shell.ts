import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth';
import { documentLangHtml, isAppLang, LANG_STORAGE_KEY } from '../../core/i18n/translate-app.initializer';
import { PedagogicalNoticeService } from '../../modules/notifications/pedagogical-notice.service';
import { getSessionRemainingMs, getSessionRemainingParts, ROLE_ADMIN, SessionRemainingParts } from '../../core/utils/jwt-roles';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss'
})
export class AppShellComponent implements OnInit {
  protected auth = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private pedagogicalNoticeService = inject(PedagogicalNoticeService);
  private translate = inject(TranslateService);

  /** Dispara recomputación del tiempo de sesión cada 30 s. */
  private readonly sessionTick = signal(0);

  /** Re-evalúa etiquetas de tiempo al cambiar idioma. */
  private readonly langRefresh = signal(0);

  readonly ROLE_ADMIN = ROLE_ADMIN;

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

  /** Solo UI: oculta el bloque Administración sin cambiar permisos. */
  readonly adminNavCollapsed = signal(false);

  readonly currentLang = signal(this.translate.currentLang || 'es');

  toggleAdminNav(): void {
    this.adminNavCollapsed.update((v) => !v);
  }

  setLang(code: string): void {
    if (!isAppLang(code)) return;
    localStorage.setItem(LANG_STORAGE_KEY, code);
    document.documentElement.lang = documentLangHtml(code);
    void this.translate.use(code);
  }

  /** Aviso pedagógico visible para alumnos (y admins). */
  readonly showPedagogicalNotice = signal(true);
  readonly pedagogicalNoticeTitle = signal<string | null>(null);
  readonly pedagogicalNoticeBody = signal<string | null>(null);

  constructor() {
    this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe((ev) => {
      this.currentLang.set(ev.lang);
      this.langRefresh.update((n) => n + 1);
    });
  }

  ngOnInit(): void {
    this.currentLang.set(this.translate.currentLang || 'es');

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
