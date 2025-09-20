import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';

@Injectable({
    providedIn: 'root',
})
export class AuthGuard implements CanActivate {

    constructor(private router: Router) { }

    canActivate(): boolean | UrlTree {
        const account = localStorage.getItem('account'); 

        if (account) {
            return true;
        }
        return this.router.parseUrl('/');
    }
}
