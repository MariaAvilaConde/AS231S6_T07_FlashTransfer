import { Component, type OnInit, OnDestroy, Inject, PLATFORM_ID } from "@angular/core"
import { CommonModule, isPlatformBrowser } from "@angular/common"
import { Router } from "@angular/router"
import { Subject } from "rxjs"
import { takeUntil } from "rxjs/operators"

// Declarar la interfaz de Ethereum para TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface TeamMember {
  name: string
  role: string
  photo: string
}

interface WalletOption {
  id: string
  name: string
  icon: string
  description: string
  available: boolean
}

@Component({
  selector: "app-menu",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./menu.component.html",
  styleUrl: "./menu.component.css",
})
export class MenuComponent implements OnInit, OnDestroy {
  walletAddress = ""
  isConnected = false
  isConnecting = false
  showWalletModal = false
  errorMessage = ""
  private isBrowser: boolean;

  walletOptions: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Conecta con tu wallet MetaMask',
      available: true
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Escanea con tu wallet móvil',
      available: true
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '🔵',
      description: 'Conecta con Coinbase Wallet',
      available: true
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      icon: '🛡️',
      description: 'Conecta con Trust Wallet',
      available: false
    },
    {
      id: 'phantom',
      name: 'Phantom',
      icon: '👻',
      description: 'Conecta con Phantom Wallet',
      available: false
    },
    {
      id: 'rainbow',
      name: 'Rainbow',
      icon: '🌈',
      description: 'Conecta con Rainbow Wallet',
      available: false
    }
  ]

  teamMembers: TeamMember[] = [
    {
      name: "María Avila",
      role: "Blockchain Developer & Smart Contract Specialist",
      photo: "/assets/img/maria.jpeg",
    },
    {
      name: "Kasandra Chumpitaz",
      role: "Full Stack Developer & Web3 Engineer",
      photo: "/assets/img/yo.png",
    },
  ]

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { 
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.checkWalletConnection()
    this.setupEventListeners()
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Remove event listeners only in browser environment
    if (this.isBrowser && window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  }

  async checkWalletConnection() {
    // Verificar si estamos en el cliente (navegador)
    if (!this.isBrowser) {
      return;
    }

    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        })
        if (accounts && accounts.length > 0) {
          this.walletAddress = accounts[0]
          this.isConnected = true
          console.log('Wallet ya conectado:', this.formatAddress(this.walletAddress))
        }
      } catch (error) {
        console.error("Error verificando conexión del wallet:", error)
      }
    } else {
      console.warn('No se detectó wallet (MetaMask) instalado')
    }
  }

  setupEventListeners() {
    // Only set up event listeners in browser environment
    if (!this.isBrowser) {
      return;
    }
    
    if (window.ethereum) {
      // Remove existing listeners to prevent duplicates
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
      
      // Escuchar cambios de cuenta
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // Usuario desconectó todas las cuentas
          this.disconnectWallet()
        } else {
          // Usuario cambió de cuenta
          this.walletAddress = accounts[0]
          this.isConnected = true
          console.log('Cuenta cambiada:', this.formatAddress(this.walletAddress))
        }
      })

      // Escuchar cambios de red
      window.ethereum.on('chainChanged', (chainId: string) => {
        console.log('Red cambiada:', chainId)
        // Recargar la página cuando cambie la red
        if (this.isBrowser) {
          window.location.reload()
        }
      })
    }
  }

  openWalletModal() {
    this.showWalletModal = true
    this.errorMessage = "" // Clear any previous errors
  }

  closeWalletModal() {
    this.showWalletModal = false
    this.errorMessage = "" // Clear any errors
  }

  async selectWallet(walletId: string) {
    console.log('Seleccionando wallet:', walletId)
    
    if (walletId === 'metamask') {
      await this.connectMetaMask()
    } else if (walletId === 'walletconnect') {
      await this.connectWalletConnect()
    } else if (walletId === 'coinbase') {
      await this.connectCoinbase()
    } else {
      this.errorMessage = `${walletId} estará disponible próximamente`
    }
  }

  private async connectMetaMask() {
    // Verificar si estamos en el cliente
    if (!this.isBrowser) {
      this.errorMessage = 'Error: No se puede conectar en este entorno'
      return;
    }

    if (!window.ethereum) {
      this.errorMessage = "MetaMask no está instalado. Por favor instálalo para continuar."
      window.open("https://metamask.io/download/", "_blank")
      return;
    }

    this.isConnecting = true
    this.errorMessage = ""
    try {
      console.log('Solicitando conexión con MetaMask...')
      
      // Solicitar cuentas
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })
      
      if (accounts && accounts.length > 0) {
        this.walletAddress = accounts[0]
        this.isConnected = true
        this.showWalletModal = false
        
        console.log('Wallet conectado exitosamente:', this.formatAddress(this.walletAddress))
        
        // Redirigir al dashboard después de conectar
        setTimeout(() => {
          this.router.navigate(['/dashboard']).catch(err => {
            console.error('Error navegando al dashboard:', err)
            this.errorMessage = 'Error al navegar al dashboard'
          })
        }, 1000)
        
      } else {
        throw new Error('No se obtuvieron cuentas')
      }

    } catch (error: any) {
      console.error("Error conectando wallet:", error)
      this.errorMessage = error.message || "Error desconocido al conectar con MetaMask"
      
      // Manejar errores específicos
      if (error.code === 4001) {
        this.errorMessage = "Conexión rechazada por el usuario"
      } else if (error.code === -32002) {
        this.errorMessage = "Ya hay una solicitud de conexión pendiente. Por favor revisa tu MetaMask."
      }
    } finally {
      this.isConnecting = false
    }
  }

  private async connectWalletConnect() {
    this.isConnecting = true
    this.errorMessage = ""
    try {
      this.errorMessage = "WalletConnect: Esta funcionalidad estará disponible próximamente"
      this.showWalletModal = false
    } catch (error: any) {
      console.error("Error conectando con WalletConnect:", error)
      this.errorMessage = "Error al conectar con WalletConnect: " + (error.message || "Error desconocido")
    } finally {
      this.isConnecting = false
    }
  }

  private async connectCoinbase() {
    this.isConnecting = true
    this.errorMessage = ""
    try {
      this.errorMessage = "Coinbase Wallet: Esta funcionalidad estará disponible próximamente"
      this.showWalletModal = false
    } catch (error: any) {
      console.error("Error conectando con Coinbase:", error)
      this.errorMessage = "Error al conectar con Coinbase Wallet: " + (error.message || "Error desconocido")
    } finally {
      this.isConnecting = false
    }
  }

  disconnectWallet() {
    this.walletAddress = "";
    this.isConnected = false;
    console.log('Wallet desconectado');
    
    // Remover event listeners si es necesario
    if (this.isBrowser && window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
    
    // Navigate to home page
    this.router.navigate(['/']);
  }

  goToDashboard() {
    if (this.isConnected) {
      this.router.navigate(['/dashboard']).catch(err => {
        console.error('Error navegando al dashboard:', err)
        this.errorMessage = 'Error al navegar al dashboard'
      })
    } else {
      this.openWalletModal()
    }
  }

  formatAddress(address: string): string {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Método adicional para verificar el estado de la conexión
  getConnectionStatus(): string {
    if (this.isConnecting) return 'Conectando...'
    if (this.isConnected) return `Conectado: ${this.formatAddress(this.walletAddress)}`
    return 'Desconectado'
  }
}