import {Injectable} from '@angular/core';
import {ethers, BrowserProvider, JsonRpcProvider} from 'ethers';
import { environment } from '../../../environments/environment';
import { NetworkService } from './network.service';

@Injectable({
  providedIn: 'root'
})
export class WalletService {

  private smartContractHolesky = environment.api.smartContractHolesky;
  // RPC público para Holesky
  private jsonProvider = new JsonRpcProvider('https://ethereum-holesky.publicnode.com');
  private provider: ethers.BrowserProvider | null = null;
  private account: string | null = null;
  
  // Cache for balances to avoid repeated requests
  private balanceCache: Map<string, {balance: string, timestamp: number}> = new Map();
  private cacheExpiry = 30000; // 30 seconds

  constructor(private networkService: NetworkService) {}

  //Re-inicializar el provider
  async initProvider(): Promise<void> {
    if (window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      throw new Error("MetaMask no está instalado");
    }
  }

  //Método para conectar a wallet Metamask
  async connectWallet(): Promise<string> {
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
    return this.networkService.switchNetwork(chainId);
  }

  // Obtener la red actual
  getCurrentNetwork() {
    return this.networkService.getCurrentNetwork();
  }
}