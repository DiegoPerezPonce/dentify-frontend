import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './modules/auth/login/login';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./app').then((m) => m.App)
  },
  // Raíz → login: la URL muestra /login sin pasar por /dashboard (mejor UX y mismo efecto si no hay token).
  { path: '', pathMatch: 'full', redirectTo: 'login' }
];