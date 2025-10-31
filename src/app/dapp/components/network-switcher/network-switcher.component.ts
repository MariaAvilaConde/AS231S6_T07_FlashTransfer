import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NetworkService, Network } from '../../service/network.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-network-switcher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="network-switcher">
      <label for="network-select" class="network-label">Red:</label>
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
        Cambiando red...
      </div>
    </div>
  `,
  styles: [`
    .network-switcher {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .network-label {
      font-weight: 500;
      color: #333;
    }
    
    .network-select {
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: white;
      font-size: 14px;
      cursor: pointer;
    }
    
    .network-select:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
    
    .network-select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .loading-indicator {
      font-size: 12px;
      color: #666;
      margin-left: 8px;
    }
  `]
})
export class NetworkSwitcherComponent implements OnInit, OnDestroy {
  networks: Network[] = [];
  selectedNetwork: string = '';
  isSwitching = false;
  
  private destroy$ = new Subject<void>();
  
  constructor(private networkService: NetworkService) {}
  
  ngOnInit() {
    // Get supported networks
    this.networks = this.networkService.getSupportedNetworks();
    
    // Get current network
    const currentNetwork = this.networkService.getCurrentNetwork();
    if (currentNetwork) {
      this.selectedNetwork = currentNetwork.chainId;
    }
    
    // Listen for network changes
    this.networkService.currentNetwork$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(network => {
      if (network) {
        this.selectedNetwork = network.chainId;
        this.isSwitching = false;
      }
    });
    
    // Listen for chain changes
    this.networkService.chainChanged$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(chainId => {
      this.selectedNetwork = chainId;
      this.isSwitching = false;
    });
    
    // Setup network change listeners
    this.networkService.listenToNetworkChanges();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.networkService.removeNetworkListener();
  }
  
  async onNetworkChange() {
    if (this.selectedNetwork) {
      this.isSwitching = true;
      try {
        const success = await this.networkService.switchNetwork(this.selectedNetwork);
        if (!success) {
          // Revert to previous selection on error
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
      }
    }
  }
}