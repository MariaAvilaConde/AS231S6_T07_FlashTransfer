import { Routes } from '@angular/router';
import { AuthGuard } from '../app/utils/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Login',
    loadComponent: () =>
      import('../app/dapp/components/pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'Dashboard',
    title: 'Dashboard General',
    loadComponent: () =>
      import('../app/dapp/components/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: 'Dashboard',
  },
];
