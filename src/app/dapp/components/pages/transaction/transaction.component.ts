import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription, Subject, debounceTime, takeUntil } from 'rxjs';
import { WalletService } from '../../../service/wallet.service';
import { EtherscanService, EtherscanTransaction } from '../../../service/etherscan.service';
import { NetworkService, Network as NetworkModel } from '../../../service/network.service';
import { ContractService } from '../../../service/contract.service';

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
  isContractTransaction?: boolean;
}

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
  gasEstimate = '0.0001';
  private isBrowser: boolean;
  
  // Form data
  recipientAddress = '';
  amount = '';
  isSending = false;
  
  // Contract data
  contractAddress = '';
  contractBalance = '0';
  isContractInitialized = false;
  useContract = false;
  
  // Transaction history - AHORA SEPARADO POR RED
  allTransactions: Transaction[] = []; // Todas las transacciones
  transactions: Transaction[] = []; // Transacciones filtradas por red actual
  isLoadingTransactions = false;
  
  // Toast notification
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  
  // Subjects for better event handling
  private refreshSubject = new Subject<void>();
  private destroy$ = new Subject<void>();
  private networkSubscription: Subscription = new Subscription();

  constructor(
    private router: Router, 
    private http: HttpClient, 
    private walletService: WalletService,
    private etherscanService: EtherscanService,
    private networkService: NetworkService,
    private contractService: ContractService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.initWallet();
    this.setupEventListeners();
    
    this.refreshSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadLocalTransactions();
    });
    
    // ESCUCHAR CAMBIOS DE RED
    this.networkSubscription = this.networkService.currentNetwork$.subscribe(
      network => {
        if (network) {
          const previousChainId = this.currentNetwork?.chainId;
          this.currentNetwork = network;
          
          // Solo recargar si la red realmente cambió
          if (previousChainId && previousChainId !== network.chainId) {
            console.log(`🔄 Red cambiada de ${previousChainId} a ${network.chainId}`);
            this.filterTransactionsByCurrentNetwork(); // FILTRAR INMEDIATAMENTE
          }
          
          this.loadBalance();
          this.refreshSubject.next();
          
          if (this.isContractInitialized) {
            this.contractService.reinitializeProvider();
            this.updateContractBalance();
          }
        }
      }
    );

    if (this.isBrowser) {
      const savedContractAddress = localStorage.getItem('contractAddress');
      if (savedContractAddress) {
        this.contractAddress = savedContractAddress;
        this.initializeContract();
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.networkSubscription) {
      this.networkSubscription.unsubscribe();
    }
    
    if (this.isBrowser && (window as any).ethereum) {
      (window as any).ethereum.removeAllListeners();
    }
  }

  private async initWallet() {
    if (!this.isBrowser) {
      return;
    }
    
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_accounts'
        });
        
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          this.isConnected = true;
          await this.loadNetworkInfo();
          await this.loadBalance();
          this.refreshSubject.next();
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
    if (!this.isBrowser) {
      return;
    }
    
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', async (accounts: string[]) => {
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          await this.loadBalance();
          this.refreshSubject.next();
          this.showNotification('Cuenta cambiada exitosamente', 'info');
        } else {
          this.router.navigate(['/']);
        }
      });
    }
  }

  private async loadNetworkInfo() {
    if (!this.isBrowser) {
      return;
    }
    
    try {
      const currentNetwork = this.networkService.getCurrentNetwork();
      if (currentNetwork) {
        this.currentNetwork = currentNetwork;
      } else {
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
    if (!this.isBrowser) {
      return;
    }
    
    try {
      if (this.currentNetwork && this.walletAddress) {
        const balance = await this.walletService.getBalance(this.walletAddress, this.currentNetwork.chainId);
        this.balance = parseFloat(balance).toFixed(6);
        localStorage.setItem(`balance_${this.walletAddress}_${this.currentNetwork.chainId}`, this.balance);
      }
    } catch (error: any) {
      console.error('Error loading balance:', error);
      const storedBalance = localStorage.getItem(`balance_${this.walletAddress}_${this.currentNetwork?.chainId}`);
      if (storedBalance) {
        this.balance = storedBalance;
      }
    }
  }

  // ============================================
  // MÉTODO PRINCIPAL: CARGAR TRANSACCIONES
  // ============================================
  private async loadLocalTransactions() {
    if (!this.isBrowser) {
      return;
    }

    // 1. Cargar TODAS las transacciones del localStorage (sin filtrar)
    const stored = localStorage.getItem(`transactions_${this.walletAddress}`);
    let localTxs: Transaction[] = [];
    
    if (stored) {
      try {
        const storageData = JSON.parse(stored);
        
        if (storageData.expiresAt && new Date().getTime() > storageData.expiresAt) {
          localStorage.removeItem(`transactions_${this.walletAddress}`);
          console.log('📅 Local storage data expired, cleared');
        } else {
          localTxs = (storageData.transactions || []).map((tx: any) => ({
            ...tx,
            timestamp: new Date(tx.timestamp)
          }));
        }
      } catch (error: any) {
        console.error('❌ Error parsing local transactions:', error);
        localStorage.removeItem(`transactions_${this.walletAddress}`);
      }
    }
    
    // 2. Guardar TODAS las transacciones
    this.allTransactions = localTxs;
    
    // 3. FILTRAR por red actual
    this.filterTransactionsByCurrentNetwork();
    
    if (localTxs.length > 0) {
      console.log(`✅ Cargadas ${localTxs.length} transacciones totales, mostrando ${this.transactions.length} de la red actual`);
    }
    
    // 4. Cargar desde Etherscan si es posible
    if (this.currentNetwork && this.walletAddress) {
      this.isLoadingTransactions = true;
      try {
        const networkMap: { [key: string]: string } = {
          '0x1': 'mainnet',
          '0xaa36a7': 'sepolia',
          '0x4268': 'holesky',
          '0x89': 'polygon',
          '0x13881': 'mumbai'
        };
        
        const networkName = networkMap[this.currentNetwork.chainId] || 'mainnet';
        
        this.etherscanService.getAllTransactions(this.walletAddress, networkName).subscribe(
          (etherscanTxs: EtherscanTransaction[]) => {
            const mappedTxs: Transaction[] = etherscanTxs.map(tx => {
              const explorerUrl = this.etherscanService.getExplorerUrl(tx.network, tx.hash);
              
              return {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.amount,
                timestamp: new Date(tx.timestamp),
                status: tx.isError ? 'failed' : 'success',
                network: tx.network,
                chainId: this.currentNetwork?.chainId || '0x1',
                explorerUrl: explorerUrl
              };
            });
            
            // Combinar con transacciones locales
            const mergedTxs = [...mappedTxs, ...this.allTransactions];
            const uniqueTxs = mergedTxs.filter((tx, index, self) => 
              index === self.findIndex(t => t.hash === tx.hash)
            );
            
            // Guardar TODAS las transacciones
            this.allTransactions = uniqueTxs;
            
            // Guardar en localStorage
            this.saveTransactionsToLocalStorage(this.allTransactions);
            
            // FILTRAR por red actual
            this.filterTransactionsByCurrentNetwork();
            
            if (mappedTxs.length > 0) {
              this.showNotification(`📥 Cargadas ${mappedTxs.length} transacciones desde Etherscan`, 'success');
            }
            
            this.isLoadingTransactions = false;
          },
          (error) => {
            console.error('❌ Error loading Etherscan transactions:', error);
            this.filterTransactionsByCurrentNetwork();
            this.isLoadingTransactions = false;
          }
        );
      } catch (error: any) {
        console.error('❌ Error initiating Etherscan API call:', error);
        this.filterTransactionsByCurrentNetwork();
        this.isLoadingTransactions = false;
      }
    }
  }

  // ============================================
  // NUEVO MÉTODO: FILTRAR POR RED ACTUAL
  // ============================================
  private filterTransactionsByCurrentNetwork() {
    if (!this.currentNetwork) {
      this.transactions = [];
      return;
    }

    // Filtrar transacciones que coincidan con el chainId actual
    this.transactions = this.allTransactions
      .filter(tx => tx.chainId === this.currentNetwork!.chainId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    console.log(`🔍 Filtrando transacciones: ${this.allTransactions.length} totales → ${this.transactions.length} de ${this.currentNetwork.name}`);
  }

  // ============================================
  // GUARDAR TRANSACCIÓN (actualizado)
  // ============================================
  saveTransaction(tx: Transaction) {
    if (!tx.explorerUrl && tx.chainId && tx.hash) {
      const network = this.networkService.getNetworkByChainId(tx.chainId);
      if (network?.explorer) {
        tx.explorerUrl = `${network.explorer}/tx/${tx.hash}`;
      }
    }
    
    // Actualizar en allTransactions
    const existingIndex = this.allTransactions.findIndex(t => t.hash === tx.hash);
    
    if (existingIndex !== -1) {
      this.allTransactions[existingIndex] = tx;
    } else {
      this.allTransactions.unshift(tx);
    }
    
    // Guardar TODO en localStorage
    this.saveTransactionsToLocalStorage(this.allTransactions);
    
    // FILTRAR por red actual
    this.filterTransactionsByCurrentNetwork();
  }

  private saveTransactionsToLocalStorage(transactions: Transaction[]) {
    if (!this.isBrowser) {
      return;
    }

    try {
      // Mantener transacciones recientes de TODAS las redes
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
      
      console.log(`💾 Guardadas ${recentTxs.length} transacciones en localStorage`);
    } catch (error) {
      console.error('Error saving transactions to localStorage:', error);
    }
  }

  async sendTransaction() {
    if (!this.isBrowser) {
      return;
    }
    
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

    if (this.useContract) {
      if (!this.isContractInitialized) {
        this.showNotification('Por favor inicializa el contrato primero', 'error');
        return;
      }
      await this.sendViaContract();
    } else {
      if (parseFloat(this.amount) > parseFloat(this.balance)) {
        this.showNotification('Saldo insuficiente', 'error');
        return;
      }
      await this.sendDirectTransaction();
    }
  }

  private async sendDirectTransaction() {
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
        explorerUrl: this.currentNetwork?.explorer ? `${this.currentNetwork.explorer}/tx/${txHash}` : undefined,
        isContractTransaction: false
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

  private async sendViaContract() {
    this.isSending = true;

    try {
      const txHash = await this.contractService.sendContractTransaction(
        this.recipientAddress,
        this.amount
      );

      if (txHash) {
        const transaction: Transaction = {
          hash: txHash,
          from: this.contractService.getContractAddress(),
          to: this.recipientAddress,
          value: this.amount,
          timestamp: new Date(),
          status: 'pending',
          network: this.currentNetwork?.name || 'Unknown',
          chainId: this.currentNetwork?.chainId || '0x1',
          explorerUrl: this.currentNetwork?.explorer ? `${this.currentNetwork.explorer}/tx/${txHash}` : undefined,
          isContractTransaction: true
        };

        this.saveTransaction(transaction);

        this.recipientAddress = '';
        this.amount = '';

        this.showNotification(`Transacción de contrato enviada! Hash: ${this.formatAddress(txHash)}`, 'success');

        setTimeout(async () => {
          await this.loadBalance();
          await this.updateContractBalance();
        }, 2000);

        this.checkTransactionStatus(txHash);
      }
    } catch (error: any) {
      console.error('Error sending contract transaction:', error);
      if (error.code === 4001) {
        this.showNotification('Transacción cancelada por el usuario', 'info');
      } else {
        this.showNotification('Error al enviar la transacción de contrato: ' + error.message, 'error');
      }
    } finally {
      this.isSending = false;
    }
  }

  async depositToContract() {
    if (!this.isBrowser || !this.isContractInitialized) {
      this.showNotification('Contrato no inicializado', 'error');
      return;
    }

    if (!this.amount) {
      this.showNotification('Ingresa un monto para depositar', 'error');
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
      const txHash = await this.contractService.depositToContract(this.amount);

      if (txHash) {
        const transaction: Transaction = {
          hash: txHash,
          from: this.walletAddress,
          to: this.contractService.getContractAddress(),
          value: this.amount,
          timestamp: new Date(),
          status: 'pending',
          network: this.currentNetwork?.name || 'Unknown',
          chainId: this.currentNetwork?.chainId || '0x1',
          explorerUrl: this.currentNetwork?.explorer ? `${this.currentNetwork.explorer}/tx/${txHash}` : undefined,
          isContractTransaction: true
        };

        this.saveTransaction(transaction);

        this.amount = '';

        this.showNotification(`Depósito realizado! Hash: ${this.formatAddress(txHash)}`, 'success');

        setTimeout(async () => {
          await this.loadBalance();
          await this.updateContractBalance();
        }, 2000);

        this.checkTransactionStatus(txHash);
      }
    } catch (error: any) {
      console.error('Error depositing to contract:', error);
      if (error.code === 4001) {
        this.showNotification('Depósito cancelado por el usuario', 'info');
      } else {
        this.showNotification('Error al depositar: ' + error.message, 'error');
      }
    } finally {
      this.isSending = false;
    }
  }

  async initializeContract() {
    if (!this.contractAddress) {
      this.showNotification('Ingresa una dirección de contrato', 'error');
      return;
    }

    if (!this.isValidAddress(this.contractAddress)) {
      this.showNotification('Dirección de contrato inválida', 'error');
      return;
    }

    try {
      const success = await this.contractService.initContract(this.contractAddress);
      
      if (success) {
        this.isContractInitialized = true;
        await this.updateContractBalance();
        
        if (this.isBrowser) {
          localStorage.setItem('contractAddress', this.contractAddress);
        }
        
        this.showNotification('Contrato inicializado exitosamente', 'success');
      } else {
        this.showNotification('No se pudo inicializar el contrato', 'error');
      }
    } catch (error: any) {
      console.error('Error initializing contract:', error);
      this.showNotification('Error al inicializar el contrato: ' + error.message, 'error');
    }
  }

  async updateContractBalance() {
    if (this.isContractInitialized) {
      try {
        this.contractBalance = await this.contractService.updateContractBalance();
      } catch (error) {
        console.error('Error updating contract balance:', error);
      }
    }
  }

  clearContract() {
    this.contractService.clearContract();
    this.isContractInitialized = false;
    this.contractAddress = '';
    this.contractBalance = '0';
    
    if (this.isBrowser) {
      localStorage.removeItem('contractAddress');
    }
    
    this.showNotification('Contrato limpiado', 'info');
  }

  private async checkTransactionStatus(txHash: string) {
    if (!this.isBrowser) {
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 40;

    const checkStatus = async () => {
      try {
        const receipt = await (window as any).ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        });

        if (receipt) {
          const tx = this.allTransactions.find(t => t.hash === txHash);
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
            if (this.isContractInitialized) {
              await this.updateContractBalance();
            }
          }
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 3000);
        } else {
          const tx = this.allTransactions.find(t => t.hash === txHash);
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

  isValidAmount(): boolean {
    if (!this.amount) return false;
    const numAmount = parseFloat(this.amount);
    return !isNaN(numAmount) && numAmount > 0;
  }

  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  copyToClipboard(text: string, label: string = 'Hash') {
    if (!this.isBrowser) {
      return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
      this.showNotification(`${label} copiado al portapapeles`, 'success');
    }).catch(err => {
      console.error('Error al copiar:', err);
      this.showNotification('Error al copiar', 'error');
    });
  }

  viewOnExplorer(txHash: string, chainId?: string) {
    if (!this.isBrowser) {
      return;
    }
    
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
    if (!this.isBrowser) {
      return;
    }
    
    const network = this.networkService.getNetworkByChainId(tx.chainId) || this.networkService.getCurrentNetwork();
    const explorerUrl = this.getExplorerUrl(tx) || 'No disponible';
    const txType = tx.isContractTransaction ? '📜 Transacción de Contrato' : '💸 Transacción Directa';
    
    const details = `
${txType}
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
    
    const shouldOpenExplorer = confirm(`${details}\n\n¿Quieres abrir esta transacción en el explorador de bloques?`);
    if (shouldOpenExplorer && explorerUrl !== 'No disponible') {
      window.open(explorerUrl, '_blank');
    }
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
    if (this.isBrowser && (window as any).ethereum) {
      (window as any).ethereum.removeAllListeners();
    }
    
    if (this.isBrowser) {
      localStorage.removeItem(`transactions_${this.walletAddress}`);
      localStorage.removeItem('account');
    }
    
    this.walletAddress = '';
    this.isConnected = false;
    this.allTransactions = [];
    this.transactions = [];
    this.balance = '0';
    
    this.walletService.logout();
    
    this.router.navigate(['/login']);
  }

  setMaxAmount() {
    if (this.useContract && this.isContractInitialized) {
      this.amount = parseFloat(this.contractBalance).toFixed(6);
    } else {
      const maxSendable = Math.max(0, parseFloat(this.balance) - 0.001);
      this.amount = maxSendable.toFixed(6);
    }
  }

  onAddressInput(event: any) {
    this.recipientAddress = event.target.value;
  }

  onAmountInput(event: any) {
    this.amount = event.target.value;
  }

  async refreshTransactions() {
    this.showNotification('Actualizando transacciones...', 'info');
    this.allTransactions = [];
    this.transactions = [];
    this.refreshSubject.next();
  }

  clearTransactionHistory() {
    if (!this.isBrowser) {
      return;
    }
    
    if (confirm('¿Estás seguro de que deseas borrar el historial local?')) {
      localStorage.removeItem(`transactions_${this.walletAddress}`);
      this.allTransactions = [];
      this.transactions = [];
      this.showNotification('Historial local eliminado', 'info');
    }
  }

  backupTransactions() {
    if (this.allTransactions.length > 0) {
      this.saveTransactionsToLocalStorage(this.allTransactions);
      this.showNotification(`Respaldo de ${this.allTransactions.length} transacciones guardado`, 'success');
    } else {
      this.showNotification('No hay transacciones para respaldar', 'info');
    }
  }

  getExplorerUrl(tx: Transaction): string | undefined {
    if (tx.explorerUrl) {
      return tx.explorerUrl;
    }
    
    const network = this.networkService.getNetworkByChainId(tx.chainId);
    if (network?.explorer) {
      return `${network.explorer}/tx/${tx.hash}`;
    }
    
    if (tx.network) {
      return this.etherscanService.getExplorerUrl(tx.network, tx.hash);
    }
    
    return undefined;
  }

  async switchNetwork(chainId: string) {
    const success = await this.walletService.switchNetwork(chainId);
    if (success) {
      this.showNotification(`Red cambiada exitosamente`, 'success');
    } else {
      this.showNotification(`Error al cambiar de red`, 'error');
    }
  }
}