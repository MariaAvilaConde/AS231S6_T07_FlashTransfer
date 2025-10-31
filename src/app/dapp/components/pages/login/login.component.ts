import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ethers } from 'ethers';
import { WalletService } from '../../../service/wallet.service';
import { AppStateService } from '../../../service/app-state.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  mostrarModalLogin = false;
  isLoading = false;
  errorMessage = '';
  private isBrowser: boolean;

  constructor(
    private walletService: WalletService,
    private appStateService: AppStateService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    // Clear any existing account data when login page loads
    this.walletService.logout();
    this.appStateService.resetState();
  }

  ngOnInit() {
    // Check if wallet is already connected
    this.checkExistingConnection();
  }

  async checkExistingConnection() {
    // Only run in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_accounts'
        });
        
        if (accounts && accounts.length > 0) {
          // Already connected, update state and navigate to dashboard
          this.appStateService.setConnectionStatus(true, accounts[0]);
          this.router.navigate(['/dashboard']);
        }
      } catch (error) {
        console.error('Error checking existing connection:', error);
      }
    }
  }

  async connectWithMetaMask() {
    // Only run in browser environment
    if (!this.isBrowser) {
      this.errorMessage = 'No se puede conectar la wallet en este entorno';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      const account = await this.walletService.connectWallet();
      this.appStateService.setConnectionStatus(true, account);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('Error connecting to MetaMask:', error);
      this.errorMessage = error.message || 'Error al conectar con MetaMask';
      
      // Show user-friendly error messages
      if (error.code === 4001) {
        this.errorMessage = 'Conexión rechazada por el usuario';
      } else if (error.code === -32002) {
        this.errorMessage = 'Ya hay una solicitud de conexión pendiente. Por favor revisa tu MetaMask.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  abrirModalLogin() {
    this.mostrarModalLogin = true;
    this.errorMessage = ''; // Clear any previous errors
  }

  cerrarModalLogin() {
    this.mostrarModalLogin = false;
    this.errorMessage = ''; // Clear any errors
  }
}