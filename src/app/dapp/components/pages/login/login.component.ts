import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ethers } from 'ethers';
import { WalletService } from '../../../service/wallet.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  mostrarModalLogin = false;
  isConnecting = false;
  connectingWallet = '';
  showSuccessMessage = false;
  
  constructor(
    private walletService: WalletService,
    private router: Router
  ) {
    // Clear any existing account data when login page loads
    this.walletService.logout();
  }

  async connectWithMetaMask() {
    this.isConnecting = true;
    this.connectingWallet = 'metamask';
    try {
      await this.walletService.connectWallet();
      this.showSuccessMessage = true;
      setTimeout(() => {
        this.showSuccessMessage = false;
        this.router.navigate(['/dashboard']);
      }, 2000);
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      alert('Error al conectar con MetaMask. Por favor, asegúrate de tener la extensión instalada.');
    } finally {
      this.isConnecting = false;
      this.connectingWallet = '';
    }
  }

  connectWithWalletConnect() {
    this.isConnecting = true;
    this.connectingWallet = 'walletconnect';
    setTimeout(() => {
      this.isConnecting = false;
      this.connectingWallet = '';
      alert('WalletConnect estará disponible próximamente. Por ahora, por favor usa MetaMask.');
    }, 1000);
  }

  connectWithCoinbase() {
    this.isConnecting = true;
    this.connectingWallet = 'coinbase';
    setTimeout(() => {
      this.isConnecting = false;
      this.connectingWallet = '';
      alert('Coinbase Wallet estará disponible próximamente. Por ahora, por favor usa MetaMask.');
    }, 1000);
  }

  abrirModalLogin() {
    this.mostrarModalLogin = true;
  }

  cerrarModalLogin() {
    this.mostrarModalLogin = false;
  }
}