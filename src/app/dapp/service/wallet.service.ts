import {Injectable} from '@angular/core';
import {ethers, BrowserProvider, JsonRpcProvider} from 'ethers';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WalletService {

  private smartContractHolesky = environment.api.smartContractHolesky;
  // RPC público para Holesky
  private jsonProvider = new JsonRpcProvider('https://ethereum-holesky.publicnode.com');
  private provider: ethers.BrowserProvider | null = null;
  private account: string | null = null;

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
}

}
