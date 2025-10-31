import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, from, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

declare global {
  interface Window {
    ethereum?: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private isBrowser: boolean;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { 
    this.isBrowser = isPlatformBrowser(platformId);
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // Verificar si estamos en el cliente (navegador)
    if (!this.isBrowser) {
      return false;
    }

    // Verificar si hay wallet conectado
    if (window.ethereum) {
      try {
        // Obtener cuentas conectadas con timeout
        return from(this.checkWalletConnection()).pipe(
          timeout(5000), // 5 second timeout
          catchError((error) => {
            console.error('Error en AuthGuard:', error);
            return of(this.router.createUrlTree(['/login']));
          })
        );
      } catch (error) {
        console.error('Error en AuthGuard:', error);
        return this.router.createUrlTree(['/login']);
      }
    } else {
      console.warn('No hay wallet disponible');
      return this.router.createUrlTree(['/login']);
    }
  }

  private async checkWalletConnection(): Promise<boolean | UrlTree> {
    try {
      // Solicitar cuentas conectadas con timeout
      const accountsPromise = window.ethereum.request({
        method: 'eth_accounts',
      });

      // Add timeout to the promise
      const accounts = await Promise.race([
        accountsPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);

      // Si hay cuentas conectadas, permitir acceso
      if (accounts && accounts.length > 0) {
        console.log('Wallet verificado, acceso permitido');
        // Also check if account is stored in localStorage
        const storedAccount = localStorage.getItem('account');
        if (storedAccount && accounts[0] === storedAccount) {
          return true;
        } else {
          // Account mismatch, force logout
          localStorage.removeItem('account');
          return this.router.createUrlTree(['/login']);
        }
      } else {
        console.warn('No hay cuentas conectadas');
        // Clear stored account if no accounts connected
        localStorage.removeItem('account');
        return this.router.createUrlTree(['/login']);
      }
    } catch (error) {
      console.error('Error verificando wallet:', error);
      // Clear stored account on error
      localStorage.removeItem('account');
      return this.router.createUrlTree(['/login']);
    }
  }
}