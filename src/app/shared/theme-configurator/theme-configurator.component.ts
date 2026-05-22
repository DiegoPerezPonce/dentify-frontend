import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeService } from '../../core/theme/theme.service';
import {
  THEME_PRESET_OPTIONS,
  THEME_PRIMARY_OPTIONS,
  THEME_SURFACE_OPTIONS,
  ThemePreset,
  ThemePrimary,
  ThemeSurface
} from '../../core/theme/theme.models';

const PRIMARY_HEX: Record<ThemePrimary, string> = {
  cyan: '#06b6d4',
  teal: '#14b8a6',
  emerald: '#10b981',
  lime: '#84cc16',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  sky: '#0ea5e9',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  pink: '#ec4899',
  red: '#ef4444'
};

/** Vista previa: claro = fondo; oscuro = degradado shell + barra lateral. */
const SURFACE_PREVIEW: Record<
  ThemeSurface,
  { light: string; darkShell: string; darkSidebar: string }
> = {
  clinical: { light: '#b8e6e8', darkShell: '#002428', darkSidebar: '#003842' },
  slate: { light: '#e2e8f0', darkShell: '#1e293b', darkSidebar: '#273449' },
  zinc: { light: '#f4f4f5', darkShell: '#2a2a2e', darkSidebar: '#333338' },
  neutral: { light: '#f5f5f5', darkShell: '#2c2c2c', darkSidebar: '#353535' },
  stone: { light: '#f5f5f4', darkShell: '#2e2c2a', darkSidebar: '#383532' },
  gray: { light: '#f3f4f6', darkShell: '#2b313d', darkSidebar: '#343b49' },
  navy: { light: '#dbeafe', darkShell: '#0f1d3d', darkSidebar: '#152a55' },
  ocean: { light: '#a7f3f0', darkShell: '#003a3f', darkSidebar: '#005662' },
  forest: { light: '#bbf7d0', darkShell: '#0f3320', darkSidebar: '#16402a' },
  plum: { light: '#e9d5ff', darkShell: '#2a1840', darkSidebar: '#352052' },
  arctic: { light: '#bae6fd', darkShell: '#0c2d3d', darkSidebar: '#123a4f' },
  mint: { light: '#a7f3d0', darkShell: '#0f3d2e', darkSidebar: '#164d3b' },
  denim: { light: '#bfdbfe', darkShell: '#12264a', darkSidebar: '#18305c' },
  sage: { light: '#d9f99d', darkShell: '#1f3318', darkSidebar: '#284220' },
  mauve: { light: '#f5d0fe', darkShell: '#3a1f35', darkSidebar: '#472842' },
  taupe: { light: '#e7e5e4', darkShell: '#2f2822', darkSidebar: '#3a322b' },
  sand: { light: '#fde68a', darkShell: '#3d2f1a', darkSidebar: '#4a3a22' },
  burgundy: { light: '#f8f2e9', darkShell: '#3d3228', darkSidebar: '#4a3c30' }
};

@Component({
  selector: 'app-theme-configurator',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './theme-configurator.component.html',
  styleUrl: './theme-configurator.component.scss'
})
export class ThemeConfiguratorComponent {
  readonly theme = inject(ThemeService);

  readonly primaryOptions = THEME_PRIMARY_OPTIONS;
  readonly surfaceOptions = THEME_SURFACE_OPTIONS;
  readonly presetOptions = THEME_PRESET_OPTIONS;

  swatchPrimary(key: ThemePrimary): string {
    return PRIMARY_HEX[key];
  }

  swatchSurface(key: ThemeSurface): string {
    const preview = SURFACE_PREVIEW[key];
    if (this.theme.config().scheme === 'dark') {
      return `linear-gradient(135deg, ${preview.darkShell} 48%, ${preview.darkSidebar} 52%)`;
    }
    return preview.light;
  }

  surfaceLabelKey(key: ThemeSurface): string {
    return `THEME.SURFACE_${key.toUpperCase()}`;
  }

  isPrimaryActive(key: ThemePrimary): boolean {
    return this.theme.config().primary === key;
  }

  isSurfaceActive(key: ThemeSurface): boolean {
    return this.theme.config().surface === key;
  }

  isPresetActive(key: ThemePreset): boolean {
    return this.theme.config().preset === key;
  }

  isMenuStatic(): boolean {
    return this.theme.config().menu_mode === 'static';
  }
}
