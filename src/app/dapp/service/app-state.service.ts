import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Network } from './network.service';

// Interfaz para el estado global de la aplicación
export interface AppState {
  isConnected: boolean;
  walletAddress: string | null;
  currentNetwork: Network | null;
  isLoading: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  // Estado inicial
  private initialState: AppState = {
    isConnected: false,
    walletAddress: null,
    currentNetwork: null,
    isLoading: false
  };

  // BehaviorSubject para mantener el estado actual
  private appStateSubject = new BehaviorSubject<AppState>(this.initialState);
  public appState$ = this.appStateSubject.asObservable();

  constructor() {}

  // Actualizar el estado de conexión
  setConnectionStatus(isConnected: boolean, walletAddress: string | null = null) {
    const currentState = this.appStateSubject.value;
    this.appStateSubject.next({
      ...currentState,
      isConnected,
      walletAddress
    });
  }

  // Actualizar la red actual
  setCurrentNetwork(network: Network | null) {
    const currentState = this.appStateSubject.value;
    this.appStateSubject.next({
      ...currentState,
      currentNetwork: network
    });
  }

  // Actualizar el estado de carga
  setLoading(isLoading: boolean) {
    const currentState = this.appStateSubject.value;
    this.appStateSubject.next({
      ...currentState,
      isLoading
    });
  }

  // Obtener el estado actual
  getCurrentState(): AppState {
    return this.appStateSubject.value;
  }

  // Resetear el estado
  resetState() {
    this.appStateSubject.next(this.initialState);
  }
}