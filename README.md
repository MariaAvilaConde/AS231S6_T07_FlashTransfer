# FlashTransfer - Plataforma de Transferencias Criptográficas

## Descripción

FlashTransfer es una plataforma avanzada de transferencias criptográficas construida con Angular que permite a los usuarios enviar y recibir activos digitales de manera segura y rápida a través de la blockchain. La aplicación ofrece una interfaz moderna y tecnológica con soporte para múltiples redes blockchain.

## Características Principales

### 🚀 Interfaz Moderna y Profesional
- Diseño completamente renovado con gradientes, animaciones y efectos visuales avanzados
- Paleta de colores oscuros con acentos en azul, púrpura y cian
- Efectos de transparencia y desenfoque para una experiencia visual premium
- Diseño completamente responsive para todos los dispositivos

### 🔐 Seguridad Avanzada
- Integración completa con MetaMask y otras wallets compatibles
- Verificación de direcciones y validación de datos
- Manejo seguro de claves y sesiones
- Protección contra ataques comunes de blockchain

### 🌐 Soporte Multi-Red
- Compatibilidad con Ethereum Mainnet, Sepolia, Holesky y otras redes
- Selector de red intuitivo con indicadores visuales
- Cambio de red sin interrupciones en la experiencia del usuario

### 💰 Funcionalidades de Wallet
- Visualización de saldo en tiempo real
- Historial de transacciones completo
- Envío y recepción de criptomonedas
- Copia de direcciones con un solo clic

### ⚡ Experiencia de Usuario Mejorada
- Animaciones suaves y transiciones elegantes
- Notificaciones en tiempo real del estado de las transacciones
- Feedback visual inmediato para todas las acciones
- Sistema de carga con indicadores de progreso

## Tecnologías Utilizadas

- **Frontend**: Angular 15+, TypeScript, HTML5, CSS3
- **Blockchain**: Ethers.js, MetaMask API
- **Diseño**: CSS Grid, Flexbox, Animaciones CSS
- **APIs**: Etherscan API para datos de transacciones
- **Herramientas**: Webpack, npm, Tailwind CSS

## Mejoras Implementadas

### Interfaz de Usuario
1. **Diseño completamente renovado** con una estética más profesional y tecnológica
2. **Animaciones mejoradas** en todos los componentes
3. **Paleta de colores optimizada** para mejor contraste y accesibilidad
4. **Efectos visuales avanzados** como gradientes, sombras y transparencias

### Funcionalidad de Wallet
1. **Desconexión completa** que limpia todas las sesiones y datos locales
2. **Mejor manejo de errores** con mensajes más descriptivos
3. **Validación mejorada** de direcciones y montos
4. **Sistema de notificaciones** más robusto

### Seguridad
1. **Limpieza completa de datos** al desconectar la wallet
2. **Manejo seguro de eventos** de cambio de cuenta y red
3. **Protección contra sesiones duplicadas**

### Rendimiento
1. **Optimización de cargas** y tiempos de respuesta
2. **Mejor manejo de caché** para datos de balance
3. **Sistema de fallback** para datos de transacciones

## Componentes Principales

### 1. Navbar Component
- Navegación intuitiva entre secciones
- Selector de red integrado
- Menú de usuario con opciones de perfil
- Diseño responsive para móviles

### 2. Network Switcher
- Selector visual de redes con indicadores de estado
- Animaciones suaves al cambiar de red
- Feedback visual inmediato

### 3. Wallet Dashboard
- Vista completa del estado de la wallet
- Visualización de saldo y tokens
- Estadísticas y métricas importantes
- Acceso rápido a funciones principales

### 4. Transaction Page
- Formulario intuitivo para enviar transacciones
- Validación en tiempo real de datos
- Historial de transacciones con filtros
- Detalles completos de cada transacción

### 5. Login Page
- Selección de wallet con opciones claras
- Feedback visual durante la conexión
- Mensajes de error descriptivos

## Instalación y Configuración

### Requisitos Previos
- Node.js v16+
- npm v8+
- MetaMask u otra wallet compatible

### Instalación
```bash
# Clonar el repositorio
git clone <repositorio-url>

# Navegar al directorio del proyecto
cd FlashTransfer

# Instalar dependencias
npm install

# Iniciar la aplicación en modo desarrollo
npm start
```

### Variables de Entorno
El proyecto utiliza variables de entorno para la configuración de APIs. Asegúrate de crear un archivo `.env` con las siguientes variables:

```env
# Etherscan API Keys
ETHERSCAN_API_KEY_MAINNET=your_mainnet_api_key
ETHERSCAN_API_KEY_SEPOLIA=your_sepolia_api_key
ETHERSCAN_API_KEY_HOLESKY=your_holesky_api_key
```

## Uso

1. **Conectar Wallet**: Haz clic en "Conectar Wallet" y selecciona MetaMask
2. **Seleccionar Red**: Usa el selector de red para cambiar entre diferentes blockchains
3. **Enviar Transacciones**: Navega a la página de transacciones y completa el formulario
4. **Ver Historial**: Accede al historial completo de transacciones
5. **Desconectar**: Usa el botón de desconexión para cerrar sesión completamente

## Seguridad

- Todas las transacciones requieren confirmación en la wallet
- Las claves privadas nunca son almacenadas o transmitidas
- Comunicación segura con APIs a través de HTTPS
- Validación de datos en el cliente y servidor

## Contribución

1. Haz un fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Realiza tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Haz push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para más detalles.

## Contacto

Para soporte técnico o preguntas, por favor contacta al equipo de desarrollo.

---

**FlashTransfer** - Transformando la forma en que interactuamos con las finanzas descentralizadas ⚡