import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, of, Subscription } from 'rxjs';
import { WalletService } from '../../../service/wallet.service';
import { EtherscanService, EtherscanTransaction } from '../../../service/etherscan.service';
import { NetworkService, Network as NetworkModel } from '../../../service/network.service';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: Date;
  status: 'pending' | 'success' | 'failed';
  network: string;
  chainId: string;
  gasUsed?: string;
  blockNumber?: number;
  explorerUrl?: string;
}

// Remove the local Network interface since we're using the one from NetworkService
// interface Network {
//   chainId: string;
//   name: string;
//   symbol: string;
//   decimals: number;
//   explorer: string;
//   apiUrl: string;
//   apiKey?: string;
// }

@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transaction.component.html',
  styleUrl: './transaction.component.css'
})
export class TransactionComponent implements OnInit, OnDestroy {
  walletAddress = '';
  isConnected = false;
  currentNetwork: NetworkModel | null = null;
  balance = '0';
  gasEstimate = '0.0001'; // Default gas estimate
  
  // Form data
  recipientAddress = '';
  amount = '';
  isSending = false;
  
  // Transaction history
  transactions: Transaction[] = [];
  isLoadingTransactions = false;
  showAllNetworks = false;
  
  // Toast notification
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  
  // Remove local networks definition since we're using NetworkService

  constructor(
    private router: Router, 
    private http: HttpClient, 
    private walletService: WalletService,
    private etherscanService: EtherscanService,
    private networkService: NetworkService
  ) {}

  private networkSubscription: Subscription = new Subscription();

  ngOnInit() {
    this.initWallet();
    this.setupEventListeners();
    
    // Subscribe to network changes
    this.networkSubscription = this.networkService.currentNetwork$.subscribe(
      network => {
        if (network) {
          this.currentNetwork = network;
          this.loadBalance();
          this.loadLocalTransactions();
        }
      }
    );
  }

  ngOnDestroy() {
    // Clean up subscription
    if (this.networkSubscription) {
      this.networkSubscription.unsubscribe();
    }
    
    // Remove event listeners
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.removeAllListeners();
    }
  }

  private async initWallet() {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_accounts'
        });
        
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          this.isConnected = true;
          await this.loadNetworkInfo();
          await this.loadBalance();
          this.loadLocalTransactions();
        } else {
          this.router.navigate(['/']);
        }
      } catch (error: any) {
        console.error('Error initializing wallet:', error);
        this.showNotification('Error al inicializar la wallet', 'error');
        this.router.navigate(['/']);
      }
    } else {
      this.showNotification('Por favor instala MetaMask', 'error');
      this.router.navigate(['/']);
    }
  }

  setupEventListeners() {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', async (accounts: string[]) => {
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          await this.loadBalance();
          this.loadLocalTransactions();
          this.showNotification('Cuenta cambiada exitosamente', 'info');
        } else {
          this.router.navigate(['/']);
        }
      });

      // Remove the chainChanged listener here since we're handling it globally
      // (window as any).ethereum.on('chainChanged', async (chainId: string) => {
      //   this.currentNetwork = this.networks[chainId] || null;
      //   await this.loadBalance();
      //   this.loadLocalTransactions();
      //   this.showNotification(`Red cambiada a: ${this.currentNetwork?.name}`, 'info');
      // });
    }
  }

  private async loadNetworkInfo() {
    try {
      // Get current network from the network service instead
      const currentNetwork = this.networkService.getCurrentNetwork();
      if (currentNetwork) {
        this.currentNetwork = currentNetwork;
      } else {
        // Fallback to getting chainId from ethereum
        const chainId = await (window as any).ethereum.request({
          method: 'eth_chainId'
        });
        
        this.currentNetwork = this.networkService.getNetworkByChainId(chainId) || {
          chainId: chainId,
          name: 'Red Desconocida',
          symbol: 'ETH',
          decimals: 18,
          explorer: '',
          apiUrl: ''
        };
      }
    } catch (error: any) {
      console.error('Error loading network:', error);
    }
  }

  private async loadBalance() {
    try {
      if (this.currentNetwork && this.walletAddress) {
        const balance = await this.walletService.getBalance(this.walletAddress, this.currentNetwork.chainId);
        this.balance = parseFloat(balance).toFixed(6);
        // Save balance to localStorage as backup
        localStorage.setItem(`balance_${this.walletAddress}_${this.currentNetwork.chainId}`, this.balance);
      }
    } catch (error: any) {
      console.error('Error loading balance:', error);
      // Try to load from localStorage as fallback
      const storedBalance = localStorage.getItem(`balance_${this.walletAddress}_${this.currentNetwork?.chainId}`);
      if (storedBalance) {
        this.balance = storedBalance;
      }
    }
  }

  private async loadLocalTransactions() {
    // First try to load from localStorage
    const stored = localStorage.getItem(`transactions_${this.walletAddress}`);
    let localTxs: Transaction[] = [];
    
    if (stored) {
      try {
        const storageData = JSON.parse(stored);
        
        // Verificar si ha expirado (7 días)
        if (storageData.expiresAt && new Date().getTime() > storageData.expiresAt) {
          localStorage.removeItem(`transactions_${this.walletAddress}`);
          console.log('Local storage data expired, cleared');
        } else {
          localTxs = (storageData.transactions || []).map((tx: any) => ({
            ...tx,
            timestamp: new Date(tx.timestamp)
          }));
        }
      } catch (error: any) {
        console.error('Error parsing local transactions:', error);
        // Clear corrupted data
        localStorage.removeItem(`transactions_${this.walletAddress}`);
      }
    }
    
    // Show local transactions first
    this.transactions = localTxs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    if (localTxs.length > 0) {
      this.showNotification(`Cargadas ${localTxs.length} transacciones locales`, 'success');
    }
    
    // Then try to load from Etherscan API
    if (this.currentNetwork && this.walletAddress) {
      this.isLoadingTransactions = true;
      try {
        const networkMap: { [key: string]: string } = {
          '0x1': 'ETH Mainnet',
          '0xaa36a7': 'ETH Sepolia'
        };
        
        const networkName = networkMap[this.currentNetwork.chainId] || 'ETH Mainnet';
        
        this.etherscanService.getAllTransactions(this.walletAddress, networkName).subscribe(
          (etherscanTxs: EtherscanTransaction[]) => {
            const mappedTxs: Transaction[] = etherscanTxs.map(tx => ({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: tx.amount,
              timestamp: new Date(tx.timestamp),
              status: tx.isError ? 'failed' : 'success',
              network: tx.network,
              chainId: this.currentNetwork?.chainId || '0x1',
              explorerUrl: this.etherscanService.getExplorerUrl(tx.network, tx.hash)
            }));
            
            // Merge with existing local transactions
            const mergedTxs = [...mappedTxs, ...localTxs];
            const uniqueTxs = mergedTxs.filter((tx, index, self) => 
              index === self.findIndex(t => t.hash === tx.hash)
            );
            
            this.transactions = uniqueTxs.sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            
            // Save merged transactions to localStorage as backup
            this.saveTransactionsToLocalStorage(this.transactions);
            
            if (mappedTxs.length > 0) {
              this.showNotification(`Cargadas ${mappedTxs.length} transacciones desde Etherscan`, 'success');
            } else {
              this.showNotification('No se encontraron transacciones en Etherscan', 'info');
            }
            
            this.isLoadingTransactions = false;
          },
          (error) => {
            console.error('Error loading Etherscan transactions:', error);
            this.showNotification('Error al cargar transacciones desde Etherscan: ' + (error.message || 'Error desconocido'), 'error');
            // Still show local transactions if Etherscan fails
            this.transactions = localTxs.sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            this.isLoadingTransactions = false;
          }
        );
      } catch (error: any) {
        console.error('Error initiating Etherscan API call:', error);
        this.showNotification('Error al iniciar llamada a Etherscan: ' + (error.message || 'Error desconocido'), 'error');
        // Still show local transactions if Etherscan fails
        this.transactions = localTxs.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.isLoadingTransactions = false;
      }
    } else {
      // If no network or wallet, at least show local transactions
      this.transactions = localTxs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      this.isLoadingTransactions = false;
    }
  }

  saveTransaction(tx: Transaction) {
    const existingIndex = this.transactions.findIndex(t => t.hash === tx.hash);
    
    if (existingIndex !== -1) {
      this.transactions[existingIndex] = tx;
    } else {
      this.transactions.unshift(tx);
    }
    
    this.saveTransactionsToLocalStorage(this.transactions);
  }

  private saveTransactionsToLocalStorage(transactions: Transaction[]) {
    try {
      const recentTxs = transactions.filter(t => 
        t.status === 'pending' || 
        (new Date().getTime() - t.timestamp.getTime()) < 7 * 24 * 60 * 60 * 1000
      );
      
      const storageData = {
        transactions: recentTxs,
        expiresAt: new Date().getTime() + (7 * 24 * 60 * 60 * 1000)
      };
      
      localStorage.setItem(
        `transactions_${this.walletAddress}`,
        JSON.stringify(storageData)
      );
    } catch (error) {
      console.error('Error saving transactions to localStorage:', error);
      // If localStorage fails, try to clear it to prevent corruption
      try {
        localStorage.removeItem(`transactions_${this.walletAddress}`);
      } catch (clearError) {
        console.error('Error clearing localStorage:', clearError);
      }
    }
  }

  async sendTransaction() {
    if (!this.recipientAddress || !this.amount) {
      this.showNotification('Por favor completa todos los campos', 'error');
      return;
    }

    if (!this.isValidAddress(this.recipientAddress)) {
      this.showNotification('Dirección de destinatario inválida', 'error');
      return;
    }

    if (parseFloat(this.amount) <= 0) {
      this.showNotification('El monto debe ser mayor a 0', 'error');
      return;
    }

    if (parseFloat(this.amount) > parseFloat(this.balance)) {
      this.showNotification('Saldo insuficiente', 'error');
      return;
    }

    this.isSending = true;

    try {
      const decimals = this.currentNetwork?.decimals || 18;
      const amountInWei = BigInt(Math.floor(parseFloat(this.amount) * Math.pow(10, decimals)));
      const amountHex = '0x' + amountInWei.toString(16);

      let gasEstimate = '0x5208';
      try {
        gasEstimate = await (window as any).ethereum.request({
          method: 'eth_estimateGas',
          params: [{
            from: this.walletAddress,
            to: this.recipientAddress,
            value: amountHex
          }]
        });
      } catch (error) {
        console.log('Using default gas estimate');
      }

      const transactionParameters = {
        from: this.walletAddress,
        to: this.recipientAddress,
        value: amountHex,
        gas: gasEstimate,
      };

      const txHash = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });

      const transaction: Transaction = {
        hash: txHash,
        from: this.walletAddress,
        to: this.recipientAddress,
        value: this.amount,
        timestamp: new Date(),
        status: 'pending',
        network: this.currentNetwork?.name || 'Unknown',
        chainId: this.currentNetwork?.chainId || '0x1',
        explorerUrl: this.currentNetwork?.explorer ? `${this.currentNetwork.explorer}/tx/${txHash}` : undefined
      };

      this.saveTransaction(transaction);

      this.recipientAddress = '';
      this.amount = '';

      this.showNotification(`Transacción enviada! Hash: ${this.formatAddress(txHash)}`, 'success');

      setTimeout(() => {
        this.loadBalance();
      }, 2000);

      this.checkTransactionStatus(txHash);

    } catch (error: any) {
      console.error('Error sending transaction:', error);
      if (error.code === 4001) {
        this.showNotification('Transacción cancelada por el usuario', 'info');
      } else {
        this.showNotification('Error al enviar la transacción: ' + error.message, 'error');
      }
    } finally {
      this.isSending = false;
    }
  }

  private async checkTransactionStatus(txHash: string) {
    let attempts = 0;
    const maxAttempts = 40;

    const checkStatus = async () => {
      try {
        const receipt = await (window as any).ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        });

        if (receipt) {
          const tx = this.transactions.find(t => t.hash === txHash);
          if (tx) {
            tx.status = receipt.status === '0x1' ? 'success' : 'failed';
            tx.gasUsed = receipt.gasUsed;
            tx.blockNumber = parseInt(receipt.blockNumber, 16);
            
            const network = this.networkService.getNetworkByChainId(this.currentNetwork?.chainId || '') || this.networkService.getCurrentNetwork();
            if (network?.explorer) {
              tx.explorerUrl = `${network.explorer}/tx/${txHash}`;
            }
            
            this.saveTransaction(tx);
            
            const statusText = tx.status === 'success' ? 'confirmada' : 'fallida';
            this.showNotification(`Transacción ${statusText}`, tx.status === 'success' ? 'success' : 'error');
            
            await this.loadBalance();
          }
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 3000);
        } else {
          const tx = this.transactions.find(t => t.hash === txHash);
          if (tx && tx.status === 'pending') {
            tx.status = 'failed';
            this.saveTransaction(tx);
            this.showNotification('Transacción expirada o fallida', 'error');
          }
        }
      } catch (error: any) {
        console.error('Error checking transaction status:', error);
      }
    };

    checkStatus();
  }

  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  copyToClipboard(text: string, label: string = 'Hash') {
    navigator.clipboard.writeText(text).then(() => {
      this.showNotification(`${label} copiado al portapapeles`, 'success');
    }).catch(err => {
      console.error('Error al copiar:', err);
      this.showNotification('Error al copiar', 'error');
    });
  }

  viewOnExplorer(txHash: string, chainId?: string) {
    const targetChainId = chainId || this.currentNetwork?.chainId;
    const network = this.networkService.getNetworkByChainId(targetChainId || '') || this.networkService.getCurrentNetwork();
    
    if (network?.explorer) {
      const explorerUrl = `${network.explorer}/tx/${txHash}`;
      window.open(explorerUrl, '_blank');
    } else {
      this.showNotification('Explorer no disponible para esta red', 'info');
    }
  }

  viewTransactionDetails(tx: Transaction) {
    const network = this.networkService.getNetworkByChainId(tx.chainId) || this.networkService.getCurrentNetwork();
    const explorerUrl = network?.explorer ? `${network.explorer}/tx/${tx.hash}` : 'No disponible';
    
    const details = `
Detalles de la Transacción:
─────────────────────────
Hash: ${tx.hash}
De: ${tx.from}
Para: ${tx.to}
Monto: ${tx.value} ${network?.symbol || 'ETH'}
Red: ${tx.network}
Estado: ${tx.status === 'success' ? '✅ Exitosa' : tx.status === 'pending' ? '⏳ Pendiente' : '❌ Fallida'}
Fecha: ${tx.timestamp.toLocaleString()}
${tx.blockNumber ? `Bloque: ${tx.blockNumber}` : ''}
${tx.gasUsed ? `Gas Usado: ${parseInt(tx.gasUsed, 16)}` : ''}
Explorer: ${explorerUrl}
    `;
    
    alert(details);
  }

  showNotification(message: string, type: 'success' | 'error' | 'info') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 5000);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  disconnectWallet() {
    console.log('Disconnecting wallet from transaction page...');
    // Remove event listeners
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.removeAllListeners();
    }
    
    // Clear local storage
    localStorage.removeItem(`transactions_${this.walletAddress}`);
    localStorage.removeItem('account');
    
    // Clear wallet data
    this.walletAddress = '';
    this.isConnected = false;
    this.transactions = [];
    
    // Clear balance cache
    this.balance = '0';
    
    // Use wallet service to properly logout
    this.walletService.logout();
    
    // Navigate to login page
    this.router.navigate(['/login']);
  }

  setMaxAmount() {
    const maxSendable = Math.max(0, parseFloat(this.balance) - 0.001);
    this.amount = maxSendable.toFixed(6);
  }

  // Method to handle address input
  onAddressInput(event: any) {
    // Add any validation or formatting logic here if needed
    this.recipientAddress = event.target.value;
  }

  // Method to handle amount input
  onAmountInput(event: any) {
    // Add any validation or formatting logic here if needed
    this.amount = event.target.value;
  }

  async refreshTransactions() {
    this.showNotification('Actualizando transacciones...', 'info');
    // Clear current transactions to show loading state
    this.transactions = [];
    // Force reload from both localStorage and API
    await this.loadLocalTransactions();
  }

  toggleAllNetworks() {
    this.showAllNetworks = !this.showAllNetworks;
    this.loadLocalTransactions();
  }

  clearTransactionHistory() {
    if (confirm('¿Estás seguro de que deseas borrar el historial local?')) {
      localStorage.removeItem(`transactions_${this.walletAddress}`);
      this.transactions = [];
      this.showNotification('Historial local eliminado', 'info');
    }
  }

  backupTransactions() {
    if (this.transactions.length > 0) {
      this.saveTransactionsToLocalStorage(this.transactions);
      this.showNotification(`Respaldo de ${this.transactions.length} transacciones guardado`, 'success');
    } else {
      this.showNotification('No hay transacciones para respaldar', 'info');
    }
  }

  getNetworkIcon(networkName: string): string {
    const icons: { [key: string]: string } = {
      'Ethereum': '🔷',
      'Polygon': '🟣',
      'BSC': '🟡',
      'Sepolia': '🧪',
      'Arbitrum': '🔵',
      'Optimism': '🔴'
    };
    
    for (const [key, icon] of Object.entries(icons)) {
      if (networkName.includes(key)) {
        return icon;
      }
    }
    return '🌐';
  }

  filterTransactionsByNetwork(networkName: string) {
    if (!networkName) {
      this.loadLocalTransactions();
      return;
    }
    
    this.transactions = this.transactions.filter(tx => 
      tx.network.toLowerCase().includes(networkName.toLowerCase())
    );
  }

  // Method to switch network
  async switchNetwork(chainId: string) {
    const success = await this.walletService.switchNetwork(chainId);
    if (success) {
      this.showNotification(`Red cambiada exitosamente`, 'success');
    } else {
      this.showNotification(`Error al cambiar de red`, 'error');
    }
  }
}