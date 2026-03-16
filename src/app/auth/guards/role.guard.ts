import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data?.['roles'] as string[];

  // If no roles are specified, allow access
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (authService.isAuthenticated() && authService.hasAnyRole(allowedRoles)) {
    return true;
  }

  // Redirect to unauthorized or login page
  if (authService.isAuthenticated()) {
    // If authenticated but lacks role, redirect to unauthorized (if exists) or home
    return router.parseUrl('/unauthorized');
  }

  return router.parseUrl('/auth/login');
};
