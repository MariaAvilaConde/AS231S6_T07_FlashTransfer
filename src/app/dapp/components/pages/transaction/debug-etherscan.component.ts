import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EtherscanService } from '../../../service/etherscan.service';

@Component({
  selector: 'app-debug-etherscan',
  template: `
    <div class="debug-container">
      <h2>Debug Etherscan Service</h2>
      
      <div class="form-group">
        <label for="address">Wallet Address:</label>
        <input 
          type="text" 
          id="address" 
          [(ngModel)]="walletAddress" 
          placeholder="0x..." 
          class="form-control"
        />
      </div>
      
      <div class="form-group">
        <label for="network">Network:</label>
        <select id="network" [(ngModel)]="selectedNetwork" class="form-control">
          <option value="ETH Mainnet">ETH Mainnet</option>
          <option value="ETH Sepolia">ETH Sepolia</option>
          <option value="Holesky">Holesky</option>
          <option value="ETH Goerli">ETH Goerli</option>
          <option value="Polygon Mainnet">Polygon Mainnet</option>
          <option value="Polygon Mumbai">Polygon Mumbai</option>
        </select>
      </div>
      
      <button (click)="testGetAllTransactions()" class="btn btn-primary">
        Test Get All Transactions
      </button>
      
      <button (click)="testGetAddressTransactions()" class="btn btn-secondary">
        Test Get Address Transactions
      </button>
      
      <button (click)="testGetTokenTransfers()" class="btn btn-secondary">
        Test Get Token Transfers
      </button>
      
      <div *ngIf="isLoading" class="loading">
        Loading...
      </div>
      
      <div *ngIf="error" class="error">
        Error: {{ error }}
      </div>
      
      <div *ngIf="result" class="result">
        <h3>Result:</h3>
        <pre>{{ result | json }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .debug-container {
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 5px;
      margin: 20px;
    }
    
    .form-group {
      margin-bottom: 15px;
    }
    
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    
    .form-control {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .btn {
      padding: 10px 15px;
      margin-right: 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .loading, .error, .result {
      margin-top: 20px;
      padding: 15px;
      border-radius: 4px;
    }
    
    .loading {
      background-color: #d1ecf1;
      border: 1px solid #bee5eb;
    }
    
    .error {
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
    }
    
    .result {
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DebugEtherscanComponent implements OnInit {
  walletAddress = '';
  selectedNetwork = 'ETH Mainnet';
  isLoading = false;
  error: string | null = null;
  result: any = null;

  constructor(private etherscanService: EtherscanService) {}

  ngOnInit() {
    // You can set a default address for testing
    // this.walletAddress = '0x...';
  }

  testGetAllTransactions() {
    if (!this.walletAddress) {
      this.error = 'Please enter a wallet address';
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.result = null;

    this.etherscanService.getAllTransactions(this.walletAddress, this.selectedNetwork)
      .subscribe({
        next: (transactions) => {
          this.isLoading = false;
          this.result = transactions;
          console.log('All transactions:', transactions);
        },
        error: (error) => {
          this.isLoading = false;
          this.error = error.message || 'Unknown error';
          console.error('Error getting all transactions:', error);
        }
      });
  }

  testGetAddressTransactions() {
    if (!this.walletAddress) {
      this.error = 'Please enter a wallet address';
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.result = null;

    this.etherscanService.getAddressTransactions(this.walletAddress, this.selectedNetwork)
      .subscribe({
        next: (transactions) => {
          this.isLoading = false;
          this.result = transactions;
          console.log('Address transactions:', transactions);
        },
        error: (error) => {
          this.isLoading = false;
          this.error = error.message || 'Unknown error';
          console.error('Error getting address transactions:', error);
        }
      });
  }

  testGetTokenTransfers() {
    if (!this.walletAddress) {
      this.error = 'Please enter a wallet address';
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.result = null;

    this.etherscanService.getAddressTokenTransfers(this.walletAddress, this.selectedNetwork)
      .subscribe({
        next: (transactions) => {
          this.isLoading = false;
          this.result = transactions;
          console.log('Token transfers:', transactions);
        },
        error: (error) => {
          this.isLoading = false;
          this.error = error.message || 'Unknown error';
          console.error('Error getting token transfers:', error);
        }
      });
  }
}