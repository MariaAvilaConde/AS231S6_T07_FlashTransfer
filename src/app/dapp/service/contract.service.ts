import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ethers, Contract, BrowserProvider, Signer } from 'ethers';
import TransactionABI from '../abi/Transaction.json';

export interface ContractTransaction {
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
  isContractTransaction: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private provider: BrowserProvider | null = null;
  private signer: Signer | null = null;
  private contract: Contract | null = null;
  private contractAddress: string = '';
  private contractBalance: string = '0';
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.initProvider();
  }

  private async initProvider() {
    if (this.isBrowser && (window as any).ethereum) {
      try {
        this.provider = new BrowserProvider((window as any).ethereum);
        this.signer = await this.provider.getSigner();
      } catch (error) {
        console.error('Error initializing provider:', error);
      }
    }
  }

  /**
   * Inicializa el contrato con una dirección específica
   */
  async initContract(contractAddress: string): Promise<boolean> {
    if (!this.isBrowser) {
      console.error('Contract service only works in browser environment');
      return false;
    }

    if (!ethers.isAddress(contractAddress)) {
      console.error('Invalid contract address');
      return false;
    }

    try {
      // Asegurarse de que el provider y signer están inicializados
      if (!this.provider || !this.signer) {
        await this.initProvider();
      }

      if (!this.signer) {
        console.error('Signer not available');
        return false;
      }

      this.contract = new Contract(
        contractAddress, 
        TransactionABI, 
        this.signer
      );
      
      this.contractAddress = contractAddress;
      
      // Verificar que el contrato existe
      const code = await this.provider!.getCode(contractAddress);
      if (code === '0x') {
        console.error('No contract found at this address');
        this.contract = null;
        this.contractAddress = '';
        return false;
      }
      
      // Obtener el balance del contrato
      await this.updateContractBalance();
      
      console.log('Contract initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing contract:', error);
      this.contract = null;
      this.contractAddress = '';
      return false;
    }
  }

  /**
   * Actualiza el balance del contrato
   */
  async updateContractBalance(): Promise<string> {
    if (!this.contract) {
      console.error('Contract not initialized');
      return '0';
    }

    try {
      // Usar notación de corchetes para acceder a funciones del contrato
      const balance = await this.contract["getContractBalance"]();
      this.contractBalance = ethers.formatEther(balance);
      return this.contractBalance;
    } catch (error) {
      console.error('Error getting contract balance:', error);
      this.contractBalance = '0';
      return '0';
    }
  }

  /**
   * Deposita fondos en el contrato
   */
  async depositToContract(amount: string): Promise<string | null> {
    if (!this.contract || !amount) {
      console.error('Invalid deposit data');
      return null;
    }

    try {
      const amountInWei = ethers.parseEther(amount);

      // Usar notación de corchetes para acceder a funciones del contrato
      const tx = await this.contract["deposit"]({
        value: amountInWei
      });

      console.log('Deposit transaction sent:', tx.hash);
      
      // Esperar a que se confirme la transacción
      await tx.wait();
      
      // Actualizar el balance del contrato
      await this.updateContractBalance();
      
      return tx.hash;
    } catch (error: any) {
      console.error('Error depositing to contract:', error);
      throw error;
    }
  }

  /**
   * Envía una transacción a través del contrato
   */
  async sendContractTransaction(recipient: string, amount: string): Promise<string | null> {
    if (!this.contract || !amount || !ethers.isAddress(recipient)) {
      console.error('Invalid contract transaction data');
      return null;
    }

    try {
      const amountInWei = ethers.parseEther(amount);

      // Verificar si el contrato tiene suficiente balance
      const contractBalance = await this.contract["getContractBalance"]();
      
      if (contractBalance < amountInWei) {
        // Si el contrato no tiene suficiente balance, primero hacer un depósito
        console.log('Contract balance insufficient, depositing first...');
        const depositTx = await this.contract["deposit"]({
          value: amountInWei
        });
        await depositTx.wait();
        console.log('Deposit completed');
      }

      // Ahora enviar la transacción a través del contrato
      // Usar notación de corchetes para acceder a funciones del contrato
      const tx = await this.contract["sendTransaction"](recipient, amountInWei);
      
      console.log('Contract transaction sent:', tx.hash);
      
      // Esperar a que se confirme la transacción
      await tx.wait();
      
      // Actualizar el balance del contrato
      await this.updateContractBalance();
      
      return tx.hash;
    } catch (error: any) {
      console.error('Error sending contract transaction:', error);
      throw error;
    }
  }

  /**
   * Obtiene el balance actual del contrato
   */
  getContractBalance(): string {
    return this.contractBalance;
  }

  /**
   * Obtiene la dirección del contrato
   */
  getContractAddress(): string {
    return this.contractAddress;
  }

  /**
   * Verifica si el contrato está inicializado
   */
  isContractInitialized(): boolean {
    return this.contract !== null && this.contractAddress !== '';
  }

  /**
   * Verifica si una transacción fue exitosa
   */
  async checkTransactionStatus(txHash: string): Promise<'pending' | 'success' | 'failed'> {
    if (!this.provider) {
      return 'failed';
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return 'pending';
      }
      
      return receipt.status === 1 ? 'success' : 'failed';
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return 'failed';
    }
  }

  /**
   * Reinicializa el provider (útil cuando cambia la red)
   */
  async reinitializeProvider() {
    await this.initProvider();
    
    // Si había un contrato inicializado, reinicializarlo
    if (this.contractAddress) {
      await this.initContract(this.contractAddress);
    }
  }

  /**
   * Limpia el contrato actual
   */
  clearContract() {
    this.contract = null;
    this.contractAddress = '';
    this.contractBalance = '0';
  }
}