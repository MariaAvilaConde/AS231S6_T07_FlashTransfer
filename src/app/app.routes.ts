import { Routes } from '@angular/router';
import { AuthGuard } from '../app/utils/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Menu',
    loadComponent: () =>
      import('../app/dapp/components/pages/menu/menu.component').then(m => m.MenuComponent)
  },
  {
    path: 'login',
    title: 'Login',
    loadComponent: () =>
      import('../app/dapp/components/pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    title: 'Mi Wallet - Dashboard',
    loadComponent: () =>
      import('../app/dapp/components/pages/wallet/wallet.component').then(m => m.WalletComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '',
  },
];