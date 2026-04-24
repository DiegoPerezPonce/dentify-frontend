import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { isJwtExpired } from '../utils/jwt-roles';

/** Rutas que requieren JWT guardado (cualquier rol). */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }
  if (isJwtExpired(auth.getToken())) {
    auth.logout();
    return router.createUrlTree(['/login'], { queryParams: { motivo: 'sesion-expirada' } });
  }
  return true;
};
