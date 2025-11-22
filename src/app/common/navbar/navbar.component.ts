import { CommonModule } from '@angular/common';
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { WalletService } from '../../dapp/service/wallet.service';
import { Router, RouterModule } from '@angular/router';
import { NetworkSwitcherComponent } from '../../dapp/components/network-switcher/network-switcher.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, NetworkSwitcherComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {

  menuAbierto: boolean = false;
  userMenuOpen: boolean = false;

  address: string = '';
  shortened: string = '';
  avatarUrl: string = '';

  private isBrowser: boolean;

  constructor(
    private walletService: WalletService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    // Obtener la wallet almacenada
    const acc = this.walletService.getAccount();

    if (acc) {
      this.setAddress(acc);
    }
  }

  /** =============================
   *  MÉTODO: CONECTAR WALLET
   *  ============================= */
  async conectarWallet(): Promise<void> {
    try {
      const acc = await this.walletService.connectWallet();

      if (acc) {
        this.setAddress(acc);
      }
    } catch (error) {
      console.error('Error al conectar wallet:', error);
    }
  }

  /** =============================
   *  ACTUALIZA address, shortened y avatar
   *  ============================= */
  private setAddress(acc: string): void {
    this.address = acc;
    this.shortened = this.shortenAddress(acc);
    this.avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${acc}`;
  }

  copiarUsuario(texto: string): void {
    if (!this.isBrowser || !texto) return;

    navigator.clipboard.writeText(texto).catch(err => {
      console.error('Error al copiar', err);
    });
  }

  toggleMenuAbierto(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  toggleUserMenu(): void {
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
    this.router.navigate(['/login']);
  }
}
