// src/app/dapp/config/constants.ts

export interface NetworkConfig {
  name: string;
  chainId: number;
  chainIdHex: string;
  symbol: string;
  decimals: number;
  rpcUrls: string[];
  blockExplorer: string;
  apiUrl: string;
  isTestnet: boolean;
}

export const NETWORKS: { [key: string]: NetworkConfig } = {
  ETHEREUM_MAINNET: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    chainIdHex: '0x1',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://eth.llamarpc.com',
      'https://ethereum.publicnode.com'
    ],
    blockExplorer: 'https://etherscan.io',
    apiUrl: 'https://api.etherscan.io/api',
    isTestnet: false
  },
  
  SEPOLIA: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://ethereum-sepolia.publicnode.com',
      'https://rpc.sepolia.org'
    ],
    blockExplorer: 'https://sepolia.etherscan.io',
    apiUrl: 'https://api-sepolia.etherscan.io/api',
    isTestnet: true
  },
  
  HOLESKY: {
    name: 'Holesky Testnet',
    chainId: 17000,
    chainIdHex: '0x4268',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://ethereum-holesky.publicnode.com',
      'https://holesky.drpc.org'
    ],
    blockExplorer: 'https://holesky.etherscan.io',
    apiUrl: 'https://api-holesky.etherscan.io/api',
    isTestnet: true
  },
  
  POLYGON_MAINNET: {
    name: 'Polygon Mainnet',
    chainId: 137,
    chainIdHex: '0x89',
    symbol: 'MATIC',
    decimals: 18,
    rpcUrls: [
      'https://polygon-rpc.com',
      'https://polygon.llamarpc.com'
    ],
    blockExplorer: 'https://polygonscan.com',
    apiUrl: 'https://api.polygonscan.com/api',
    isTestnet: false
  },
  
  MUMBAI: {
    name: 'Mumbai Testnet',
    chainId: 80001,
    chainIdHex: '0x13881',
    symbol: 'MATIC',
    decimals: 18,
    rpcUrls: [
      'https://rpc-mumbai.maticvigil.com',
      'https://polygon-mumbai.blockpi.network/v1/rpc/public'
    ],
    blockExplorer: 'https://mumbai.polygonscan.com',
    apiUrl: 'https://api-testnet.polygonscan.com/api',
    isTestnet: true
  }
};

// Mapeo inverso de chainId hex a nombre de red
export const CHAIN_ID_TO_NETWORK: { [chainIdHex: string]: string } = {
  '0x1': 'ETHEREUM_MAINNET',
  '0xaa36a7': 'SEPOLIA',
  '0x4268': 'HOLESKY',
  '0x89': 'POLYGON_MAINNET',
  '0x13881': 'MUMBAI'
};

// Mapeo de nombres simplificados (para compatibilidad)
export const NETWORK_NAMES_MAP: { [key: string]: string } = {
  'mainnet': 'ETHEREUM_MAINNET',
  'ethereum': 'ETHEREUM_MAINNET',
  'eth': 'ETHEREUM_MAINNET',
  'sepolia': 'SEPOLIA',
  'holesky': 'HOLESKY',
  'polygon': 'POLYGON_MAINNET',
  'mumbai': 'MUMBAI',
  'matic': 'POLYGON_MAINNET'
};

// Función auxiliar para obtener configuración de red
export function getNetworkConfig(identifier: string | number): NetworkConfig | undefined {
  // Si es un número, buscar por chainId
  if (typeof identifier === 'number') {
    return Object.values(NETWORKS).find(n => n.chainId === identifier);
  }
  
  // Si es string hex, buscar por chainIdHex
  if (identifier.startsWith('0x')) {
    const networkKey = CHAIN_ID_TO_NETWORK[identifier];
    return networkKey ? NETWORKS[networkKey] : undefined;
  }
  
  // Si es nombre simplificado, mapear al nombre completo
  const normalizedName = identifier.toLowerCase();
  const networkKey = NETWORK_NAMES_MAP[normalizedName];
  return networkKey ? NETWORKS[networkKey] : NETWORKS[identifier];
}

// Obtener todas las redes de testnet
export function getTestnetNetworks(): NetworkConfig[] {
  return Object.values(NETWORKS).filter(n => n.isTestnet);
}

// Obtener todas las redes de mainnet
export function getMainnetNetworks(): NetworkConfig[] {
  return Object.values(NETWORKS).filter(n => !n.isTestnet);
}

// Validar si un chainId es válido
export function isValidChainId(chainId: string | number): boolean {
  if (typeof chainId === 'number') {
    return Object.values(NETWORKS).some(n => n.chainId === chainId);
  }
  return Object.values(NETWORKS).some(n => n.chainIdHex === chainId);
}

// Contrato inteligente (reemplazar con tu dirección real)
export const CONTRACT_ADDRESSES: { [network: string]: string } = {
  ETHEREUM_MAINNET: '0x0000000000000000000000000000000000000000',
  SEPOLIA: '0x0000000000000000000000000000000000000000',
  HOLESKY: '0x0000000000000000000000000000000000000000',
  POLYGON_MAINNET: '0x0000000000000000000000000000000000000000',
  MUMBAI: '0x0000000000000000000000000000000000000000'
};