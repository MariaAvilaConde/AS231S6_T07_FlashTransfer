import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
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

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu') && this.userMenuOpen) {
      this.userMenuOpen = false;
    }
    
    if (!target.closest('.mobile-menu') && !target.closest('.mobile-menu-button') && this.menuAbierto) {
      this.menuAbierto = false;
    }
  }

  copiarUsuario(texto: string) {
    if (!texto) return;
    navigator.clipboard.writeText(texto).then(() => {
      // Show success feedback
      console.log('Dirección copiada al portapapeles');
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
    // Remove all event listeners
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.removeAllListeners();
    }
    
    // Clear all local storage items related to the app
    localStorage.removeItem('account');
    localStorage.removeItem('selectedNetwork');
    
    // Clear wallet service data
    this.walletService.logout();
    
    // Reset component state
    this.address = '';
    this.shortened = '';
    this.avatarUrl = '';
    
    // Close menus
    this.userMenuOpen = false;
    this.menuAbierto = false;
    
    // Navigate to main menu page
    this.router.navigate(['/']);
  }
}