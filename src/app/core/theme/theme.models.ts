export type ThemeScheme = 'light' | 'dark';
export type ThemePrimary =
  | 'cyan'
  | 'teal'
  | 'emerald'
  | 'lime'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'sky'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'pink'
  | 'red';
export type ThemeSurface =
  | 'slate'
  | 'zinc'
  | 'neutral'
  | 'stone'
  | 'gray'
  | 'clinical'
  | 'navy'
  | 'ocean'
  | 'forest'
  | 'plum'
  | 'arctic'
  | 'mint'
  | 'denim'
  | 'sage'
  | 'mauve'
  | 'taupe'
  | 'sand'
  | 'burgundy';
export type ThemePreset = 'aura' | 'lara' | 'nora';
export type ThemeMenuMode = 'static' | 'overlay';

export interface ThemeConfig {
  scheme: ThemeScheme;
  primary: ThemePrimary;
  surface: ThemeSurface;
  preset: ThemePreset;
  menu_mode: ThemeMenuMode;
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  scheme: 'light',
  primary: 'cyan',
  surface: 'slate',
  preset: 'aura',
  menu_mode: 'static'
};

export const THEME_PRIMARY_OPTIONS: ThemePrimary[] = [
  'cyan',
  'teal',
  'emerald',
  'lime',
  'orange',
  'amber',
  'yellow',
  'sky',
  'indigo',
  'violet',
  'purple',
  'pink',
  'red'
];

/** Selector curado: fondos con identidad clara (clínico = teal profundo tipo referencia). */
export const THEME_SURFACE_OPTIONS: ThemeSurface[] = [
  'clinical',
  'slate',
  'navy',
  'ocean',
  'forest',
  'plum',
  'arctic',
  'mint',
  'denim',
  'sage',
  'mauve',
  'taupe',
  'sand'
];

export const THEME_PRESET_OPTIONS: ThemePreset[] = ['aura', 'lara', 'nora'];
