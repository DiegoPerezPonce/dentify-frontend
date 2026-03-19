import { Routes } from '@angular/router';
import { LoginComponent } from './modules/auth/login/login'; 

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  // Si da error en './app.component', prueba con './app' 
  // o simplemente apunta a una ruta vacía por ahora:
  { path: 'dashboard', loadComponent: () => import('./app').then(m => m.App) }
];