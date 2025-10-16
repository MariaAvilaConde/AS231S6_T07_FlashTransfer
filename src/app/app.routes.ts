import { Routes } from '@angular/router';
import { AuthGuard } from './utils/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Menu',
    loadComponent: () =>
      import('./dapp/components/pages/menu/menu.component').then(m => m.MenuComponent)
  },
  {
    path: 'login',
    title: 'Login',
    loadComponent: () =>
      import('./dapp/components/pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    title: 'Mi Wallet - Dashboard',
    loadComponent: () =>
      import('./dapp/components/pages/wallet/wallet.component').then(m => m.WalletComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'transaction',
    title: 'Enviar Transacción',
    loadComponent: () =>
      import('./dapp/components/pages/transaction/transaction.component').then(m => m.TransactionComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '',
  },
];