import { Component, type OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ethers } from 'ethers';
import { WalletService } from '../../../service/wallet.service';
import { NetworkService, Network as NetworkModel } from '../../../service/network.service';
import { EtherscanService } from '../../../service/etherscan.service'; // Add this import
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

// Add QRCode import
import QRCode from 'qrcode';

interface TokenBalance {
  symbol: string;
  balance: string;
  usdValue: string;
  icon: string;
  contractAddress?: string;
  decimals: number;
}

interface NetworkConfig {
  chainId: string;
  name: string;
  rpcUrl: string;
  explorer: string;
  nativeCurrency: string;
}

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.css'
})
export class WalletComponent implements OnInit, OnDestroy {
  walletAddress = '';
  ethBalance = '0.00';
  usdBalance = '0.00';
  isLoading = true;
  networkName = '';
  chainId = '';
  private isBrowser: boolean;
  
  // Add QR code properties
  showQRCode = false;
  qrCodeDataUrl = '';
  qrCodeSvg = '';
  isGeneratingQR = false;
  
  // Add transaction history properties
  loadingTransactions = false;

  // Configuración de redes soportadas - URLS SIN CORS
  supportedNetworks: { [key: string]: NetworkConfig } = {
    '0x1': {
      chainId: '0x1',
      name: 'Ethereum Mainnet',
      rpcUrl: 'https://cloudflare-eth.com',
      explorer: 'https://etherscan.io',
      nativeCurrency: 'ETH'
    },
    '0xaa36a7': {
      chainId: '0xaa36a7',
      name: 'Sepolia Testnet',
      rpcUrl: 'https://rpc.sepolia.org',
      explorer: 'https://sepolia.etherscan.io',
      nativeCurrency: 'ETH'
    },
    '0x4268': {
      chainId: '0x4268',
      name: 'Ethereum Holesky',
      rpcUrl: 'https://holesky.drpc.org',
      explorer: 'https://holesky.etherscan.io',
      nativeCurrency: 'ETH'
    },
    '0x5': {
      chainId: '0x5',
      name: 'Goerli Testnet',
      rpcUrl: 'https://rpc.goerli.ethpandaops.io',
      explorer: 'https://goerli.etherscan.io',
      nativeCurrency: 'ETH'
    },
    '0x89': {
      chainId: '0x89',
      name: 'Polygon Mainnet',
      rpcUrl: 'https://polygon-rpc.com',
      explorer: 'https://polygonscan.com',
      nativeCurrency: 'MATIC'
    },
    '0x13881': {
      chainId: '0x13881',
      name: 'Mumbai Testnet',
      rpcUrl: 'https://rpc-mumbai.maticvigil.com',
      explorer: 'https://mumbai.polygonscan.com',
      nativeCurrency: 'MATIC'
    }
  };

  // Tokens comunes por red
  tokenConfigs: { [key: string]: TokenBalance[] } = {
    '0x1': [
      { symbol: 'ETH', balance: '0.00', usdValue: '0.00', icon: '⟠', decimals: 18 },
      { symbol: 'USDT', balance: '0.00', usdValue: '0.00', icon: '₮', contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      { symbol: 'USDC', balance: '0.00', usdValue: '0.00', icon: '◎', contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    ],
    '0xaa36a7': [
      { symbol: 'ETH', balance: '0.00', usdValue: '0.00', icon: '⟠', decimals: 18 },
      { symbol: 'USDT', balance: '0.00', usdValue: '0.00', icon: '₮', contractAddress: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', decimals: 6 },
      { symbol: 'USDC', balance: '0.00', usdValue: '0.00', icon: '◎', contractAddress: '0x8267cF9254734C6Eb452a7bb9AAF97B392258b21', decimals: 6 },
    ],
    '0x4268': [
      { symbol: 'ETH', balance: '0.00', usdValue: '0.00', icon: '⟠', decimals: 18 }
    ],
    '0x5': [
      { symbol: 'ETH', balance: '0.00', usdValue: '0.00', icon: '⟠', decimals: 18 }
    ],
    '0x89': [
      { symbol: 'MATIC', balance: '0.00', usdValue: '0.00', icon: '⬡', decimals: 18 },
      { symbol: 'USDT', balance: '0.00', usdValue: '0.00', icon: '₮', contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
      { symbol: 'USDC', balance: '0.00', usdValue: '0.00', icon: '◎', contractAddress: '0x2791Bca1f2de4661ED88A30C94Ea2A0212e71B23', decimals: 6 },
    ],
    '0x13881': [
      { symbol: 'MATIC', balance: '0.00', usdValue: '0.00', icon: '⬡', decimals: 18 },
      { symbol: 'USDT', balance: '0.00', usdValue: '0.00', icon: '₮', contractAddress: '0xA02F6adc7926efeBBd59Fd43A84f4E0c0c91e832', decimals: 6 },
      { symbol: 'USDC', balance: '0.00', usdValue: '0.00', icon: '◎', contractAddress: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23', decimals: 6 },
    ]
  };

  tokenBalances: TokenBalance[] = [];
  recentTransactions: any[] = [];

  private ethereum: any;
  private destroy$ = new Subject<void>();
  private refreshSubject = new Subject<void>();

  constructor(
    private router: Router, 
    private walletService: WalletService, 
    private networkService: NetworkService,
    private etherscanService: EtherscanService, // Add this
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    // Only access window in browser environment
    this.ethereum = this.isBrowser ? (window as any).ethereum : undefined;
  }

  async ngOnInit() {
    // Setup debounced refresh
    this.refreshSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadWalletData();
    });

    await this.loadWalletData();
    this.setupEventListeners();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.removeEventListeners();
  }

  private setupEventListeners() {
    // Only set up event listeners in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    if (this.ethereum) {
      // Remove existing listeners first to prevent duplicates
      this.removeEventListeners();
      
      // Escuchar cambios de cuenta (cuando el usuario cambia de wallet)
      this.ethereum.on('accountsChanged', (accounts: string[]) => {
        console.log('Accounts changed:', accounts);
        if (accounts.length === 0) {
          this.handleWalletDisconnect();
        } else {
          this.walletAddress = accounts[0];
          this.refreshSubject.next();
        }
      });

      // Escuchar cambios de red (cuando el usuario cambia de red)
      this.ethereum.on('chainChanged', (chainId: string) => {
        console.log('Chain changed to:', chainId);
        this.chainId = chainId;
        this.networkName = this.getNetworkName(chainId);
        // Reset cache when network changes
        (this.walletService as any).balanceCache.clear();
        // Load balances for the new network (don't reload all wallet data)
        this.loadBalancesForNetwork(chainId);
        
        // Notify the network service of the change
        const network = this.networkService.getNetworkByChainId(chainId);
        if (network) {
          this.networkService.setCurrentNetwork(network);
        }
      });

      // Escuchar cuando se conecta la wallet
      this.ethereum.on('connect', (connectInfo: any) => {
        console.log('Wallet connected:', connectInfo);
        this.refreshSubject.next();
      });

      // Escuchar cuando se desconecta la wallet
      this.ethereum.on('disconnect', (error: any) => {
        console.log('Wallet disconnected:', error);
        this.handleWalletDisconnect();
      });
    }
  }

  private handleWalletDisconnect() {
    // Ensure we only navigate once
    if (this.router.url !== '/') {
      this.walletService.logout();
      this.router.navigate(['/']);
    }
  }

  private removeEventListeners() {
    // Only remove event listeners in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    if (this.ethereum) {
      this.ethereum.removeAllListeners('accountsChanged');
      this.ethereum.removeAllListeners('chainChanged');
      this.ethereum.removeAllListeners('connect');
      this.ethereum.removeAllListeners('disconnect');
    }
  }

  private async loadWalletData() {
    // Only run in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    this.isLoading = true;
    
    if (this.ethereum) {
      try {
        // Get connected accounts
        const accounts = await this.ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts.length === 0) {
          this.router.navigate(['/']);
          return;
        }

        this.walletAddress = accounts[0];

        // Get network info
        const chainId = await this.ethereum.request({
          method: 'eth_chainId',
        });
        
        this.chainId = chainId;
        this.networkName = this.getNetworkName(chainId);
        
        // Notify the network service of the current network
        const currentNetwork = this.networkService.getNetworkByChainId(chainId);
        if (currentNetwork) {
          this.networkService.setCurrentNetwork(currentNetwork);
        }
        
        // Cargar tokens para la red actual
        this.tokenBalances = this.tokenConfigs[chainId] || [
          { symbol: 'ETH', balance: '0.00', usdValue: '0.00', icon: '⟠', decimals: 18 }
        ];

        // Reset balances mientras se cargan los nuevos
        this.resetBalances();

        // Obtener saldos usando ethers.js
        await this.loadBalances(chainId);
        
        // Load recent transactions
        await this.loadRecentTransactions();

      } catch (error: any) {
        console.error('Error loading wallet data:', error);
        // Show user-friendly error message
        this.showNotification('Error al cargar datos de la wallet: ' + (error.message || 'Error desconocido'), 'error');
      } finally {
        this.isLoading = false;
      }
    } else {
      this.showNotification('MetaMask no detectado', 'error');
      this.router.navigate(['/']);
    }
  }

  private resetBalances() {
    this.ethBalance = '0.00';
    this.usdBalance = '0.00';
    this.tokenBalances.forEach(token => {
      token.balance = '0.00';
      token.usdValue = '0.00';
    });
  }

  private async loadBalances(chainId: string) {
    if (!this.isBrowser) return;
    
    const networkConfig = this.supportedNetworks[chainId];
    if (!networkConfig) {
      console.error('Red no soportada:', chainId);
      this.showNotification('Red no soportada: ' + chainId, 'error');
      return;
    }

    try {
      // Obtener balance nativo (ETH, MATIC, etc.)
      const nativeBalanceFormatted = await this.walletService.getBalance(this.walletAddress, chainId);
      
      const nativeToken = this.tokenBalances.find(token => 
        token.symbol === networkConfig.nativeCurrency
      );
      
      if (nativeToken) {
        nativeToken.balance = parseFloat(nativeBalanceFormatted).toFixed(4);
        this.ethBalance = nativeToken.balance;
        
        const usdValue = await this.getTokenUSDValue(networkConfig.nativeCurrency, nativeBalanceFormatted);
        nativeToken.usdValue = usdValue;
        this.usdBalance = usdValue;
      }

      // ⚠️ TOKENS ERC-20 DESHABILITADOS EN CODESPACES
      // GitHub Codespaces bloquea todas las conexiones RPC por CORS
      // Descomentar esta línea cuando trabajes en local o producción:
      // await this.loadERC20Balances();
      
      console.log('ℹ️ Balances de tokens ERC-20 deshabilitados (limitación de Codespaces)');

    } catch (error: any) {
      console.error('Error loading balances:', error);
      this.showNotification('Error al cargar saldos: ' + (error.message || 'Error desconocido'), 'error');
    }
  }

  private async loadERC20Balances() {
    const batchSize = 3;
    for (let i = 0; i < this.tokenBalances.length; i += batchSize) {
      const batch = this.tokenBalances.slice(i, i + batchSize);
      const promises = batch
        .filter(token => token.contractAddress)
        .map(token => this.fetchTokenBalance(token));
      
      await Promise.all(promises);
    }
  }

  private async fetchTokenBalance(token: TokenBalance) {
    if (!this.isBrowser) return;
    
    try {
      const provider = this.walletService.getProvider();
      if (!provider) throw new Error('Provider no disponible');
      
      const abi = ['function balanceOf(address) view returns (uint256)'];
      const contract = new ethers.Contract(token.contractAddress!, abi, provider);
      
      try {
        const balance = await contract['balanceOf'](this.walletAddress);
        const formattedBalance = ethers.formatUnits(balance, token.decimals);
        
        token.balance = parseFloat(formattedBalance).toFixed(4);
        
        const usdValue = await this.getTokenUSDValue(token.symbol, formattedBalance);
        token.usdValue = usdValue;
      } catch (balanceError: any) {
        console.warn(`⚠️ No se pudo obtener balance de ${token.symbol}`);
        token.balance = '0.00';
        token.usdValue = '0.00';
      }
      
    } catch (error: any) {
      console.error(`Error loading balance for ${token.symbol}:`, error);
      token.balance = 'Error';
      token.usdValue = '0.00';
    }
  }

  private async getTokenUSDValue(symbol: string, amount: string): Promise<string> {
    // Only run in browser environment
    if (!this.isBrowser) {
      return '0.00';
    }
    
    try {
      // Usar CoinGecko API para precios
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${this.getCoinGeckoId(symbol)}&vs_currencies=usd`
      );
      
      const data = await response.json();
      const coinId = this.getCoinGeckoId(symbol);
      const price = data[coinId]?.usd || 0;
      
      return (parseFloat(amount) * price).toFixed(2);
    } catch (error: any) {
      console.error('Error fetching USD value:', error);
      // Valores por defecto para testing
      const mockPrices: { [key: string]: number } = {
        'ETH': 2300,
        'MATIC': 0.8,
        'USDT': 1,
        'USDC': 1
      };
      return (parseFloat(amount) * (mockPrices[symbol] || 0)).toFixed(2);
    }
  }

  getCoinGeckoId(symbol: string): string {
    const ids: { [key: string]: string } = {
      'ETH': 'ethereum',
      'MATIC': 'matic-network',
      'USDT': 'tether',
      'USDC': 'usd-coin'
    };
    return ids[symbol] || 'ethereum';
  }

  getNetworkName(chainId: string): string {
    return this.supportedNetworks[chainId]?.name || 'Red Desconocida';
  }

  // Método helper para obtener la moneda nativa
  getNativeCurrency(): string {
    return this.supportedNetworks[this.chainId]?.nativeCurrency || 'ETH';
  }

  formatAddress(address: string): string {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  copyAddress() {
    // Only run in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    navigator.clipboard.writeText(this.walletAddress);
    this.showNotification('Dirección copiada al portapapeles', 'success');
  }

  async refreshBalance() {
    // Only run in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    // Clear cache before refreshing
    (this.walletService as any).balanceCache.clear();
    this.refreshSubject.next();
    
    // Also refresh transactions
    this.loadRecentTransactions();
  }

  disconnect() {
    console.log('Disconnecting wallet...');
    // Remove event listeners first
    this.removeEventListeners();
    // Clear wallet service data
    this.walletService.logout();
    // Navigate to home
    this.router.navigate(['/']);
  }

  sendTokens() {
    // Navegar a la vista de transacciones
    console.log('Navigating to transaction page');
    this.router.navigate(['/transaction']).catch(error => {
      console.error('Navigation error:', error);
      // Show user-friendly error message
      alert('Error al navegar a la página de transacciones. Por favor, inténtalo de nuevo.');
    });
  }

  viewAllTransactions() {
    this.router.navigate(['/transaction']);
  }

  // Enhanced QR code generation method
  private async generateQRCode(data: string) {
    try {
      if (!data) {
        throw new Error('No data provided for QR code generation');
      }
      
      this.isGeneratingQR = true;
      console.log('Generating QR code with data:', data);
      
      // Generate both PNG and SVG versions
      this.qrCodeDataUrl = await QRCode.toDataURL(data, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H' // High error correction for better scanning
      });
      
      // Generate SVG version for better quality
      this.qrCodeSvg = await QRCode.toString(data, {
        type: 'svg',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      this.showQRCode = true;
      this.isGeneratingQR = false;
      console.log('QR code generated successfully');
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      this.isGeneratingQR = false;
      this.showNotification('Error al generar el código QR: ' + (error.message || 'Error desconocido'), 'error');
      
      // Fallback: show address as text
      alert(`Dirección de wallet: ${data}`);
    }
  }

  // Method to download QR code
  downloadQRCode() {
    if (!this.qrCodeDataUrl) {
      this.showNotification('No hay código QR para descargar', 'error');
      return;
    }
    
    const link = document.createElement('a');
    link.href = this.qrCodeDataUrl;
    link.download = `flashtransfer-qr-${this.formatAddress(this.walletAddress)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.showNotification('Código QR descargado correctamente', 'success');
  }

  // Method to share QR code with MetaMask mobile
  async shareToMetaMask() {
    if (!this.isBrowser) return;
    
    try {
      // Create a deep link for MetaMask mobile
      const deepLink = `https://metamask.app.link/send/${this.walletAddress}`;
      
      // Try to open in MetaMask app first
      if (this.isMobile()) {
        window.location.href = deepLink;
      } else {
        // For desktop, copy the link and show instructions
        await navigator.clipboard.writeText(deepLink);
        this.showNotification('Enlace copiado. Abre MetaMask en tu móvil y pega el enlace.', 'success');
      }
    } catch (error) {
      console.error('Error sharing to MetaMask:', error);
      this.showNotification('Error al compartir con MetaMask', 'error');
    }
  }

  // Helper method to detect mobile devices
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Method to copy QR code data to clipboard
  async copyQRData() {
    try {
      await navigator.clipboard.writeText(this.walletAddress);
      this.showNotification('Dirección copiada al portapapeles', 'success');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      this.showNotification('Error al copiar la dirección', 'error');
    }
  }

  // Enhanced receiveTokens method
  receiveTokens() {
    console.log('Generating QR code for address:', this.walletAddress);
    if (this.walletAddress) {
      this.generateQRCode(this.walletAddress);
    } else {
      console.error('Wallet address is empty');
      this.showNotification('No se puede generar el código QR. La dirección de la wallet no está disponible.', 'error');
    }
  }

  // Add method to close QR code modal
  closeQRCode() {
    console.log('Closing QR code modal');
    this.showQRCode = false;
    this.qrCodeDataUrl = '';
  }

  // Método para manejar el cambio de red desde el HTML
  onNetworkChange(event: Event): void {
    // Only run in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    const selectElement = event.target as HTMLSelectElement;
    const selectedChainId = selectElement.value;
    
    // Only proceed if a valid chainId is selected
    if (selectedChainId && selectedChainId.trim() !== '') {
      this.switchNetwork(selectedChainId);
    }
  }

  // Método para cambiar de red
  async switchNetwork(chainId: string) {
    // Only run in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    if (!this.ethereum) {
      console.error('Ethereum provider not available');
      this.showNotification('Proveedor Ethereum no disponible', 'error');
      return;
    }
    
    // Check if already on the target network
    if (this.chainId === chainId) {
      console.log('Already on the target network');
      this.showNotification('Ya estás en la red seleccionada', 'info');
      return;
    }
    
    try {
      console.log('Switching to network:', chainId);
      // Show a loading indicator or disable the select while switching
      this.isLoading = true;
      
      // Use the network service to switch network
      const success = await this.walletService.switchNetwork(chainId);
      
      if (success) {
        // The chainChanged event listener will handle updating the UI
        this.showNotification(`Cambiando a ${this.getNetworkName(chainId)}...`, 'info');
      } else {
        this.showNotification('Error al cambiar de red', 'error');
      }
    } catch (error: any) {
      console.error('Error switching network:', error);
      // Si la red no está agregada, intentar agregarla
      if (error.code === 4902) {
        this.showNotification(`Agregando red ${this.getNetworkName(chainId)}...`, 'info');
        await this.addNetwork(chainId);
      } else {
        // Show user-friendly error message
        this.showNotification(`Error al cambiar a la red: ${error.message || 'Error desconocido'}`, 'error');
      }
    } finally {
      this.isLoading = false;
    }
  }

  async addNetwork(chainId: string) {
    // Only run in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    const network = this.supportedNetworks[chainId];
    if (!network) {
      console.error('Network not supported:', chainId);
      this.showNotification('Red no soportada', 'error');
      return;
    }

    try {
      console.log('Adding network:', chainId);
      this.isLoading = true;
      
      await this.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainId,
          chainName: network.name,
          rpcUrls: [network.rpcUrl],
          blockExplorerUrls: [network.explorer],
          nativeCurrency: {
            name: network.nativeCurrency,
            symbol: network.nativeCurrency,
            decimals: 18,
          },
        }],
      });
      
      this.showNotification(`Red ${network.name} agregada exitosamente`, 'success');
    } catch (error: any) {
      console.error('Error adding network:', error);
      this.showNotification(`Error al agregar la red: ${error.message || 'Error desconocido'}`, 'error');
    } finally {
      this.isLoading = false;
    }
  }
  
  private showNotification(message: string, type: 'success' | 'error' | 'info') {
    // Only show notifications in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    // Simple notification using alert for now
    // In a real application, you might want to implement a proper notification system
    switch(type) {
      case 'success':
        console.log('✅ Success:', message);
        break;
      case 'error':
        console.error('❌ Error:', message);
        break;
      case 'info':
        console.log('ℹ️ Info:', message);
        break;
    }
    
    // Show alert for user feedback
    if (type === 'error') {
      alert(`Error: ${message}`);
    }
  }

  // Método para obtener la red actual
  getCurrentNetwork(): NetworkConfig | null {
    return this.supportedNetworks[this.chainId] || null;
  }

  // Método para verificar si la red actual es soportada
  isCurrentNetworkSupported(): boolean {
    return !!this.supportedNetworks[this.chainId];
  }

  // Add methods for transaction display
  isSentTransaction(tx: any): boolean {
    return tx.from.toLowerCase() === this.walletAddress.toLowerCase();
  }

  isReceivedTransaction(tx: any): boolean {
    return tx.to.toLowerCase() === this.walletAddress.toLowerCase();
  }

  formatTransactionTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Justo ahora';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Hace ${minutes} min`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Hace ${hours} horas`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short'
      });
    }
  }

  formatTransactionAmount(tx: any): string {
    if (tx.isToken) {
      return `${parseFloat(tx.amount).toFixed(2)} ${tx.tokenSymbol}`;
    } else {
      return `${parseFloat(tx.amount).toFixed(4)} ${this.getNativeCurrency()}`;
    }
  }

  viewTransactionDetails(tx: any): void {
    // Open transaction in explorer
    const network = this.networkService.getCurrentNetwork();
    if (network) {
      const explorerUrl = network.explorer;
      window.open(`${explorerUrl}/tx/${tx.hash}`, '_blank');
    }
  }

  // Add method to load recent transactions
  private async loadRecentTransactions() {
    if (!this.walletAddress) return;
    
    this.loadingTransactions = true;
    try {
      // Get the simple network name for Etherscan service
      const simpleNetworkName = this.getSimpleNetworkName(this.networkName);
      
      console.log(`🔍 Loading recent transactions for ${this.walletAddress} on ${simpleNetworkName}`);
      
      this.etherscanService.getAllTransactions(this.walletAddress, simpleNetworkName)
        .subscribe({
          next: (transactions) => {
            // Take only the first 5 transactions for the wallet view
            this.recentTransactions = transactions.slice(0, 5);
            this.loadingTransactions = false;
            console.log(`✅ Loaded ${this.recentTransactions.length} recent transactions`);
          },
          error: (error) => {
            console.error('Error loading transactions:', error);
            this.loadingTransactions = false;
            this.recentTransactions = [];
          }
        });
    } catch (error) {
      console.error('Error loading recent transactions:', error);
      this.loadingTransactions = false;
      this.recentTransactions = [];
    }
  }

  // Helper method to convert full network names to simple names for Etherscan service
  private getSimpleNetworkName(fullName: string): string {
    const nameMap: { [key: string]: string } = {
      'Ethereum Mainnet': 'mainnet',
      'Sepolia Testnet': 'sepolia',
      'Ethereum Holesky': 'holesky',
      'Goerli Testnet': 'goerli',
      'Polygon Mainnet': 'polygon',
      'Mumbai Testnet': 'mumbai'
    };
    return nameMap[fullName] || 'mainnet';
  }

  private async loadBalancesForNetwork(chainId: string) {
    // Only run in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    // Update token configurations for the new network
    this.tokenBalances = this.tokenConfigs[chainId] || [
      { symbol: 'ETH', balance: '0.00', usdValue: '0.00', icon: '⟠', decimals: 18 }
    ];
    
    // Reset balances
    this.resetBalances();
    
    // Add a small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Load balances for the new network
    await this.loadBalances(chainId);
  }
}