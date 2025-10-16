import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { Router } from "@angular/router"

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
                  photo: "/professional-woman-engineer.png",
            },
      ]

      constructor(private router: Router) { }

      ngOnInit() {
            this.checkWalletConnection()
      }

      async checkWalletConnection() {
            if (typeof window !== "undefined" && (window as any).ethereum) {
                  try {
                        const accounts = await (window as any).ethereum.request({
                              method: "eth_accounts",
                        })
                        if (accounts.length > 0) {
                              this.walletAddress = accounts[0]
                              this.isConnected = true
                              // Si ya está conectado, podría redirigir automáticamente
                              // this.router.navigate(['/dashboard'])
                        }
                  } catch (error) {
                        console.error("Error checking wallet connection:", error)
                  }
            }
      }

      openWalletModal() {
            this.showWalletModal = true
      }

      closeWalletModal() {
            this.showWalletModal = false
      }

      async selectWallet(walletId: string) {
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
            if (typeof window !== "undefined" && (window as any).ethereum) {
                  this.isConnecting = true
                  try {
                        const accounts = await (window as any).ethereum.request({
                              method: "eth_requestAccounts",
                        })
                        this.walletAddress = accounts[0]
                        this.isConnected = true
                        this.showWalletModal = false

                        // Redirigir al dashboard después de conectar exitosamente
                        setTimeout(() => {
                              this.router.navigate(['/dashboard'])
                        }, 500) // Pequeño delay para que el usuario vea el éxito

                  } catch (error) {
                        console.error("Error connecting wallet:", error)
                        alert("Error al conectar con MetaMask")
                  } finally {
                        this.isConnecting = false
                  }
            } else {
                  alert("Por favor instala MetaMask para continuar")
                  window.open("https://metamask.io/download/", "_blank")
            }
      }

      private async connectWalletConnect() {
            this.isConnecting = true
            try {
                  // Aquí iría la lógica de WalletConnect
                  alert("WalletConnect: Esta funcionalidad estará disponible próximamente")
                  this.showWalletModal = false
                  // Cuando implementes WalletConnect real, descomenta esta línea:
                  // this.router.navigate(['/dashboard'])
            } catch (error) {
                  console.error("Error connecting with WalletConnect:", error)
                  alert("Error al conectar con WalletConnect")
            } finally {
                  this.isConnecting = false
            }
      }

      private async connectCoinbase() {
            this.isConnecting = true
            try {
                  // Aquí iría la lógica de Coinbase Wallet
                  alert("Coinbase Wallet: Esta funcionalidad estará disponible próximamente")
                  this.showWalletModal = false
                  // Cuando implementes Coinbase real, descomenta esta línea:
                  // this.router.navigate(['/dashboard'])
            } catch (error) {
                  console.error("Error connecting with Coinbase:", error)
                  alert("Error al conectar con Coinbase Wallet")
            } finally {
                  this.isConnecting = false
            }
      }

      disconnectWallet() {
            this.walletAddress = ""
            this.isConnected = false
      }

      // Método para ir al dashboard si ya está conectado
      goToDashboard() {
            if (this.isConnected) {
                  this.router.navigate(['/dashboard'])
            }
      }

      formatAddress(address: string): string {
            return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
      }
}