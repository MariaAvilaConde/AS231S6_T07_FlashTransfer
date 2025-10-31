import { Component, type OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ethers } from 'ethers';
import { WalletService } from '../../../service/wallet.service';
import { NetworkService, Network as NetworkModel } from '../../../service/network.service';

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

  // Configuración de redes soportadas
  supportedNetworks: { [key: string]: NetworkConfig } = {
    '0x1': {
      chainId: '0x1',
      name: 'Ethereum Mainnet',
      rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
      explorer: 'https://etherscan.io',
      nativeCurrency: 'ETH'
    },
    '0xaa36a7': {
      chainId: '0xaa36a7',
      name: 'Sepolia Testnet',
      rpcUrl: 'https://sepolia.infura.io',
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

  constructor(private router: Router, private walletService: WalletService, private networkService: NetworkService) {
    this.ethereum = (window as any).ethereum;
  }

  async ngOnInit() {
    await this.loadWalletData();
    this.setupEventListeners();
  }

  ngOnDestroy() {
    this.removeEventListeners();
  }

  private setupEventListeners() {
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
          this.loadWalletData();
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
        this.loadWalletData();
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
    if (this.ethereum) {
      this.ethereum.removeAllListeners('accountsChanged');
      this.ethereum.removeAllListeners('chainChanged');
      this.ethereum.removeAllListeners('connect');
      this.ethereum.removeAllListeners('disconnect');
    }
  }

  private async loadWalletData() {
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

      } catch (error: any) {
        console.error('Error loading wallet data:', error);
        alert('Error al cargar datos de la wallet');
      } finally {
        this.isLoading = false;
      }
    } else {
      alert('MetaMask no detectado');
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
    const networkConfig = this.supportedNetworks[chainId];
    if (!networkConfig) {
      console.error('Red no soportada:', chainId);
      return;
    }

    try {
      // Obtener balance nativo (ETH, MATIC, etc.) usando el servicio con cache
      const nativeBalanceFormatted = await this.walletService.getBalance(this.walletAddress, chainId);
      
      // Actualizar balance nativo
      const nativeToken = this.tokenBalances.find(token => 
        token.symbol === networkConfig.nativeCurrency
      );
      
      if (nativeToken) {
        nativeToken.balance = parseFloat(nativeBalanceFormatted).toFixed(4);
        this.ethBalance = nativeToken.balance;
        
        // Obtener precio en USD (usando una API)
        const usdValue = await this.getTokenUSDValue(networkConfig.nativeCurrency, nativeBalanceFormatted);
        nativeToken.usdValue = usdValue;
        this.usdBalance = usdValue;
      }

      // Obtener balances de tokens ERC-20
      await this.loadERC20Balances(new ethers.JsonRpcProvider(networkConfig.rpcUrl));

    } catch (error: any) {
      console.error('Error loading balances:', error);
    }
  }

  private async loadERC20Balances(provider: ethers.JsonRpcProvider) {
    for (const token of this.tokenBalances) {
      if (token.contractAddress) {
        try {
          // ABI mínima para balanceOf
          const abi = ['function balanceOf(address) view returns (uint256)'];
          const contract = new ethers.Contract(token.contractAddress, abi, provider);
          
          const balance = await contract['balanceOf'](this.walletAddress);
          const formattedBalance = ethers.formatUnits(balance, token.decimals);
          
          token.balance = parseFloat(formattedBalance).toFixed(4);
          
          // Obtener valor en USD
          const usdValue = await this.getTokenUSDValue(token.symbol, formattedBalance);
          token.usdValue = usdValue;
          
        } catch (error: any) {
          console.error(`Error loading balance for ${token.symbol}:`, error);
          token.balance = 'Error';
          token.usdValue = '0.00';
        }
      }
    }
  }

  private async getTokenUSDValue(symbol: string, amount: string): Promise<string> {
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
    navigator.clipboard.writeText(this.walletAddress);
    alert('Dirección copiada al portapapeles');
  }

  async refreshBalance() {
    // Clear cache before refreshing
    (this.walletService as any).balanceCache.clear();
    await this.loadWalletData();
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
    this.router.navigate(['/transaction']);
  }

  viewAllTransactions() {
    this.router.navigate(['/transaction']);
  }

  receiveTokens() {
    alert('Mostrar código QR próximamente');
  }

  // Método para manejar el cambio de red desde el HTML
  onNetworkChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedChainId = selectElement.value;
    
    // Only proceed if a valid chainId is selected
    if (selectedChainId && selectedChainId.trim() !== '') {
      this.switchNetwork(selectedChainId);
    }
  }

  // Método para cambiar de red
  async switchNetwork(chainId: string) {
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

  private async loadBalancesForNetwork(chainId: string) {
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