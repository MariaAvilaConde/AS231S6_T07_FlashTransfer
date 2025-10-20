import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { Router } from "@angular/router"

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
export class MenuComponent implements OnInit {
  walletAddress = ""
  isConnected = false
  isConnecting = false
  showWalletModal = false

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

  constructor(private router: Router) { }

  ngOnInit() {
    this.checkWalletConnection()
  }

  async checkWalletConnection() {
    // Verificar si estamos en el cliente (navegador)
    if (typeof window === 'undefined') {
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

  openWalletModal() {
    this.showWalletModal = true
  }

  closeWalletModal() {
    this.showWalletModal = false
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
      alert(`${walletId} estará disponible próximamente`)
    }
  }

  private async connectMetaMask() {
    // Verificar si estamos en el cliente
    if (typeof window === 'undefined') {
      alert('Error: No se puede conectar en este entorno')
      return;
    }

    if (!window.ethereum) {
      alert("MetaMask no está instalado. Por favor instálalo para continuar.")
      window.open("https://metamask.io/download/", "_blank")
      return;
    }

    this.isConnecting = true
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
        
        // Escuchar cambios de cuenta
        this.setupEventListeners()
        
        // Redirigir al dashboard después de conectar
        setTimeout(() => {
          this.router.navigate(['/dashboard']).catch(err => {
            console.error('Error navegando al dashboard:', err)
          })
        }, 1000)
        
      } else {
        throw new Error('No se obtuvieron cuentas')
      }

    } catch (error: any) {
      console.error("Error conectando wallet:", error)
      
      // Manejar errores específicos
      if (error.code === 4001) {
        alert("Conexión rechazada por el usuario")
      } else if (error.code === -32002) {
        alert("Ya hay una solicitud de conexión pendiente. Por favor revisa tu MetaMask.")
      } else {
        alert("Error al conectar con MetaMask: " + error.message)
      }
    } finally {
      this.isConnecting = false
    }
  }

  private setupEventListeners() {
    if (window.ethereum) {
      // Escuchar cambios de cuenta
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // Usuario desconectó todas las cuentas
          this.disconnectWallet()
        } else {
          // Usuario cambió de cuenta
          this.walletAddress = accounts[0]
          console.log('Cuenta cambiada:', this.formatAddress(this.walletAddress))
        }
      })

      // Escuchar cambios de red
      window.ethereum.on('chainChanged', (chainId: string) => {
        console.log('Red cambiada:', chainId)
        // Recargar la página cuando cambie la red
        window.location.reload()
      })
    }
  }

  private async connectWalletConnect() {
    this.isConnecting = true
    try {
      alert("WalletConnect: Esta funcionalidad estará disponible próximamente")
      this.showWalletModal = false
    } catch (error) {
      console.error("Error conectando con WalletConnect:", error)
      alert("Error al conectar con WalletConnect")
    } finally {
      this.isConnecting = false
    }
  }

  private async connectCoinbase() {
    this.isConnecting = true
    try {
      alert("Coinbase Wallet: Esta funcionalidad estará disponible próximamente")
      this.showWalletModal = false
    } catch (error) {
      console.error("Error conectando con Coinbase:", error)
      alert("Error al conectar con Coinbase Wallet")
    } finally {
      this.isConnecting = false
    }
  }

  disconnectWallet() {
    this.walletAddress = "";
    this.isConnected = false;
    console.log('Wallet desconectado');
    
    // Remover event listeners si es necesario
    if (window.ethereum) {
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