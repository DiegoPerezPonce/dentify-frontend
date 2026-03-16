import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { RegisterComponent } from './auth/register/register';
import { authGuard } from './auth/guards/auth.guard';
import { roleGuard } from './auth/guards/role.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { 
    path: 'admin', 
    loadComponent: () => import('./app').then(m => m.App), // Example protected component
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./app').then(m => m.App), // Example protected component
    canActivate: [authGuard]
  },
  { path: 'unauthorized', loadComponent: () => import('./app').then(m => m.App) }, // Placeholder
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];

