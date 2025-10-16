import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

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

interface Network {
  chainId: string;
  name: string;
  symbol: string;
  decimals: number;
  explorer: string;
  apiUrl: string;
}

@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transaction.component.html',
  styleUrl: './transaction.component.css'
})
export class TransactionComponent implements OnInit {
  walletAddress = '';
  isConnected = false;
  currentNetwork: Network | null = null;
  balance = '0';
  
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
  
  // API Keys (deberías usar variables de entorno en producción)
  private readonly API_KEYS = {
    etherscan: '91WBR32VV7QPMZCNPQP8U557NTBWB969TG',
    polygonscan: '91WBR32VV7QPMZCNPQP8U557NTBWB969TG',
    bscscan: '91WBR32VV7QPMZCNPQP8U557NTBWB969TG'
  };
  
  // Supported networks
  networks: { [key: string]: Network } = {
    '0x1': {
      chainId: '0x1',
      name: 'Ethereum Mainnet',
      symbol: 'ETH',
      decimals: 18,
      explorer: 'https://etherscan.io',
      apiUrl: 'https://api.etherscan.io/api'
    },
    '0x89': {
      chainId: '0x89',
      name: 'Polygon',  
      symbol: 'MATIC',
      decimals: 18,
      explorer: 'https://polygonscan.com',
      apiUrl: 'https://api.polygonscan.com/api'
    },
    '0x38': {
      chainId: '0x38',
      name: 'BSC',
      symbol: 'BNB',
      decimals: 18,
      explorer: 'https://bscscan.com',
      apiUrl: 'https://api.bscscan.com/api'
    },
    '0xaa36a7': {
      chainId: '0xaa36a7',
      name: 'Sepolia Testnet',
      symbol: 'ETH',
      decimals: 18,
      explorer: 'https://sepolia.etherscan.io',
      apiUrl: 'https://api-sepolia.etherscan.io/api'
    },
    '0x13882': {
      chainId: '0x13882',
      name: 'Polygon Amoy',
      symbol: 'MATIC',
      decimals: 18,
      explorer: 'https://amoy.polygonscan.com',
      apiUrl: 'https://api-amoy.polygonscan.com/api'
    },
    '0xa4b1': {
      chainId: '0xa4b1',
      name: 'Arbitrum',
      symbol: 'ETH',
      decimals: 18,
      explorer: 'https://arbiscan.io',
      apiUrl: 'https://api.arbiscan.io/api'
    },
    '0xa': {
      chainId: '0xa',
      name: 'Optimism',
      symbol: 'ETH',
      decimals: 18,
      explorer: 'https://optimistic.etherscan.io',
      apiUrl: 'https://api-optimistic.etherscan.io/api'
    }
  };

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    this.initWallet();
    this.setupEventListeners();
  }

  async initWallet() {
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
          await this.loadAllNetworkTransactions();
        } else {
          this.router.navigate(['/']);
        }
      } catch (error) {
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
      // Detectar cambio de cuenta
      (window as any).ethereum.on('accountsChanged', async (accounts: string[]) => {
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          await this.loadBalance();
          await this.loadAllNetworkTransactions();
          this.showNotification('Cuenta cambiada exitosamente', 'info');
        } else {
          this.router.navigate(['/']);
        }
      });

      // Detectar cambio de red
      (window as any).ethereum.on('chainChanged', async (chainId: string) => {
        this.currentNetwork = this.networks[chainId] || null;
        await this.loadBalance();
        await this.loadAllNetworkTransactions();
        this.showNotification(`Red cambiada a: ${this.currentNetwork?.name}`, 'info');
      });
    }
  }

  async loadNetworkInfo() {
    try {
      const chainId = await (window as any).ethereum.request({
        method: 'eth_chainId'
      });
      
      this.currentNetwork = this.networks[chainId] || {
        chainId: chainId,
        name: 'Red Desconocida',
        symbol: 'ETH',
        decimals: 18,
        explorer: '',
        apiUrl: ''
      };
    } catch (error) {
      console.error('Error loading network:', error);
    }
  }

  async loadBalance() {
    try {
      const balance = await (window as any).ethereum.request({
        method: 'eth_getBalance',
        params: [this.walletAddress, 'latest']
      });
      
      // Convertir de Wei a ETH/token nativo
      const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
      this.balance = balanceInEth.toFixed(6);
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  }

  async loadAllNetworkTransactions() {
    this.isLoadingTransactions = true;
    
    try {
      const allTransactions: Transaction[] = [];
      
      // Si showAllNetworks es true, cargar de todas las redes, sino solo de la actual
      const networksToLoad = this.showAllNetworks 
        ? Object.keys(this.networks) 
        : [this.currentNetwork?.chainId];
      
      for (const chainId of networksToLoad) {
        if (chainId) {
          try {
            const networkTxs = await this.loadTransactionsForNetwork(chainId);
            allTransactions.push(...networkTxs);
          } catch (error) {
            console.warn(`Error loading transactions for network ${chainId}:`, error);
          }
        }
      }
      
      // Ordenar por timestamp (más recientes primero)
      this.transactions = allTransactions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      this.showNotification(`Cargadas ${this.transactions.length} transacciones`, 'success');
      
    } catch (error) {
      console.error('Error loading all transactions:', error);
      this.showNotification('Error al cargar el historial completo', 'error');
      this.loadTransactionHistory(); // Fallback
    } finally {
      this.isLoadingTransactions = false;
    }
  }

  async loadTransactionsForNetwork(chainId: string): Promise<Transaction[]> {
    const network = this.networks[chainId];
    if (!network?.apiUrl) {
      return [];
    }

    try {
      const apiKey = this.getApiKeyForNetwork(chainId);
      const apiUrl = `${network.apiUrl}?module=account&action=txlist&address=${this.walletAddress}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=${apiKey}`;
      
      const response: any = await this.http.get(apiUrl).toPromise();
      
      if (response.status === '1' && response.result) {
        return response.result.map((tx: any) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: (parseInt(tx.value) / Math.pow(10, network.decimals)).toFixed(6),
          timestamp: new Date(parseInt(tx.timeStamp) * 1000),
          status: tx.isError === '0' ? 'success' : 'failed',
          network: network.name,
          chainId: chainId,
          gasUsed: tx.gasUsed,
          blockNumber: parseInt(tx.blockNumber),
          explorerUrl: `${network.explorer}/tx/${tx.hash}`
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`Error loading transactions for ${network.name}:`, error);
      return [];
    }
  }

  getApiKeyForNetwork(chainId: string): string {
    const networkNames: { [key: string]: string } = {
      '0x1': 'etherscan',
      '0xaa36a7': 'etherscan',
      '0x89': 'polygonscan',
      '0x13882': 'polygonscan',
      '0x38': 'bscscan',
      '0xa4b1': 'etherscan', // Arbitrum usa API de Etherscan
      '0xa': 'etherscan' // Optimism usa API de Etherscan
    };
    
    const networkName = networkNames[chainId];
    return this.API_KEYS[networkName as keyof typeof this.API_KEYS] || this.API_KEYS.etherscan;
  }

  mergePendingTransactions() {
    const stored = sessionStorage.getItem(`transactions_${this.walletAddress}`);
    if (stored) {
      try {
        const localTxs: Transaction[] = JSON.parse(stored).map((tx: any) => ({
          ...tx,
          timestamp: new Date(tx.timestamp)
        }));

        localTxs.forEach(localTx => {
          if (localTx.status === 'pending') {
            const exists = this.transactions.some(tx => tx.hash === localTx.hash);
            if (!exists) {
              this.transactions.unshift(localTx);
              this.checkTransactionStatus(localTx.hash);
            }
          }
        });
      } catch (error) {
        console.error('Error parsing local transactions:', error);
      }
    }
  }

  loadTransactionHistory() {
    const stored = sessionStorage.getItem(`transactions_${this.walletAddress}`);
    if (stored) {
      try {
        this.transactions = JSON.parse(stored).map((tx: any) => ({
          ...tx,
          timestamp: new Date(tx.timestamp)
        }));
        
        this.transactions.forEach(tx => {
          if (tx.status === 'pending') {
            this.checkTransactionStatus(tx.hash);
          }
        });
      } catch (error) {
        console.error('Error parsing transactions:', error);
        this.transactions = [];
      }
    }
  }

  saveTransaction(tx: Transaction) {
    const existingIndex = this.transactions.findIndex(t => t.hash === tx.hash);
    
    if (existingIndex !== -1) {
      this.transactions[existingIndex] = tx;
    } else {
      this.transactions.unshift(tx);
    }
    
    const recentTxs = this.transactions.filter(t => 
      t.status === 'pending' || 
      (new Date().getTime() - t.timestamp.getTime()) < 24 * 60 * 60 * 1000
    );
    
    sessionStorage.setItem(
      `transactions_${this.walletAddress}`,
      JSON.stringify(recentTxs)
    );
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

  async checkTransactionStatus(txHash: string) {
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
            
            // Actualizar explorerUrl con la red correcta
            const network = this.networks[this.currentNetwork?.chainId || '0x1'];
            if (network?.explorer) {
              tx.explorerUrl = `${network.explorer}/tx/${txHash}`;
            }
            
            this.saveTransaction(tx);
            
            const statusText = tx.status === 'success' ? 'confirmada' : 'fallida';
            this.showNotification(`Transacción ${statusText}`, tx.status === 'success' ? 'success' : 'error');
            
            await this.loadBalance();
            
            // Recargar desde explorers después de confirmación
            setTimeout(() => {
              this.loadAllNetworkTransactions();
            }, 3000);
          }
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 3000);
        } else {
          // Si después de muchos intentos no se confirma, marcar como fallida
          const tx = this.transactions.find(t => t.hash === txHash);
          if (tx && tx.status === 'pending') {
            tx.status = 'failed';
            this.saveTransaction(tx);
            this.showNotification('Transacción expirada o fallida', 'error');
          }
        }
      } catch (error) {
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
    // Usar la chainId de la transacción si está disponible, sino la red actual
    const targetChainId = chainId || this.currentNetwork?.chainId;
    const network = this.networks[targetChainId || ''];
    
    if (network?.explorer) {
      const explorerUrl = `${network.explorer}/tx/${txHash}`;
      window.open(explorerUrl, '_blank');
    } else {
      this.showNotification('Explorer no disponible para esta red', 'info');
    }
  }

  getExplorerUrl(txHash: string, chainId?: string): string {
    const targetChainId = chainId || this.currentNetwork?.chainId;
    const network = this.networks[targetChainId || ''];
    return network?.explorer ? `${network.explorer}/tx/${txHash}` : '#';
  }

  viewTransactionDetails(tx: Transaction) {
    const network = this.networks[tx.chainId];
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
    sessionStorage.removeItem(`transactions_${this.walletAddress}`);
    this.walletAddress = '';
    this.isConnected = false;
    this.transactions = [];
    this.router.navigate(['/']);
  }

  setMaxAmount() {
    const maxSendable = Math.max(0, parseFloat(this.balance) - 0.001);
    this.amount = maxSendable.toFixed(6);
  }

  async refreshTransactions() {
    this.showNotification('Actualizando transacciones...', 'info');
    await this.loadAllNetworkTransactions();
  }

  toggleAllNetworks() {
    this.showAllNetworks = !this.showAllNetworks;
    this.loadAllNetworkTransactions();
  }

  clearTransactionHistory() {
    if (confirm('¿Estás seguro de que deseas borrar el historial local? (Las transacciones se recargarán desde los explorers)')) {
      sessionStorage.removeItem(`transactions_${this.walletAddress}`);
      this.loadAllNetworkTransactions();
      this.showNotification('Historial local eliminado', 'info');
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
      this.loadAllNetworkTransactions();
      return;
    }
    
    this.transactions = this.transactions.filter(tx => 
      tx.network.toLowerCase().includes(networkName.toLowerCase())
    );
  }
}