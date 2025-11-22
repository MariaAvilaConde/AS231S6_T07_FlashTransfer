import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ethers, BrowserProvider } from 'ethers';
import { environment } from '../../../environments/environment';
import { NetworkService } from './network.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private smartContractHolesky = environment.api.smartContractHolesky;
  
  // NO usar JsonRpcProvider - solo BrowserProvider (MetaMask)
  private provider: ethers.BrowserProvider | null = null;
  private account: string | null = null;
  private isBrowser: boolean;
  
  private balanceCache: Map<string, {balance: string, timestamp: number}> = new Map();
  private cacheExpiry = 30000;

  private networkSubject = new BehaviorSubject<string>('holesky');
  public networkChanged$ = this.networkSubject.asObservable();

  constructor(
    private networkService: NetworkService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser && (window as any).ethereum) {
      (window as any).ethereum.on('chainChanged', (chainId: string) => {
        console.log(`🔔 Chain changed to: ${chainId}`);
        const net = this.networkService.getNetworkByChainId(chainId);
        const name = net ? net.name.toLowerCase() : 'unknown';
        this.networkSubject.next(name);
        
        this.initProvider().catch(err => console.error('Error reinitializing provider:', err));
      });
    }
  }

  async initProvider(): Promise<void> {
    if (!this.isBrowser) {
      throw new Error("No se puede inicializar el provider fuera del navegador");
    }
    
    if (window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      console.log(`✅ BrowserProvider inicializado (MetaMask)`);
    } else {
      throw new Error("MetaMask no está instalado");
    }
  }

  async connectWallet(): Promise<string> {
    if (!this.isBrowser) {
      throw new Error('No se puede conectar la wallet fuera del navegador');
    }
    
    if (!window.ethereum) {
      throw new Error('MetaMask no está instalado');
    }
    
    await this.initProvider();
    const accounts = await this.provider!.send("eth_requestAccounts", []);
    this.account = accounts[0];
    
    if (this.account) {
      this.setLocalStorage('account', this.account);
    }
    
    console.log(`✅ Wallet conectada: ${this.account}`);
    return this.account!;
  }

  getAccount(): string | null {
    if (!this.isBrowser) return null;
    if (this.account) return this.account;
    const stored = this.getLocalStorage('account');
    this.account = stored;
    return this.account;
  }

  logout(): void {
    this.account = null;
    this.removeLocalStorage('account');
    this.balanceCache.clear();
    console.log('👋 Sesión cerrada');
  }

  async getBalance(address: string, chainId: string): Promise<string> {
    if (!this.isBrowser) return '0.00';
    
    const cacheKey = `${address}-${chainId}`;
    const cached = this.balanceCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.balance;
    }
    
    try {
      if (!this.provider) await this.initProvider();
      
      const balance = await this.provider!.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);
      
      this.balanceCache.set(cacheKey, {
        balance: formattedBalance,
        timestamp: Date.now()
      });
      
      console.log(`✅ Balance obtenido: ${formattedBalance}`);
      return formattedBalance;
    } catch (error) {
      console.error(`❌ Error obteniendo balance:`, error);
      return '0.00';
    }
  }

  async switchNetwork(chainId: string): Promise<boolean> {
    if (!this.isBrowser) return false;
    
    if (!(window as any).ethereum) {
      throw new Error('Ethereum provider not available');
    }
    
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
      
      await this.initProvider();
      console.log(`✅ Red cambiada a ${chainId}`);
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) throw switchError;
      console.error('❌ Error cambiando de red:', switchError);
      throw switchError;
    }
  }

  getCurrentNetwork() {
    return this.networkService.getCurrentNetwork();
  }

  getNetwork(): string {
    return this.networkSubject.value;
  }

  getProvider(): BrowserProvider | null {
    return this.provider;
  }

  clearBalanceCacheForAddress(address: string) {
    for (const key of this.balanceCache.keys()) {
      if (key.startsWith(address)) this.balanceCache.delete(key);
    }
  }

  clearAllBalanceCache() {
    this.balanceCache.clear();
  }

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

  private removeLocalStorage(key: string): void {
    if (this.isBrowser && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Error removiendo de localStorage:', error);
      }
    }
  }
}