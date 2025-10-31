import { Injectable } from '@angular/core';
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
}

@Injectable({
  providedIn: 'root'
})
export class EtherscanService {
  private readonly API_KEY = '91WBR32VV7QPMZCNPQP8U557NTBWB969TG';

  // Mapa de las URLs base de la API según la red
  private readonly API_URLS: { [key: string]: string } = {
    'ETH Mainnet': 'https://api.etherscan.io/api',
    'Holesky': 'https://api-holesky.etherscan.io/api',
    'ETH Sepolia': 'https://api-sepolia.etherscan.io/api',
    'ETH Goerli': 'https://api-goerli.etherscan.io/api',
    'Polygon Mainnet': 'https://api.polygonscan.com/api',
    'Polygon Mumbai': 'https://api-testnet.polygonscan.com/api',
    'Red Desconocida': 'https://api.etherscan.io/api'
  };

  // Mapa de los prefijos para ver transacciones según la red
  private readonly EXPLORER_URLS: { [key: string]: string } = {
    'ETH Mainnet': 'https://etherscan.io',
    'Holesky': 'https://holesky.etherscan.io',
    'ETH Sepolia': 'https://sepolia.etherscan.io',
    'ETH Goerli': 'https://goerli.etherscan.io',
    'Polygon Mainnet': 'https://polygonscan.com',
    'Polygon Mumbai': 'https://mumbai.polygonscan.com',
    'Red Desconocida': 'https://etherscan.io'
  };

  // Cache for API responses
  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private cacheExpiry = 30000; // 30 seconds

  constructor(private http: HttpClient) {}

  // Obtener la URL base de la API según la red
  private getApiUrl(network: string): string {
    return this.API_URLS[network] || this.API_URLS['Red Desconocida'];
  }

  // Obtener la URL del explorador según la red
  getExplorerUrl(network: string, hash: string): string {
    const baseUrl = this.EXPLORER_URLS[network] || this.EXPLORER_URLS['Red Desconocida'];
    return `${baseUrl}/tx/${hash}`;
  }

  /**
   * Obtiene las transacciones normales de una dirección
   * @param address - La dirección a consultar
   * @param network - La red a consultar (ETH Mainnet, Holesky, etc.)
   * @param startBlock - Bloque inicial (opcional, por defecto 0)
   * @returns Lista de transacciones
   */
  getAddressTransactions(address: string, network: string, startBlock = 0): Observable<EtherscanTransaction[]> {
    if (!address) return of([]);

    const cacheKey = `normal_tx_${address}_${network}_${startBlock}`;
    const cached = this.cache.get(cacheKey);
    
    // Check if cache is valid
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return of(cached.data);
    }

    const apiUrl = this.getApiUrl(network);
    const url = `${apiUrl}?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=99999999&sort=desc&apikey=${this.API_KEY}`;

    return this.http.get<any>(url).pipe(
      timeout(10000), // 10 second timeout
      map(data => {
        if (data.status === '1' && data.result) {
          // Mapear los resultados al formato esperado por nuestra aplicación
          const transactions = data.result.map((tx: any) => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            amount: (parseInt(tx.value, 10) / 1e18).toString(), // Convertir de wei a ETH
            timestamp: parseInt(tx.timeStamp, 10) * 1000, // Convertir a milisegundos
            network: network,
            gasUsed: tx.gasUsed,
            gasPrice: tx.gasPrice,
            isError: tx.isError === '1',
            txreceipt_status: tx.txreceipt_status
          }));
          
          // Update cache
          this.cache.set(cacheKey, {
            data: transactions,
            timestamp: Date.now()
          });
          
          return transactions;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching normal transactions:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene las transacciones de token ERC-20 de una dirección
   * @param address - La dirección a consultar
   * @param network - La red a consultar
   * @returns Lista de transacciones de tokens
   */
  getAddressTokenTransfers(address: string, network: string): Observable<EtherscanTransaction[]> {
    if (!address) return of([]);

    const cacheKey = `token_tx_${address}_${network}`;
    const cached = this.cache.get(cacheKey);
    
    // Check if cache is valid
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return of(cached.data);
    }

    const apiUrl = this.getApiUrl(network);
    const url = `${apiUrl}?module=account&action=tokentx&address=${address}&sort=desc&apikey=${this.API_KEY}`;

    return this.http.get<any>(url).pipe(
      timeout(10000), // 10 second timeout
      map(data => {
        if (data.status === '1' && data.result) {
          // Mapear los resultados de tokens al formato esperado
          const transactions = data.result.map((tx: any) => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            amount: (parseInt(tx.value, 10) / Math.pow(10, parseInt(tx.tokenDecimal, 10))).toString(),
            timestamp: parseInt(tx.timeStamp, 10) * 1000,
            network: network,
            tokenName: tx.tokenName,
            tokenSymbol: tx.tokenSymbol,
            contractAddress: tx.contractAddress,
            isToken: true
          }));
          
          // Update cache
          this.cache.set(cacheKey, {
            data: transactions,
            timestamp: Date.now()
          });
          
          return transactions;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching token transactions:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene todas las transacciones (normales y tokens) de una dirección
   * @param address - La dirección a consultar
   * @param network - La red a consultar
   * @returns Lista combinada de transacciones
   */
  getAllTransactions(address: string, network: string): Observable<EtherscanTransaction[]> {
    return forkJoin([
      this.getAddressTransactions(address, network),
      this.getAddressTokenTransfers(address, network)
    ]).pipe(
      map(([normalTxs, tokenTxs]) => {
        // Combinar ambos arrays y ordenar por timestamp (más recientes primero)
        const allTransactions = [...normalTxs, ...tokenTxs].sort((a, b) => b.timestamp - a.timestamp);
        return allTransactions;
      }),
      catchError(error => {
        console.error('Error combining transactions:', error);
        return of([]);
      })
    );
  }

  /**
   * Clear cache for a specific address
   * @param address - The address to clear cache for
   */
  clearCacheForAddress(address: string) {
    // Remove all cache entries for this address
    for (const key of this.cache.keys()) {
      if (key.includes(address)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }
}