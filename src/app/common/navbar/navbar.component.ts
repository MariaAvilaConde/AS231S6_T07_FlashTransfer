import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../dapp/service/wallet.service';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  menuAbierto: boolean = false;
  menuOpen = false;
  userMenuOpen = false;
  address: string = '';
  shortened: string = '';
  avatarUrl: string = '';

  constructor(
    private walletService: WalletService,
    private router: Router) { }

  ngOnInit(): void {
    const acc = this.walletService.getAccount() ?? '';
    this.address = acc;
    this.shortened = acc ? this.shortenAddress(acc) : '';
    this.avatarUrl = acc ? `https://api.dicebear.com/7.x/identicon/svg?seed=${acc}` : '';
  }

  copiarUsuario(texto: string) {
    if (!texto) return;
    navigator.clipboard.writeText(texto).then(() => {
    }, err => {
      console.error('Error al copiar', err);
    });
  }

  toggleMenuAbierto() {
    this.menuAbierto = !this.menuAbierto;
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  shortenAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  logout(): void {
    this.walletService.logout();
    this.address = '';
    this.shortened = '';
    this.avatarUrl = '';
    this.router.navigate(['/']);
  }

}
