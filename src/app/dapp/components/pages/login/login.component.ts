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
  constructor(
    private walletService: WalletService,
    private router: Router
  ) {}

  async connectWithMetaMask() {
    try {
      await this.walletService.connectWallet();
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
    }
  }

  abrirModalLogin() {
    this.mostrarModalLogin = true;
  }

  cerrarModalLogin() {
    this.mostrarModalLogin = false;
  }

}