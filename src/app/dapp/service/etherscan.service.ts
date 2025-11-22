import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';

export interface EtherscanTransaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  timestamp: number;
  network: string;
  gasUsed?: string;
  gasPrice?: string;
  isError: boolean;
  txreceipt_status?: string;
  isToken?: boolean;
  tokenName?: string;
  tokenSymbol?: string;
  contractAddress?: string;
  blockNumber?: string;
  confirmations?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EtherscanService {
  private readonly API_KEY = 'BAEHKHKWNIEUE2E1BGHURP9MVG2CG7BMP7';
  private isBrowser: boolean;

  private readonly API_URLS: { [key: string]: string } = {
    'mainnet': 'https://api.etherscan.io/api',
    'holesky': 'https://api-holesky.etherscan.io/api',
    'sepolia': 'https://api-sepolia.etherscan.io/api',
    'goerli': 'https://api-goerli.etherscan.io/api',
    'polygon': 'https://api.polygonscan.com/api',
    'mumbai': 'https://api-testnet.polygonscan.com/api'
  };

  private readonly EXPLORER_URLS: { [key: string]: string } = {
    'mainnet': 'https://etherscan.io',
    'holesky': 'https://holesky.etherscan.io',
    'sepolia': 'https://sepolia.etherscan.io',
    'goerli': 'https://goerli.etherscan.io',
    'polygon': 'https://polygonscan.com',
    'mumbai': 'https://mumbai.polygonscan.com'
  };

  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private cacheExpiry = 30000;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private normalizeNetworkName(network: string): string {
    const normalized = network.toLowerCase()
      .replace(/\s+testnet/gi, '')
      .replace(/\s+mainnet/gi, '')
      .replace(/eth\s+/gi, '')
      .replace(/ethereum\s+/gi, '')
      .trim();
    
    const mapping: { [key: string]: string } = {
      'ethereum': 'mainnet',
      'eth': 'mainnet',
      'holesky': 'holesky',
      'sepolia': 'sepolia',
      'goerli': 'goerli',
      'polygon': 'polygon',
      'mumbai': 'mumbai'
    };

    return mapping[normalized] || 'mainnet';
  }

  private getApiUrl(network: string): string {
    const normalized = this.normalizeNetworkName(network);
    return this.API_URLS[normalized] || this.API_URLS['mainnet'];
  }

  getExplorerUrl(network: string, hash: string): string {
    const normalized = this.normalizeNetworkName(network);
    const baseUrl = this.EXPLORER_URLS[normalized] || this.EXPLORER_URLS['mainnet'];
    return `${baseUrl}/tx/${hash}`;
  }

  getAddressTransactions(address: string, network: string, startBlock = 0): Observable<EtherscanTransaction[]> {
    if (!address) return of([]);

    const normalizedNetwork = this.normalizeNetworkName(network);
    const cacheKey = `normal_tx_${address}_${normalizedNetwork}_${startBlock}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return of(cached.data);
    }

    const apiUrl = this.getApiUrl(normalizedNetwork);
    const url = `${apiUrl}?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=99999999&sort=desc&apikey=${this.API_KEY}`;

    return this.http.get<any>(url).pipe(
      timeout(15000),
      map(data => {
        if (data.status === '1' && data.result && Array.isArray(data.result)) {
          const transactions = data.result.map((tx: any) => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            amount: (parseInt(tx.value, 10) / 1e18).toString(),
            timestamp: parseInt(tx.timeStamp, 10) * 1000,
            network: normalizedNetwork,
            gasUsed: tx.gasUsed,
            gasPrice: tx.gasPrice,
            isError: tx.isError === '1',
            txreceipt_status: tx.txreceipt_status,
            blockNumber: tx.blockNumber,
            confirmations: tx.confirmations
          }));
          
          this.cache.set(cacheKey, {
            data: transactions,
            timestamp: Date.now()
          });
          
          console.log(`✅ Found ${transactions.length} normal transactions on ${normalizedNetwork}`);
          return transactions;
        }
        console.warn(`⚠️ No transactions found for ${address} on ${normalizedNetwork}`);
        return [];
      }),
      catchError(error => {
        console.error(`❌ Error fetching transactions from ${normalizedNetwork}:`, error);
        return of([]);
      })
    );
  }

  getAddressTokenTransfers(address: string, network: string): Observable<EtherscanTransaction[]> {
    if (!address) return of([]);

    const normalizedNetwork = this.normalizeNetworkName(network);
    const cacheKey = `token_tx_${address}_${normalizedNetwork}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return of(cached.data);
    }

    const apiUrl = this.getApiUrl(normalizedNetwork);
    const url = `${apiUrl}?module=account&action=tokentx&address=${address}&sort=desc&apikey=${this.API_KEY}`;

    return this.http.get<any>(url).pipe(
      timeout(15000),
      map(data => {
        if (data.status === '1' && data.result && Array.isArray(data.result)) {
          const transactions = data.result.map((tx: any) => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            amount: (parseInt(tx.value, 10) / Math.pow(10, parseInt(tx.tokenDecimal, 10))).toString(),
            timestamp: parseInt(tx.timeStamp, 10) * 1000,
            network: normalizedNetwork,
            tokenName: tx.tokenName,
            tokenSymbol: tx.tokenSymbol,
            contractAddress: tx.contractAddress,
            isToken: true,
            blockNumber: tx.blockNumber,
            confirmations: tx.confirmations
          }));
          
          this.cache.set(cacheKey, {
            data: transactions,
            timestamp: Date.now()
          });
          
          console.log(`✅ Found ${transactions.length} token transactions on ${normalizedNetwork}`);
          return transactions;
        }
        console.warn(`⚠️ No token transactions found for ${address} on ${normalizedNetwork}`);
        return [];
      }),
      catchError(error => {
        console.error(`❌ Error fetching token transactions from ${normalizedNetwork}:`, error);
        return of([]);
      })
    );
  }

  getAllTransactions(address: string, network: string): Observable<EtherscanTransaction[]> {
    console.log(`🔍 Fetching all transactions for ${address} on ${network}`);
    
    return forkJoin([
      this.getAddressTransactions(address, network),
      this.getAddressTokenTransfers(address, network)
    ]).pipe(
      map(([normalTxs, tokenTxs]) => {
        const allTransactions = [...normalTxs, ...tokenTxs].sort((a, b) => b.timestamp - a.timestamp);
        console.log(`📊 Total: ${allTransactions.length} transactions (${normalTxs.length} normal, ${tokenTxs.length} tokens)`);
        return allTransactions;
      }),
      catchError(error => {
        console.error('❌ Error combining transactions:', error);
        return of([]);
      })
    );
  }

  clearCacheForAddress(address: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(address)) {
        this.cache.delete(key);
      }
    }
  }

  clearCache() {
    this.cache.clear();
  }
}