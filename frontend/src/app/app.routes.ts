import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { gerenteGuard } from './core/guards/rol.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./shared/layout/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page/dashboard-page.component').then(
            (m) => m.DashboardPageComponent
          ),
      },
      {
        path: 'calendario',
        loadComponent: () =>
          import('./features/calendario/calendario-page.component').then(
            (m) => m.CalendarioPageComponent
          ),
      },
      {
        path: 'estaciones',
        canActivate: [gerenteGuard],
        loadComponent: () =>
          import('./features/estaciones/estaciones-page.component').then(
            (m) => m.EstacionesPageComponent
          ),
      },
      // Detalle de una inspección puntual (ruta fija "detalle" para no chocar con :clave)
      {
        path: 'inspecciones/detalle/:id',
        loadComponent: () =>
          import('./features/inspecciones/detalle/inspeccion-detalle.component').then(
            (m) => m.InspeccionDetalleComponent
          ),
      },
      // Un módulo por normativa: /inspecciones/nom-005, /inspecciones/anexos-21-22, /inspecciones/nom-016
      {
        path: 'inspecciones/:clave',
        loadComponent: () =>
          import('./features/inspecciones/listado/inspecciones-page.component').then(
            (m) => m.InspeccionesPageComponent
          ),
      },
      {
        path: 'usuarios',
        canActivate: [gerenteGuard],
        loadComponent: () =>
          import('./features/usuarios/usuarios-page.component').then(
            (m) => m.UsuariosPageComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
