import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

export interface Network {
  chainId: string;
  name: string;
  symbol: string;
  decimals: number;
  explorer: string;
  apiUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  // Redes soportadas
  private readonly networks: { [key: string]: Network } = {
    '0x1': {
      chainId: '0x1',
      name: 'Ethereum Mainnet',
      symbol: 'ETH',
      decimals: 18,
      explorer: 'https://etherscan.io',
      apiUrl: 'https://api.etherscan.io/api'
    },
    '0xaa36a7': {
      chainId: '0xaa36a7',
      name: 'Sepolia Testnet',
      symbol: 'ETH',
      decimals: 18,
      explorer: 'https://sepolia.etherscan.io',
      apiUrl: 'https://api-sepolia.etherscan.io/api'
    },
    '0x4268': {
      chainId: '0x4268',
      name: 'Holesky Testnet',
      symbol: 'ETH',
      decimals: 18,
      explorer: 'https://holesky.etherscan.io',
      apiUrl: 'https://api-holesky.etherscan.io/api'
    }
  };

  // BehaviorSubject para mantener el estado actual de la red
  private currentNetworkSubject = new BehaviorSubject<Network | null>(null);
  public currentNetwork$ = this.currentNetworkSubject.asObservable();

  // Subject for handling chain changes globally
  private chainChangedSubject = new Subject<string>();
  public chainChanged$ = this.chainChangedSubject.asObservable();
  private isBrowser: boolean;
  
  // Store the chainChanged handler to properly remove it later
  private chainChangedHandler: ((chainId: string) => void) | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    // Inicializar con la red por defecto si es necesario
    this.initializeNetwork();
  }

  // Inicializar la red desde localStorage o con una red por defecto
  private initializeNetwork() {
    // Only run in browser environment
    if (!this.isBrowser) {
      // Fallback to default network if not in browser
      this.setCurrentNetwork(this.networks['0x1']);
      return;
    }
    
    if ((window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_chainId' })
        .then((chainId: string) => {
          const network = this.networks[chainId] || this.networks['0x1']; // Default to Mainnet
          this.setCurrentNetwork(network);
        })
        .catch((error: any) => {
          console.error('Error getting chainId:', error);
          // Fallback to default network
          this.setCurrentNetwork(this.networks['0x1']);
        });
    } else {
      // Fallback to default network if no ethereum provider
      this.setCurrentNetwork(this.networks['0x1']);
    }
  }

  // Establecer la red actual
  setCurrentNetwork(network: Network) {
    this.currentNetworkSubject.next(network);
    // Guardar en localStorage para persistencia
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('selectedNetwork', JSON.stringify(network));
    }
  }

  // Obtener la red actual
  getCurrentNetwork(): Network | null {
    return this.currentNetworkSubject.value;
  }

  // Obtener todas las redes soportadas
  getSupportedNetworks(): Network[] {
    return Object.values(this.networks);
  }

  // Obtener una red por chainId
  getNetworkByChainId(chainId: string): Network | undefined {
    return this.networks[chainId];
  }

  // Cambiar la red usando MetaMask
  async switchNetwork(chainId: string): Promise<boolean> {
    // Only run in browser environment
    if (!this.isBrowser) {
      return false;
    }
    
    if ((window as any).ethereum) {
      try {
        // Primero intentar cambiar a la red
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId }],
        });
        
        // Si tiene éxito, actualizar el estado
        const network = this.networks[chainId];
        if (network) {
          this.setCurrentNetwork(network);
          // Emit chain change event
          this.chainChangedSubject.next(chainId);
        }
        
        return true;
      } catch (switchError: any) {
        // Este error code indica que la cadena no ha sido añadida a MetaMask
        if (switchError.code === 4902) {
          try {
            // Intentar añadir la red si no está disponible
            await this.addNetworkToMetaMask(chainId);
            return true;
          } catch (addError) {
            console.error('Error adding chain to MetaMask:', addError);
          }
        }
        console.error('Error switching network:', switchError);
        return false;
      }
    }
    return false;
  }

  // Método para añadir una red a MetaMask
  private async addNetworkToMetaMask(chainId: string): Promise<void> {
    const network = this.networks[chainId];
    if (!network) {
      throw new Error('Network not supported');
    }

    await (window as any).ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: network.chainId,
        chainName: network.name,
        rpcUrls: [network.apiUrl.replace('/api', '')], // Remove /api from URL for RPC
        blockExplorerUrls: [network.explorer],
        nativeCurrency: {
          name: network.name,
          symbol: network.symbol,
          decimals: network.decimals,
        },
      }],
    });
  }

  // Escuchar cambios de red en MetaMask
  listenToNetworkChanges() {
    // Only run in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    if ((window as any).ethereum) {
      // Remove existing listeners to prevent duplicates
      this.removeNetworkListener();
      
      // Create and store the handler function
      this.chainChangedHandler = (chainId: string) => {
        const network = this.networks[chainId] || this.networks['0x1']; // Default to Mainnet
        this.setCurrentNetwork(network);
        // Emit chain change event
        this.chainChangedSubject.next(chainId);
      };
      
      // Add new listener
      (window as any).ethereum.on('chainChanged', this.chainChangedHandler);
    }
  }

  // Dejar de escuchar cambios de red
  removeNetworkListener() {
    // Only run in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    if ((window as any).ethereum && this.chainChangedHandler) {
      (window as any).ethereum.removeListener('chainChanged', this.chainChangedHandler);
      this.chainChangedHandler = null;
    }
  }
}