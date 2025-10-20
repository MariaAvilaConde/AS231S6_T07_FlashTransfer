import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withPreloading } from '@angular/router';
import { routes } from './app.routes';
import { PreloadAllModules } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideRouter(routes, withPreloading(PreloadAllModules))
  ]
};