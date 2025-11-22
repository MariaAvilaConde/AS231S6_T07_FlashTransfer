import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';

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
  ): boolean | UrlTree {

    // Validar que estamos en el navegador
    if (!this.isBrowser) {
      return this.router.createUrlTree(['/login']);
    }

    // Si no existe MetaMask o proveedor Web3 → bloquear
    if (!window.ethereum) {
      console.warn('No hay wallet instalada');
      return this.router.createUrlTree(['/login']);
    }

    // Leer dirección guardada
    const savedAccount = localStorage.getItem('account');

    // Si existe una cuenta guardada → permitir
    if (savedAccount) {
      return true;
    }

    // Si no hay cuenta → redirigir a login
    return this.router.createUrlTree(['/login']);
  }
}
