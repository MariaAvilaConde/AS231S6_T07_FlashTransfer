import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Subject } from 'rxjs';

export interface Network {
  chainId: string;
  name: string;
  symbol: string;
  decimals: number;
  explorer: string;
  apiUrl: string;
  rpcUrls?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  // Configuración completa de redes con chainId en hexadecimal
  private readonly networks: { [key: string]: Network } = {
    '0x1': {
      chainId: '0x1',
      name: 'Ethereum Mainnet',
      symbol: 'ETH',
      decimals: 18,
      explorer: 'https://etherscan.io',
      apiUrl: 'https://api.etherscan.io/api',
      rpcUrls: ['https://cloudflare-eth.com', 'https://eth.llamarpc.com']
    },
    '0xaa36a7': {
      chainId: '0xaa36a7',
      name: 'Sepolia Testnet',
      symbol: 'ETH',
      decimals: 18,
      explorer: 'https://sepolia.etherscan.io',
      apiUrl: 'https://api-sepolia.etherscan.io/api',
      rpcUrls: ['https://rpc.sepolia.org', 'https://rpc2.sepolia.org']
    },
    '0x4268': {
      chainId: '0x4268',
      name: 'Holesky Testnet',
      symbol: 'ETH',
      decimals: 18,
      explorer: 'https://holesky.etherscan.io',
      apiUrl: 'https://api-holesky.etherscan.io/api',
      rpcUrls: ['https://holesky.drpc.org', 'https://1rpc.io/holesky']
    },
    '0x89': {
      chainId: '0x89',
      name: 'Polygon Mainnet',
      symbol: 'MATIC',
      decimals: 18,
      explorer: 'https://polygonscan.com',
      apiUrl: 'https://api.polygonscan.com/api',
      rpcUrls: ['https://polygon-rpc.com', 'https://polygon.llamarpc.com']
    },
    '0x13881': {
      chainId: '0x13881',
      name: 'Mumbai Testnet',
      symbol: 'MATIC',
      decimals: 18,
      explorer: 'https://mumbai.polygonscan.com',
      apiUrl: 'https://api-testnet.polygonscan.com/api',
      rpcUrls: ['https://rpc-mumbai.maticvigil.com', 'https://endpoints.omniatech.io/v1/matic/mumbai/public']
    }
  };

  private currentNetworkSubject = new BehaviorSubject<Network | null>(null);
  public currentNetwork$ = this.currentNetworkSubject.asObservable();

  private chainChangedSubject = new Subject<string>();
  public chainChanged$ = this.chainChangedSubject.asObservable();
  
  private isBrowser: boolean;
  private chainChangedHandler: ((chainId: string) => void) | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.initializeNetwork();
  }

  private initializeNetwork() {
    if (!this.isBrowser) {
      // Default a Ethereum Mainnet en SSR
      this.setCurrentNetwork(this.networks['0x1']);
      return;
    }
    
    if ((window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_chainId' })
        .then((chainId: string) => {
          console.log(`🔗 ChainId detectado: ${chainId} (${this.hexToDecimal(chainId)})`);
          const network = this.networks[chainId] || this.networks['0x1'];
          this.setCurrentNetwork(network);
        })
        .catch((error: any) => {
          console.error('❌ Error obteniendo chainId:', error);
          this.setCurrentNetwork(this.networks['0x1']);
        });
    } else {
      console.warn('⚠️ MetaMask no detectado, usando red por defecto');
      this.setCurrentNetwork(this.networks['0x1']);
    }
  }

  setCurrentNetwork(network: Network) {
    console.log(`✅ Red establecida: ${network.name} (${network.chainId})`);
    this.currentNetworkSubject.next(network);
    this.setLocalStorage('selectedNetwork', JSON.stringify(network));
  }

  getCurrentNetwork(): Network | null {
    return this.currentNetworkSubject.value;
  }

  getSupportedNetworks(): Network[] {
    return Object.values(this.networks);
  }

  getNetworkByChainId(chainId: string): Network | undefined {
    return this.networks[chainId];
  }

  // Obtener red por chainId decimal (1, 11155111, 17000, etc.)
  getNetworkByChainIdDecimal(chainIdDecimal: number): Network | undefined {
    const chainIdHex = this.decimalToHex(chainIdDecimal);
    return this.networks[chainIdHex];
  }

  async switchNetwork(chainId: string): Promise<boolean> {
    if (!this.isBrowser) {
      console.warn('⚠️ No se puede cambiar de red en SSR');
      return false;
    }
    
    if (!(window as any).ethereum) {
      console.error('❌ MetaMask no disponible');
      return false;
    }
    
    try {
      console.log(`🔄 Cambiando a red: ${chainId}`);
      
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
      
      const network = this.networks[chainId];
      if (network) {
        this.setCurrentNetwork(network);
        this.chainChangedSubject.next(chainId);
      }
      
      console.log('✅ Red cambiada exitosamente');
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        console.log('➕ Red no encontrada en MetaMask, intentando agregar...');
        try {
          await this.addNetworkToMetaMask(chainId);
          console.log('✅ Red agregada exitosamente');
          return true;
        } catch (addError) {
          console.error('❌ Error agregando red a MetaMask:', addError);
          return false;
        }
      }
      console.error('❌ Error cambiando de red:', switchError);
      return false;
    }
  }

  private async addNetworkToMetaMask(chainId: string): Promise<void> {
    const network = this.networks[chainId];
    if (!network) {
      throw new Error(`Red ${chainId} no soportada`);
    }

    const params = {
      chainId: network.chainId,
      chainName: network.name,
      nativeCurrency: {
        name: network.symbol,
        symbol: network.symbol,
        decimals: network.decimals,
      },
      rpcUrls: network.rpcUrls || [network.apiUrl.replace('/api', '')],
      blockExplorerUrls: [network.explorer]
    };

    console.log('📤 Agregando red con parámetros:', params);

    await (window as any).ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [params],
    });
  }

  listenToNetworkChanges() {
    if (!this.isBrowser) {
      return;
    }
    
    if ((window as any).ethereum) {
      this.removeNetworkListener();
      
      this.chainChangedHandler = (chainId: string) => {
        console.log(`🔔 Red cambiada a: ${chainId} (${this.hexToDecimal(chainId)})`);
        const network = this.networks[chainId] || this.networks['0x1'];
        this.setCurrentNetwork(network);
        this.chainChangedSubject.next(chainId);
      };
      
      (window as any).ethereum.on('chainChanged', this.chainChangedHandler);
      console.log('👂 Escuchando cambios de red');
    }
  }

  removeNetworkListener() {
    if (!this.isBrowser) {
      return;
    }
    
    if ((window as any).ethereum && this.chainChangedHandler) {
      (window as any).ethereum.removeListener('chainChanged', this.chainChangedHandler);
      this.chainChangedHandler = null;
      console.log('🔇 Dejó de escuchar cambios de red');
    }
  }

  // ===== UTILIDADES =====

  // Convertir chainId decimal a hexadecimal
  private decimalToHex(decimal: number): string {
    return '0x' + decimal.toString(16);
  }

  // Convertir chainId hexadecimal a decimal
  private hexToDecimal(hex: string): number {
    return parseInt(hex, 16);
  }

  // Verificar si es una testnet
  isTestnet(chainId?: string): boolean {
    const network = chainId ? this.networks[chainId] : this.currentNetworkSubject.value;
    if (!network) return false;
    
    const testnets = ['Sepolia', 'Holesky', 'Mumbai', 'Goerli'];
    return testnets.some(testnet => network.name.includes(testnet));
  }

  // Obtener información formateada de la red actual
  getCurrentNetworkInfo(): string {
    const network = this.currentNetworkSubject.value;
    if (!network) return 'No conectado';
    
    return `${network.name} (${network.symbol})`;
  }

  // ===== MÉTODOS AUXILIARES PARA localStorage CON SSR =====
  
  private setLocalStorage(key: string, value: string): void {
    if (this.isBrowser && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Error guardando en localStorage:', error);
      }
    }
  }

  private getLocalStorage(key: string): string | null {
    if (this.isBrowser && typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Error leyendo de localStorage:', error);
        return null;
      }
    }
    return null;
  }
}