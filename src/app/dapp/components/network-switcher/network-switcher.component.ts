import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NetworkService, Network } from '../../service/network.service';

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
      >
        <option *ngFor="let network of networks" [value]="network.chainId">
          {{ network.name }}
        </option>
      </select>
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
  `]
})
export class NetworkSwitcherComponent implements OnInit {
  networks: Network[] = [];
  selectedNetwork: string = '';
  
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
    this.networkService.currentNetwork$.subscribe(network => {
      if (network) {
        this.selectedNetwork = network.chainId;
      }
    });
  }
  
  async onNetworkChange() {
    if (this.selectedNetwork) {
      await this.networkService.switchNetwork(this.selectedNetwork);
    }
  }
}