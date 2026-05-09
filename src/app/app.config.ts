import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { jwtInterceptor } from './core/interceptors/jwt-interceptor';
import { translateAppInitializerFactory } from './core/i18n/translate-app.initializer';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    provideHttpClient(withInterceptors([jwtInterceptor])),

    ...provideTranslateService({
      fallbackLang: 'es',
      lang: 'es'
    }),
    ...provideTranslateHttpLoader({ prefix: '/assets/i18n/', suffix: '.json', enforceLoading: false }),

    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: translateAppInitializerFactory,
      deps: [TranslateService]
    }
  ]
};