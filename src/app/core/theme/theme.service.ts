import { inject, Injectable, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { MePreferencesService } from '../services/me-preferences.service';
import {
  DEFAULT_THEME_CONFIG,
  THEME_PRESET_OPTIONS,
  THEME_PRIMARY_OPTIONS,
  THEME_SURFACE_OPTIONS,
  ThemeConfig,
  ThemeMenuMode,
  ThemePreset,
  ThemePrimary,
  ThemeScheme,
  ThemeSurface
} from './theme.models';

const CACHE_PREFIX = 'dentify_theme_';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private mePrefs = inject(MePreferencesService);

  readonly config = signal<ThemeConfig>({ ...DEFAULT_THEME_CONFIG });
  readonly panelOpen = signal(false);
  readonly overlayMenuOpen = signal(false);
  readonly loading = signal(false);

  /** Tras login: aplica caché al instante y sincroniza con la API. */
  restoreUserSession(userKey: string): void {
    this.setCacheUserKey(userKey);
    this.bootstrapFromCache(userKey);
    this.loadFromApi(userKey);
  }

  bootstrapFromCache(userKey: string): void {
    const cached = this.readCache(userKey);
    if (cached) {
      this.apply(cached);
    }
  }

  loadFromApi(userKey: string): void {
    const cached = this.readCache(userKey);
    this.loading.set(true);
    this.mePrefs
      .getTheme()
      .pipe(
        tap((cfg) => {
          const fromApi = this.normalize(cfg);
          const merged = this.mergeWithCache(fromApi, cached);
          this.writeCache(userKey, merged);
          this.apply(merged);
          if (cached?.scheme === 'dark' && fromApi.scheme === 'light') {
            this.mePrefs.patchTheme(merged).subscribe({ error: () => undefined });
          }
          this.loading.set(false);
        }),
        catchError(() => {
          if (cached) {
            this.apply(cached);
          }
          this.loading.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  toggleScheme(): void {
    const next: ThemeScheme = this.config().scheme === 'dark' ? 'light' : 'dark';
    this.update({ scheme: next });
  }

  setPrimary(primary: ThemePrimary): void {
    this.update({ primary });
  }

  setSurface(surface: ThemeSurface): void {
    this.update({ surface });
  }

  setPreset(preset: ThemePreset): void {
    this.update({ preset });
  }

  setMenuMode(menu_mode: ThemeMenuMode): void {
    this.update({ menu_mode });
    if (menu_mode === 'static') {
      this.overlayMenuOpen.set(false);
    }
  }

  togglePanel(): void {
    this.panelOpen.update((v) => !v);
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  toggleOverlayMenu(): void {
    this.overlayMenuOpen.update((v) => !v);
  }

  closeOverlayMenu(): void {
    this.overlayMenuOpen.set(false);
  }

  private update(partial: Partial<ThemeConfig>): void {
    const next = this.normalize({ ...this.config(), ...partial });
    this.apply(next);
    this.persist(next);
  }

  /** Login público: documento en tema claro (no persiste preferencias del usuario). */
  applyLoginAppearance(): void {
    this.applyDocument(DEFAULT_THEME_CONFIG);
  }

  private apply(cfg: ThemeConfig): void {
    this.applyDocument(this.normalize(cfg));
  }

  private applyDocument(cfg: ThemeConfig): void {
    this.config.set(cfg);
    const html = document.documentElement;
    html.setAttribute('data-theme', cfg.scheme);
    html.setAttribute('data-primary', cfg.primary);
    html.setAttribute('data-surface', cfg.surface);
    html.setAttribute('data-preset', cfg.preset);
    html.setAttribute('data-menu-mode', cfg.menu_mode);
    html.style.colorScheme = cfg.scheme;
  }

  private persist(cfg: ThemeConfig): void {
    const key = this.currentCacheKey();
    if (key) {
      this.writeCache(key, cfg);
    }
    this.mePrefs.patchTheme(cfg).subscribe({
      error: () => undefined
    });
  }

  /** Burdeos u otros tonos intensos → arena cálida (más adecuado para clínica). */
  private normalizeSurface(value: unknown): ThemeSurface {
    const s = typeof value === 'string' ? value.toLowerCase().trim() : '';
    if (s === 'burgundy') {
      return 'sand';
    }
    return THEME_SURFACE_OPTIONS.includes(s as ThemeSurface)
      ? (s as ThemeSurface)
      : DEFAULT_THEME_CONFIG.surface;
  }

  /**
   * Si el usuario tenía oscuro en localStorage pero la API aún devuelve light (p. ej. PATCH fallido),
   * conservamos la preferencia local hasta que el servidor la persista.
   */
  private mergeWithCache(fromApi: ThemeConfig, cached: ThemeConfig | null): ThemeConfig {
    if (!cached) {
      return fromApi;
    }
    if (cached.scheme === 'dark' && fromApi.scheme === 'light') {
      return {
        ...fromApi,
        scheme: cached.scheme,
        primary: cached.primary,
        surface: cached.surface,
        preset: cached.preset,
        menu_mode: cached.menu_mode
      };
    }
    return fromApi;
  }

  private normalize(raw: Partial<ThemeConfig> | null | undefined): ThemeConfig {
    const base = { ...DEFAULT_THEME_CONFIG };
    if (!raw) return base;
    return {
      scheme: raw.scheme === 'dark' ? 'dark' : 'light',
      primary: THEME_PRIMARY_OPTIONS.includes(raw.primary as ThemePrimary)
        ? (raw.primary as ThemePrimary)
        : base.primary,
      surface: this.normalizeSurface(raw.surface),
      preset: THEME_PRESET_OPTIONS.includes(raw.preset as ThemePreset)
        ? (raw.preset as ThemePreset)
        : base.preset,
      menu_mode: raw.menu_mode === 'overlay' ? 'overlay' : 'static'
    };
  }

  private currentCacheKey(): string | null {
    return sessionStorage.getItem('dentify_theme_user_key');
  }

  setCacheUserKey(userKey: string): void {
    sessionStorage.setItem('dentify_theme_user_key', userKey);
  }

  private readCache(userKey: string): ThemeConfig | null {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + userKey);
      if (!raw) return null;
      return this.normalize(JSON.parse(raw) as ThemeConfig);
    } catch {
      return null;
    }
  }

  private writeCache(userKey: string, cfg: ThemeConfig): void {
    localStorage.setItem(CACHE_PREFIX + userKey, JSON.stringify(cfg));
  }
}
