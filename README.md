# FlashTransfer

⚡ FlashTransfer es una plataforma descentralizada de última generación para transferencias blockchain ultrarrápidas con comisiones mínimas.

## Descripción del Proyecto

FlashTransfer es una aplicación web construida con Angular 17 que permite a los usuarios realizar transferencias de criptomonedas a través de la blockchain de Ethereum y otras redes compatibles. La plataforma ofrece una interfaz intuitiva para conectar wallets digitales, visualizar balances, enviar y recibir tokens, y consultar el historial de transacciones.

## Características Principales

- 🔗 Integración con MetaMask y múltiples wallets
- 🌐 Soporte para múltiples redes blockchain (Ethereum Mainnet, Sepolia, Holesky, Polygon, Mumbai)
- 📊 Dashboard en tiempo real con información de balances y transacciones
- 📈 Historial completo de transacciones con datos de Etherscan
- 💰 Envío y recepción de ETH y tokens ERC-20
- 🔄 Cambio de red global que se refleja en todos los componentes
- 📱 Diseño responsive para dispositivos móviles y escritorio

## Estructura del Proyecto

```
src/
├── app/
│   ├── common/              # Componentes compartidos
│   │   └── navbar/          # Barra de navegación lateral y superior
│   ├── dapp/                # Aplicación descentralizada principal
│   │   ├── abi/             # ABI de contratos inteligentes
│   │   ├── components/      # Componentes de la DApp
│   │   │   ├── network-switcher/  # Selector de red
│   │   │   ├── pages/       # Páginas principales de la aplicación
│   │   │   │   ├── dashboard/     # Panel de control
│   │   │   │   ├── history/       # Historial de transacciones
│   │   │   │   ├── login/         # Página de inicio y autenticación
│   │   │   │   ├── menu/          # Página principal con información
│   │   │   │   ├── transaction/   # Funcionalidades de envío/recibo
│   │   │   │   └── wallet/        # Gestión de wallet y balances
│   │   │   └── components.component.ts
│   │   ├── interface/       # Interfaces TypeScript
│   │   └── service/         # Servicios de la aplicación
│   │       ├── app-state.service.ts     # Gestión del estado global
│   │       ├── contract.service.ts      # Interacción con contratos
│   │       ├── etherscan.service.ts     # API de Etherscan
│   │       ├── network.service.ts       # Gestión de redes
│   │       └── wallet.service.ts        # Gestión de wallets
│   ├── utils/               # Utilidades y tipos personalizados
│   └── assets/              # Recursos estáticos (imágenes, íconos)
├── environments/            # Configuración de entornos
└── styles.css              # Estilos globales
```

## Explicación de Carpetas y Componentes

### `src/app/common/`
Contiene componentes compartidos utilizados en toda la aplicación:
- **navbar/**: Barra de navegación lateral y superior con opciones de menú y gestión de sesión

### `src/app/dapp/`
Núcleo de la aplicación descentralizada:

#### `abi/`
Archivos JSON con las definiciones de ABI (Application Binary Interface) de los contratos inteligentes utilizados en la plataforma.

#### `components/`
Componentes visuales de la aplicación:

##### `network-switcher/`
Selector de red que permite cambiar entre diferentes blockchains soportadas.

##### `pages/`
Páginas principales de la aplicación:
- **dashboard/**: Panel de control con resumen de balances y actividades
- **history/**: Vista detallada del historial de transacciones con integración Etherscan
- **login/**: Página de inicio con opción de conexión de wallet
- **menu/**: Página principal con presentación del proyecto
- **transaction/**: Interfaz para enviar y recibir tokens
- **wallet/**: Gestión completa de la wallet conectada

#### `interface/`
Interfaces TypeScript que definen la estructura de datos utilizada en la aplicación:
- **constants.ts**: Constantes del proyecto
- **wallet.interface.ts**: Tipos relacionados con wallets y transacciones

#### `service/`
Servicios que manejan la lógica de negocio:
- **app-state.service.ts**: Gestión del estado global de la aplicación
- **contract.service.ts**: Interacción con contratos inteligentes
- **etherscan.service.ts**: Integración con la API de Etherscan para obtener historial de transacciones
- **network.service.ts**: Manejo de redes blockchain soportadas
- **wallet.service.ts**: Conexión y gestión de wallets digitales

### `src/utils/`
Utilidades y definiciones de tipos personalizados:
- **auth.guard.ts**: Guard de autenticación para rutas protegidas
- **custom.d.ts**: Declaraciones de tipos personalizados

### `src/environments/`
Configuración de variables de entorno para diferentes ambientes (desarrollo, producción).

## Tecnologías Utilizadas

- **Angular 17**: Framework principal de la aplicación
- **TypeScript**: Lenguaje de programación tipado
- **ethers.js**: Librería para interacción con la blockchain de Ethereum
- **TailwindCSS**: Framework de estilos y diseño
- **Font Awesome**: Íconos vectoriales
- **Etherscan API**: Para obtener datos de transacciones
- **Web3**: Tecnología base para interacción con blockchain

## Funcionalidades Clave

### 1. Integración Ethereum y Etherscan
El proyecto incluye integración completa con la API de Etherscan para obtener el historial de transacciones:
- Obtiene tanto transacciones normales de ETH como transferencias de tokens ERC-20
- Soporta múltiples redes Ethereum (Mainnet, Sepolia, Holesky, etc.)
- Combina datos locales en caché con información en vivo de Etherscan

### 2. Cambio de Red Global
Implementa un sistema de cambio de red global donde al cambiar la red en un componente, el cambio se refleja automáticamente en todos los demás componentes:
- Gestión centralizada del estado de red
- Actualizaciones en tiempo real en todos los componentes
- Integración con el cambio de red de MetaMask
- Persistencia de la red seleccionada en localStorage

### 3. Gestión de Wallets
Permite conectar y gestionar diferentes wallets digitales:
- Integración con MetaMask
- Visualización de balances de ETH y tokens ERC-20
- Envío y recepción de tokens
- Generación de códigos QR para recepción de fondos

## Requisitos del Sistema

- Node.js 18 o superior
- Navegador moderno con soporte para Web3
- Extensión MetaMask u otra wallet compatible

## Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm start

# Construir para producción
npm run build
```

## Desarrolladores

- María Avila - Blockchain Developer & Smart Contract Specialist
- Kasandra Chumpitaz - Full Stack Developer & Web3 Engineer

---

⚡ FlashTransfer - Transferencias seguras en blockchain