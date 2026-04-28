import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ROLE_ADMIN, ROLE_USER } from './core/utils/jwt-roles';
import { LoginComponent } from './modules/auth/login/login';

/** Rutas clínicas + compartidas: al menos uno (admin hereda usuario). */
const clinicalOrAdmin = {
  roles: [ROLE_USER, ROLE_ADMIN],
  rolesMatch: 'any' as const
};

/** Solo administración. */
const adminOnly = {
  roles: [ROLE_ADMIN],
  rolesMatch: 'any' as const
};

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', redirectTo: 'app/dashboard', pathMatch: 'full' },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell/app-shell').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        canActivate: [roleGuard],
        data: { ...clinicalOrAdmin, pageTitle: 'Inicio' },
        loadComponent: () => import('./pages/home-dashboard/home-dashboard').then((m) => m.HomeDashboardComponent)
      },
      {
        path: 'pacientes',
        canActivate: [roleGuard],
        data: { ...clinicalOrAdmin, pageTitle: 'Gestión de pacientes' },
        loadComponent: () =>
          import('./modules/patients/patient-list/patient-list').then((m) => m.PatientListComponent)
      },
      {
        path: 'pacientes/:id',
        canActivate: [roleGuard],
        data: { ...clinicalOrAdmin, pageTitle: 'Paciente' },
        loadComponent: () =>
          import('./modules/patients/patient-form/patient-form').then((m) => m.PatientFormComponent)
      },
      {
        path: 'pacientes/:id/historial',
        canActivate: [roleGuard],
        data: { ...clinicalOrAdmin, pageTitle: 'Historial clínico' },
        loadComponent: () =>
          import('./modules/patients/medical-history/medical-history').then((m) => m.MedicalHistoryComponent)
      },
      {
        path: 'pacientes/:id/primera-visita',
        canActivate: [roleGuard],
        data: { ...clinicalOrAdmin, pageTitle: 'Primera visita' },
        loadComponent: () =>
          import('./modules/patients/first-visit-form/first-visit-form').then((m) => m.FirstVisitFormComponent)
      },
      {
        path: 'pacientes/:id/odontograma',
        canActivate: [roleGuard],
        data: { ...clinicalOrAdmin, pageTitle: 'Odontograma' },
        loadComponent: () =>
          import('./modules/patients/odontograma-interactive/odontograma-interactive').then((m) => m.OdontogramaInteractiveComponent)
      },
      {
        path: 'pacientes/:id/radiografias',
        canActivate: [roleGuard],
        data: { ...clinicalOrAdmin, pageTitle: 'Radiografías' },
        loadComponent: () =>
          import('./modules/patients/xray-gallery/xray-gallery').then((m) => m.XrayGalleryComponent)
      },
      {
        path: 'agenda',
        canActivate: [roleGuard],
        data: {
          ...clinicalOrAdmin,
          pageTitle: 'Agenda y citas',
          hint: 'Issue #11: calendario FullCalendar implementado. Issues #12–#13 pendientes: gestión completa de citas y filtros.'
        },
        loadComponent: () =>
          import('./modules/appointments/appointment-calendar/appointment-calendar').then(
            (m) => m.AppointmentCalendarComponent
          )
      },
      {
        path: 'radiografias',
        canActivate: [roleGuard],
        data: {
          ...clinicalOrAdmin,
          pageTitle: 'Radiografías',
          hint: 'Issue #10: visor y carga de imágenes.'
        },
        loadComponent: () =>
          import('./pages/placeholder-route/placeholder-route').then((m) => m.PlaceholderRouteComponent)
      },
      {
        path: 'asistente',
        canActivate: [roleGuard],
        data: {
          ...clinicalOrAdmin,
          pageTitle: 'Asistente virtual',
          hint: 'Issue #19: chatbot / IA.'
        },
        loadComponent: () =>
          import('./pages/placeholder-route/placeholder-route').then((m) => m.PlaceholderRouteComponent)
      },
      {
        path: 'pagos',
        canActivate: [roleGuard],
        data: {
          ...clinicalOrAdmin,
          pageTitle: 'Pagos y facturación',
          hint: 'Issue #26: módulo accesible para ROLE_USER y ROLE_ADMIN; reglas finas en API.'
        },
        loadComponent: () =>
          import('./pages/placeholder-route/placeholder-route').then((m) => m.PlaceholderRouteComponent)
      },
      {
        path: 'admin/odontologos',
        canActivate: [roleGuard],
        data: {
          ...adminOnly,
          pageTitle: 'Gestión de odontólogos',
          hint: 'Issue #16: CRUD personal clínico (solo ROLE_ADMIN).'
        },
        loadComponent: () =>
          import('./modules/dentists/dentist-list/dentist-list').then((m) => m.DentistListComponent)
      },
      {
        path: 'admin/boxes',
        canActivate: [roleGuard],
        data: { ...adminOnly, pageTitle: 'Gestión de boxes', hint: 'Issue #17.' },
        loadComponent: () =>
          import('./modules/boxes/box-list/box-list').then((m) => m.BoxListComponent)
      },
      {
        path: 'admin/stock',
        canActivate: [roleGuard],
        data: { ...adminOnly, pageTitle: 'Gestión de stock', hint: 'Issue #14: Inventario y recepciones.' },
        loadComponent: () => import('./modules/stock/stock-list/stock-list').then((m) => m.StockListComponent)
      },
      {
        path: 'admin/protocolos',
        canActivate: [roleGuard],
        data: { ...adminOnly, pageTitle: 'Protocolos de tratamiento', hint: 'Issue #18.' },
        loadComponent: () =>
          import('./modules/protocolos/protocolo-list/protocolo-list').then((m) => m.ProtocoloListComponent)
      },
      {
        path: 'admin/usuarios',
        canActivate: [roleGuard],
        data: { ...adminOnly, pageTitle: 'Usuarios y roles', hint: 'Issue #15: CRUD usuarios (solo admin).' },
        loadComponent: () => import('./modules/users/user-list/user-list').then((m) => m.UserListComponent)
      },
      {
        path: 'forbidden',
        loadComponent: () =>
          import('./pages/forbidden-route/forbidden-route').then((m) => m.ForbiddenRouteComponent)
      }
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' }
];
