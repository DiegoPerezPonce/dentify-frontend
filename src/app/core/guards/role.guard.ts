import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * `data.roles`: roles requeridos.
 * `data.rolesMatch`: `'any'` (defecto) al menos uno; `'all'` todos.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required = route.data['roles'] as string[] | undefined;
  if (!required?.length) {
    return true;
  }
  const match = (route.data['rolesMatch'] as 'all' | 'any' | undefined) ?? 'any';
  const userRoles = auth.getRoles();
  const ok =
    match === 'all'
      ? required.every((r) => userRoles.includes(r))
      : required.some((r) => userRoles.includes(r));
  if (ok) return true;
  return router.createUrlTree(['/app/forbidden']);
};
