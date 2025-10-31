import {Injectable, Inject, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {ethers, BrowserProvider, JsonRpcProvider} from 'ethers';
import { environment } from '../../../environments/environment';
import { NetworkService } from './network.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WalletService {

  private smartContractHolesky = environment.api.smartContractHolesky;
  // RPC público para Holesky
  private jsonProvider = new JsonRpcProvider('https://ethereum-holesky.publicnode.com');
  private provider: ethers.BrowserProvider | null = null;
  private account: string | null = null;
  private isBrowser: boolean;
  
  // Cache for balances to avoid repeated requests
  private balanceCache: Map<string, {balance: string, timestamp: number}> = new Map();
  private cacheExpiry = 30000; // 30 seconds

  constructor(
    private networkService: NetworkService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  //Re-inicializar el provider
  async initProvider(): Promise<void> {
    // Only run in browser environment
    if (!this.isBrowser) {
      throw new Error("No se puede inicializar el provider en este entorno");
    }
    
    if (window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      throw new Error("MetaMask no está instalado");
    }
  }

  //Método para conectar a wallet Metamask
  async connectWallet(): Promise<string> {
    // Only run in browser environment
    if (!this.isBrowser) {
      throw new Error('No se puede conectar la wallet en este entorno');
    }
    
    if (!window.ethereum) {
      throw new Error('MetaMask no está instalado');
    }
    await this.initProvider();
    const accounts = await this.provider!.send("eth_requestAccounts", []);
    this.account = accounts[0];
    if (this.account) {
      localStorage.setItem('account', this.account);
    }
    return this.account!;
  }

  //Método que devuelve la dirección de la cuenta del usuario
  getAccount(): string | null {
    if (this.account) return this.account;
    return localStorage.getItem('account');
  }

  //Método para desloguearte de la aplicación
  logout(): void {
    this.account = null;
    localStorage.removeItem('account');
    this.balanceCache.clear();
  }

  // Get balance with caching
  async getBalance(address: string, chainId: string): Promise<string> {
    // Only run in browser environment
    if (!this.isBrowser) {
      return '0.00';
    }
    
    const cacheKey = `${address}-${chainId}`;
    const cached = this.balanceCache.get(cacheKey);
    
    // Check if cache is valid
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.balance;
    }
    
    // If not in cache or expired, fetch new balance
    if (!this.provider) {
      await this.initProvider();
    }
    
    try {
      const balance = await this.provider!.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);
      
      // Update cache
      this.balanceCache.set(cacheKey, {
        balance: formattedBalance,
        timestamp: Date.now()
      });
      
      return formattedBalance;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0.00';
    }
  }

  // Método para cambiar de red
  async switchNetwork(chainId: string): Promise<boolean> {
    // Only run in browser environment
    if (!this.isBrowser) {
      return false;
    }
    
    if (!(window as any).ethereum) {
      throw new Error('Ethereum provider not available');
    }
    
    try {
      // Primero intentar cambiar a la red
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
      
      return true;
    } catch (switchError: any) {
      // Este error code indica que la cadena no ha sido añadida a MetaMask
      if (switchError.code === 4902) {
        // Obtener la configuración de red del wallet component
        // Necesitamos acceder a esta información de alguna manera
        // Por ahora lanzamos el error para que sea manejado por el componente
        throw switchError;
      }
      console.error('Error switching network:', switchError);
      throw switchError;
    }
  }

  // Obtener la red actual
  getCurrentNetwork() {
    return this.networkService.getCurrentNetwork();
  }

  // Clear balance cache for a specific address
  clearBalanceCacheForAddress(address: string) {
    for (const key of this.balanceCache.keys()) {
      if (key.startsWith(address)) {
        this.balanceCache.delete(key);
      }
    }
  }

  // Clear all balance cache
  clearAllBalanceCache() {
    this.balanceCache.clear();
  }
}