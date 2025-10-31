import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NetworkService, Network } from '../../service/network.service';
import { WalletService } from '../../service/wallet.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-network-switcher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="network-switcher">
      <div class="network-container">
        <label for="network-select" class="network-label">
          <span class="network-icon">🌐</span>
          Red:
        </label>
        <div class="select-wrapper">
          <select 
            id="network-select" 
            [(ngModel)]="selectedNetwork" 
            (change)="onNetworkChange()" 
            class="network-select"
            [disabled]="isSwitching"
          >
            <option *ngFor="let network of networks" [value]="network.chainId">
              {{ network.name }}
            </option>
          </select>
          <div *ngIf="isSwitching" class="loading-indicator">
            <span class="spinner"></span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .network-switcher {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .network-container {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 12px;
      padding: 8px 16px;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    }
    
    .network-container:hover {
      background: rgba(30, 41, 59, 0.9);
      border-color: rgba(59, 130, 246, 0.6);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    
    .network-label {
      font-weight: 600;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
    }
    
    .network-icon {
      font-size: 16px;
    }
    
    .select-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .network-select {
      padding: 8px 12px;
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.8);
      color: #e2e8f0;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      min-width: 160px;
      transition: all 0.3s ease;
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e2e8f0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 16px;
      padding-right: 36px;
    }
    
    .network-select:hover {
      border-color: rgba(59, 130, 246, 0.6);
      background: rgba(15, 23, 42, 1);
    }
    
    .network-select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    }
    
    .network-select:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .loading-indicator {
      position: absolute;
      right: 40px;
      display: flex;
      align-items: center;
    }
    
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @media (max-width: 768px) {
      .network-container {
        padding: 6px 12px;
      }
      
      .network-select {
        min-width: 120px;
        font-size: 13px;
        padding: 6px 10px;
        padding-right: 30px;
      }
      
      .network-label {
        font-size: 13px;
      }
    }
  `]
})
export class NetworkSwitcherComponent implements OnInit, OnDestroy {
  networks: Network[] = [];
  selectedNetwork: string = '';
  isSwitching: boolean = false;
  private switchTimeout: any = null;
  private readonly SWITCH_DELAY = 300; // 300ms debounce delay
  
  constructor(
    private networkService: NetworkService,
    private walletService: WalletService,
    private router: Router
  ) {}
  
  ngOnInit() {
    // Get supported networks
    this.networks = this.networkService.getSupportedNetworks();
    
    // Get current network
    const currentNetwork = this.networkService.getCurrentNetwork();
    if (currentNetwork) {
      this.selectedNetwork = currentNetwork.chainId;
    }
    
    // Listen for network changes
    this.networkService.currentNetwork$.subscribe(network => {
      if (network) {
        this.selectedNetwork = network.chainId;
        this.isSwitching = false;
        // Clear any pending switch operations
        if (this.switchTimeout) {
          clearTimeout(this.switchTimeout);
          this.switchTimeout = null;
        }
      }
    });
  }
  
  ngOnDestroy() {
    if (this.switchTimeout) {
      clearTimeout(this.switchTimeout);
    }
  }
  
  onNetworkChange() {
    // Clear any pending switch operations
    if (this.switchTimeout) {
      clearTimeout(this.switchTimeout);
    }
    
    // Set a new timeout to debounce the switch operation
    this.switchTimeout = setTimeout(() => {
      this.performNetworkSwitch();
    }, this.SWITCH_DELAY);
  }
  
  private async performNetworkSwitch() {
    if (this.selectedNetwork) {
      this.isSwitching = true;
      try {
        const success = await this.networkService.switchNetwork(this.selectedNetwork);
        if (!success) {
          // Revert to previous selection if switch failed
          const currentNetwork = this.networkService.getCurrentNetwork();
          if (currentNetwork) {
            this.selectedNetwork = currentNetwork.chainId;
          }
        }
      } catch (error) {
        console.error('Error switching network:', error);
        // Revert to previous selection on error
        const currentNetwork = this.networkService.getCurrentNetwork();
        if (currentNetwork) {
          this.selectedNetwork = currentNetwork.chainId;
        }
      } finally {
        this.isSwitching = false;
        this.switchTimeout = null;
      }
    }
  }
}