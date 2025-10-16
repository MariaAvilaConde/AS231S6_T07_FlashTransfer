import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

declare global {
  interface Window {
    ethereum?: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // Verificar si estamos en el cliente (navegador)
    if (typeof window === 'undefined') {
      return false;
    }

    // Verificar si hay wallet conectado
    if (window.ethereum) {
      try {
        // Obtener cuentas conectadas
        return this.checkWalletConnection();
      } catch (error) {
        console.error('Error en AuthGuard:', error);
        this.router.navigate(['/login']);
        return false;
      }
    } else {
      console.warn('No hay wallet disponible');
      this.router.navigate(['/login']);
      return false;
    }
  }

  private async checkWalletConnection(): Promise<boolean | UrlTree> {
    try {
      // Solicitar cuentas conectadas
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });

      // Si hay cuentas conectadas, permitir acceso
      if (accounts && accounts.length > 0) {
        console.log('Wallet verificado, acceso permitido');
        return true;
      } else {
        console.warn('No hay cuentas conectadas');
        return this.router.createUrlTree(['/login']);
      }
    } catch (error) {
      console.error('Error verificando wallet:', error);
      return this.router.createUrlTree(['/login']);
    }
  }
}