import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export const LANG_STORAGE_KEY = 'dentify_lang';

/** Idiomas soportados (issue #20). */
export const SUPPORTED_LANGS = ['es', 'ca', 'en'] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

export function isAppLang(code: string): code is AppLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(code);
}

/** Atributo html[lang]. */
export function documentLangHtml(code: AppLang): string {
  return code === 'ca' ? 'ca' : code === 'en' ? 'en' : 'es';
}

export function resolveInitialLang(): AppLang {
  if (typeof localStorage === 'undefined') return 'es';
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved && isAppLang(saved)) return saved;
  try {
    const n = (navigator.language || '').toLowerCase();
    if (n.startsWith('ca')) return 'ca';
    if (n.startsWith('en')) return 'en';
    return 'es';
  } catch {
    return 'es';
  }
}

/** Carga traducciones antes del primer pantallazo (shell / login). */
export function translateAppInitializerFactory(translate: TranslateService): () => Promise<void> {
  return () => {
    translate.addLangs([...SUPPORTED_LANGS]);
    translate.setFallbackLang('es');

    const lang = resolveInitialLang();
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.documentElement.lang = documentLangHtml(lang);

    return firstValueFrom(translate.use(lang)).then(() => undefined);
  };
}
