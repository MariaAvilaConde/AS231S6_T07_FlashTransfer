import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { EtherscanService, EtherscanTransaction } from '../../../service/etherscan.service';
import { WalletService } from '../../../service/wallet.service';
import { NetworkService } from '../../../service/network.service';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent implements OnInit, OnDestroy {
  transactions: EtherscanTransaction[] = [];
  filteredTransactions: EtherscanTransaction[] = [];
  loading: boolean = false;
  error: string = '';
  address: string = '';
  currentNetwork: string = '';
  currentChainId: string = '';
  Math = Math;
  
  // Filtros
  filterType: 'all' | 'sent' | 'received' | 'token' = 'all';
  searchTerm: string = '';
  
  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  private subscriptions: Subscription[] = [];

  constructor(
    private etherscanService: EtherscanService,
    private walletService: WalletService,
    private networkService: NetworkService
  ) {}

  ngOnInit(): void {
    this.address = this.walletService.getAccount() ?? '';
    this.updateNetworkInfo();
    
    if (this.address) {
      this.loadTransactions();
    }
    
    // Escuchar cambios de red desde NetworkService (más confiable)
    const networkSub = this.networkService.chainChanged$.subscribe(chainId => {
      console.log(`🔄 Red cambiada en History: ${chainId}`);
      this.currentChainId = chainId;
      this.updateNetworkInfo();
      this.resetAndReload();
    });
    this.subscriptions.push(networkSub);

    // También escuchar desde WalletService como respaldo
    const walletNetSub = this.walletService.networkChanged$.subscribe(network => {
      console.log(`🔄 Network changed (wallet): ${network}`);
      this.updateNetworkInfo();
      this.resetAndReload();
    });
    this.subscriptions.push(walletNetSub);

    // Iniciar listener de cambios de red
    this.networkService.listenToNetworkChanges();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private updateNetworkInfo(): void {
    const network = this.networkService.getCurrentNetwork();
    if (network) {
      this.currentChainId = network.chainId;
      // Extraer nombre simple para Etherscan
      this.currentNetwork = this.getSimpleNetworkName(network.name);
      console.log(`📡 Red actual: ${network.name} (${this.currentNetwork})`);
    }
  }

  private getSimpleNetworkName(fullName: string): string {
    // Mapear nombres completos a nombres simples que espera EtherscanService
    const nameMap: { [key: string]: string } = {
      'Ethereum Mainnet': 'mainnet',
      'Sepolia Testnet': 'sepolia',
      'Holesky Testnet': 'holesky',
      'Polygon Mainnet': 'polygon',
      'Mumbai Testnet': 'mumbai',
      'Goerli Testnet': 'goerli'
    };
    return nameMap[fullName] || fullName.toLowerCase().split(' ')[0];
  }

  private resetAndReload(): void {
    // Limpiar cache para esta dirección al cambiar de red
    this.etherscanService.clearCacheForAddress(this.address);
    // Resetear filtros y paginación
    this.transactions = [];
    this.filteredTransactions = [];
    this.filterType = 'all';
    this.searchTerm = '';
    this.currentPage = 1;
    this.error = '';
    // Recargar
    this.loadTransactions();
  }

  loadTransactions(): void {
    if (!this.address) {
      this.error = 'No hay wallet conectada';
      return;
    }
    
    this.loading = true;
    this.error = '';
    
    console.log(`🔍 Cargando transacciones para ${this.address} en ${this.currentNetwork}`);
    
    this.etherscanService.getAllTransactions(this.address, this.currentNetwork)
      .subscribe({
        next: (data) => {
          this.transactions = data;
          
          // For each transaction, get its status
          const statusRequests = this.transactions.map(tx => 
            forkJoin({
              receiptStatus: this.etherscanService.getTransactionReceiptStatus(tx.hash, this.currentNetwork),
              status: this.etherscanService.getTransactionStatus(tx.hash, this.currentNetwork)
            })
          );
          
          // Update transactions with status information
          if (statusRequests.length > 0) {
            forkJoin(statusRequests).subscribe(statusResults => {
              this.transactions = this.transactions.map((tx, index) => {
                const statusData = statusResults[index];
                return {
                  ...tx,
                  receiptStatus: statusData.receiptStatus,
                  txStatus: statusData.status
                };
              });
              this.applyFilters();
              this.loading = false;
              console.log(`✅ ${data.length} transacciones cargadas en ${this.currentNetwork}`);
            });
          } else {
            this.applyFilters();
            this.loading = false;
            console.log(`✅ ${data.length} transacciones cargadas en ${this.currentNetwork}`);
          }
        },
        error: (err) => {
          console.error('Error loading transactions:', err);
          this.error = `Error al cargar transacciones en ${this.currentNetwork}. Intenta nuevamente.`;
          this.loading = false;
        }
      });
  }

  applyFilters(): void {
    let filtered = [...this.transactions];
    
    // Filtrar por tipo
    if (this.filterType === 'sent') {
      filtered = filtered.filter(tx => tx.from.toLowerCase() === this.address.toLowerCase());
    } else if (this.filterType === 'received') {
      filtered = filtered.filter(tx => tx.to.toLowerCase() === this.address.toLowerCase());
    } else if (this.filterType === 'token') {
      filtered = filtered.filter(tx => tx.isToken);
    }
    
    // Filtrar por búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.hash.toLowerCase().includes(term) ||
        tx.from.toLowerCase().includes(term) ||
        tx.to.toLowerCase().includes(term) ||
        (tx.tokenSymbol && tx.tokenSymbol.toLowerCase().includes(term))
      );
    }
    
    this.filteredTransactions = filtered;
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage) || 1;
    this.currentPage = 1;
  }

  getPaginatedTransactions(): EtherscanTransaction[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredTransactions.slice(start, end);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  shortenAddress(addr: string): string {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  shortenHash(hash: string): string {
    if (!hash) return '';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTransactionType(tx: EtherscanTransaction): string {
    if (tx.from.toLowerCase() === this.address.toLowerCase()) {
      return 'Enviado';
    }
    return 'Recibido';
  }

  getTransactionIcon(tx: EtherscanTransaction): string {
    if (tx.from.toLowerCase() === this.address.toLowerCase()) {
      return 'arrow-up';
    }
    return 'arrow-down';
  }

  getTransactionColor(tx: EtherscanTransaction): string {
    if (tx.from.toLowerCase() === this.address.toLowerCase()) {
      return 'text-red-600';
    }
    return 'text-green-600';
  }

  getTransactionStatusText(tx: EtherscanTransaction): string {
    // If we have specific status information, use it
    if (tx.txStatus) {
      if (tx.txStatus.isError === '0') {
        return 'Success';
      } else if (tx.txStatus.isError === '1') {
        return 'Failed';
      }
    }
    
    // Fallback to existing error status
    if (tx.isError) {
      return 'Failed';
    }
    
    return 'Success';
  }

  getTransactionStatusClass(tx: EtherscanTransaction): string {
    // If we have specific status information, use it
    if (tx.txStatus) {
      if (tx.txStatus.isError === '0') {
        return 'bg-green-100 text-green-800';
      } else if (tx.txStatus.isError === '1') {
        return 'bg-red-100 text-red-800';
      }
    }
    
    // Fallback to existing error status
    if (tx.isError) {
      return 'bg-red-100 text-red-800';
    }
    
    return 'bg-green-100 text-green-800';
  }

  getNetworkDisplayName(): string {
    const network = this.networkService.getCurrentNetwork();
    return network ? network.name : this.currentNetwork;
  }

  getNetworkSymbol(): string {
    const network = this.networkService.getCurrentNetwork();
    return network ? network.symbol : 'ETH';
  }

  isTestnet(): boolean {
    return this.networkService.isTestnet(this.currentChainId);
  }

  openInExplorer(tx: EtherscanTransaction): void {
    const url = this.etherscanService.getExplorerUrl(this.currentNetwork, tx.hash);
    window.open(url, '_blank');
  }

  refresh(): void {
    this.etherscanService.clearCacheForAddress(this.address);
    this.loadTransactions();
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('📋 Copiado al portapapeles');
    });
  }
}