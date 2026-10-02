# 🏗️ Arquitectura Completa del PumpFun Sniper Bot

## 📋 Resumen Ejecutivo

Bot de trading automatizado para memecoins en Solana que detecta y ejecuta operaciones en tokens de Pump.fun y Raydium Launchpad en tiempo real.

---

## 🎯 Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                    (React + TypeScript)                      │
│                      Puerto: 5173                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │ Live Monitor │  │   Testing    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Config     │  │   History    │  │   Wallet     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐                                          │
│  │  Connections │                                          │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/JSON
┌─────────────────────────────────────────────────────────────┐
│                          BACKEND                             │
│                    (Node.js + Express)                       │
│                      Puerto: 3001                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Pump.fun    │  │   Raydium    │  │    Solana    │      │
│  │   Service    │  │   Service    │  │  RPC Service │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Cache Layer (2 segundos)               │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    APIs EXTERNAS (REALES)                    │
├─────────────────────────────────────────────────────────────┤
│  • Pump.fun API: https://frontend-api-v2.pump.fun          │
│  • Raydium API: https://api-v3.raydium.io                  │
│  • Solana RPC: https://mainnet.helius-rpc.com              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico Completo

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 18.2.0 | Framework UI principal |
| **TypeScript** | 5.7.0 | Tipado estático |
| **Vite** | 6.3.5 | Build tool y dev server |
| **Tailwind CSS** | 4.1.7 | Estilos utility-first |
| **Recharts** | 2.10.0 | Gráficos y visualizaciones |
| **Framer Motion** | 11.16.1 | Animaciones |
| **Lucide React** | 0.294.0 | Iconos |
| **React Router** | 6.8.0 | Navegación SPA |
| **date-fns** | 2.30.0 | Manipulación de fechas |
| **UUID** | 9.0.1 | Generación de IDs únicos |

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Node.js** | 18+ | Runtime de JavaScript |
| **Express** | 4.18.2 | Framework web |
| **node-fetch** | 2.7.0 | HTTP client para APIs |
| **@solana/web3.js** | 1.87.6 | Interacción con Solana blockchain |
| **CORS** | 2.8.5 | Cross-Origin Resource Sharing |
| **dotenv** | 16.3.1 | Variables de entorno |
| **nodemon** | 3.0.2 | Hot reload en desarrollo |

### Herramientas de Desarrollo

- **npm**: Gestor de paquetes
- **TypeScript Compiler**: Verificación de tipos
- **ESLint**: Linting de código (configurable)
- **Prettier**: Formateo de código (configurable)

---

## 📡 APIs Utilizadas

### 1. Pump.fun API

**URL Base**: `https://frontend-api-v2.pump.fun`

**Endpoints Consumidos**:

```javascript
// Obtener tokens recientes
GET /coins/latest-metadatas?limit=200&offset=0&includeNsfw=false

// Obtener información de un token específico
GET /coins/{mint}

// Obtener trades de un token
GET /coins/{mint}/trades?limit=20
```

**Datos Obtenidos**:
- `mint`: Dirección del token
- `name`: Nombre del token
- `symbol`: Símbolo del token
- `virtual_sol_reserves`: Reservas de SOL en bonding curve
- `virtual_token_reserves`: Reservas de tokens en bonding curve
- `market_cap`: Capitalización de mercado
- `created_timestamp`: Fecha de creación
- `complete`: Si el token graduó a Raydium

**Frecuencia de Polling**: Cada 1 segundo

---

### 2. Raydium API v3

**URL Base**: `https://api-v3.raydium.io`

**Endpoints Consumidos**:

```javascript
// Obtener pools de liquidez
GET /pools/info/list?poolType=all&poolSortField=default&sortType=desc&pageSize=50&page=1

// Obtener información de un pool específico
GET /pools/info/ids?ids={pool_id}
```

**Datos Obtenidos**:
- `id`: ID del pool
- `mintA`: Token A del par
- `mintB`: Token B del par (usualmente SOL)
- `price`: Precio actual
- `liquidity`: Liquidez del pool
- `volume24h`: Volumen en 24 horas
- `fee24h`: Fees generados en 24h
- `apr24h`: APR en 24 horas

**Frecuencia de Polling**: Cada 5 segundos

---

### 3. Solana RPC (Helius)

**URL Base**: `https://mainnet.helius-rpc.com/?api-key={TU_API_KEY}`

**Métodos JSON-RPC Utilizados**:

```javascript
// Obtener versión de Solana
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getVersion"
}

// Obtener balance de una cuenta
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getBalance",
  "params": ["{wallet_address}"]
}

// Obtener información de un token SPL
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getParsedAccountInfo",
  "params": ["{mint_address}"]
}
```

**Datos Obtenidos**:
- Versión de Solana core
- Feature set
- Balances en lamports y SOL
- Información de tokens SPL

**Frecuencia**: Bajo demanda (cuando se solicita)

---

## 📁 Estructura del Proyecto

```
pumpfun-sniper-bot/
│
├── 📂 backend/                    # Backend Node.js
│   ├── 📄 server.js              # Servidor Express principal
│   ├── 📄 package.json           # Dependencias del backend
│   ├── 📄 .env                   # Variables de entorno (API keys)
│   ├── 📄 .env.example           # Ejemplo de configuración
│   ├── 📄 .gitignore             # Ignorar node_modules y .env
│   ├── 📄 README.md              # Documentación del backend
│   ├── 📄 GUIA_INICIO.md         # Guía rápida de inicio
│   ├── 📄 setup.sh               # Script de instalación (Linux/Mac)
│   ├── 📄 setup.bat              # Script de instalación (Windows)
│   └── 📄 test-connections.sh    # Script de diagnóstico
│
├── 📂 src/                        # Frontend React
│   ├── 📄 App.tsx                # Componente principal
│   ├── 📄 main.tsx               # Punto de entrada
│   ├── 📄 index.css              # Estilos globales
│   ├── 📄 types.ts               # Definiciones de tipos TypeScript
│   │
│   ├── 📂 components/            # Componentes React
│   │   ├── 📄 Sidebar.tsx                # Navegación lateral
│   │   ├── 📄 Dashboard.tsx              # Panel principal
│   │   ├── 📄 LiveMonitor.tsx            # Monitor en tiempo real
│   │   ├── 📄 TestingPanel.tsx           # Panel de pruebas
│   │   ├── 📄 BotConfigPanel.tsx         # Configuración del bot
│   │   ├── 📄 TradeHistory.tsx           # Historial de operaciones
│   │   ├── 📄 WalletPanel.tsx            # Gestión de billetera
│   │   └── 📄 ConnectionStatus.tsx       # Estado de conexiones
│   │
│   └── 📂 services/              # Servicios de API
│       ├── 📄 pumpfun-real.ts    # Servicio Pump.fun
│       └── 📄 raydium.ts         # Servicio Raydium
│
├── 📄 package.json               # Dependencias del frontend
├── 📄 tsconfig.json              # Configuración TypeScript
├── 📄 vite.config.js             # Configuración Vite
├── 📄 index.html                 # HTML principal
│
└── 📂 docs/                      # Documentación
    ├── 📄 README.md              # Documentación principal
    ├── 📄 INSTALACION.md         # Guía de instalación
    ├── 📄 DIAGNOSTICO_CONEXIONES.md
    ├── 📄 SISTEMA_FALLBACK.md
    ├── 📄 SOLUCION_CONEXIONES.md
    ├── 📄 SOLUCION_ERRORES.md
    └── 📄 TROUBLESHOOTING.md
```

---

## 🔄 Flujo de Datos

### 1. Detección de Tokens

```
[Backend] Polling cada 1s
    ↓
[Backend] GET https://frontend-api-v2.pump.fun/coins/latest-metadatas
    ↓
[Backend] Cache (2s) → Si no está en cache
    ↓
[Backend] Parsear respuesta JSON
    ↓
[Backend] Enviar a Frontend vía HTTP
    ↓
[Frontend] pumpFunRealService.fetchLatestTokens()
    ↓
[Frontend] Detectar tokens NUEVOS (comparar con lastTokenIds)
    ↓
[Frontend] Notificar listeners (newTokenListeners)
    ↓
[Frontend] Actualizar UI en tiempo real
```

### 2. Ejecución de Snipe

```
[Frontend] Token detectado
    ↓
[Frontend] Verificar condiciones:
  - ¿Hay capital disponible?
  - ¿Se alcanzó el máximo de posiciones?
  - ¿El monto está en el rango configurado?
    ↓
[Frontend] Calcular monto óptimo
    ↓
[Frontend] Ejecutar snipe (simulado por ahora)
    ↓
[Frontend] Registrar operación en trades[]
    ↓
[Frontend] Actualizar balance
    ↓
[Frontend] Monitorear posición
```

### 3. Cierre de Posición

```
[Frontend] Monitoreo continuo (cada 1s)
    ↓
[Frontend] Evaluar condiciones de salida:
  - Take Profit alcanzado
  - Stop Loss activado
  - Trailing Stop triggered
  - Tiempo máximo excedido
  - Profit time exit
    ↓
[Frontend] Ejecutar venta (simulado)
    ↓
[Frontend] Calcular P&L
    ↓
[Frontend] Actualizar balance
    ↓
[Frontend] Registrar en historial
    ↓
[Frontend] Actualizar estadísticas
```

---

## 🧩 Componentes Principales

### Frontend

#### 1. **App.tsx** (Componente Principal)
- Gestión de estado global
- Coordinación entre servicios
- Lógica de detección y snipe
- Monitoreo de posiciones abiertas
- Cálculo de estadísticas

#### 2. **Dashboard.tsx**
- Vista general del bot
- Estadísticas en tiempo real
- Posiciones abiertas
- Detecciones recientes
- Gestión de capital

#### 3. **LiveMonitor.tsx**
- Feed en tiempo real de transacciones
- Indicadores de plataforma (Pump.fun/Raydium)
- Filtros y búsqueda
- Métricas de rendimiento

#### 4. **TestingPanel.tsx**
- Simulación con tokens reales
- Configuración de parámetros
- Equity curve
- Análisis de rentabilidad
- Logs de simulación

#### 5. **BotConfigPanel.tsx**
- Configuración de conexión
- Parámetros de trading
- Filtros de detección
- Estrategia de salida
- Guardado en localStorage

#### 6. **ConnectionStatus.tsx**
- Diagnóstico de conexiones
- Estado de cada API
- Botones de reconexión
- Métricas de latencia
- Logs de error

#### 7. **TradeHistory.tsx**
- Historial completo de operaciones
- Filtros por estado
- Ordenamiento
- Exportación de datos
- Gráficos de rendimiento

#### 8. **WalletPanel.tsx**
- Gestión de billetera
- Balance y tenencias
- Conexión de wallet
- Acciones rápidas
- Información de seguridad

### Backend

#### 1. **server.js** (Servidor Express)
- API REST para frontend
- Proxy a APIs externas
- Sistema de cache
- Manejo de errores
- Endpoints de diagnóstico

**Endpoints Principales**:

```javascript
// Pump.fun
GET  /api/pumpfun/tokens
GET  /api/pumpfun/token/:mint
GET  /api/pumpfun/token/:mint/trades

// Raydium
GET  /api/raydium/pools
GET  /api/raydium/pool/:id

// Solana
GET  /api/solana/version
GET  /api/solana/balance/:address
GET  /api/solana/token/:mint

// Utilidad
GET  /api/health
GET  /api/diagnose
GET  /api/stats
POST /api/cache/clear
```

### Servicios

#### 1. **pumpfun-real.ts**
- Conexión a Pump.fun API
- Polling automático
- Detección de tokens nuevos
- Sistema de reconexión
- Cálculo de precios

#### 2. **raydium.ts**
- Conexión a Raydium API
- Polling de pools
- Conversión de pools a tokens
- Sistema de reconexión
- Cálculo de precios

---

## 🔐 Seguridad

### Manejo de Claves Privadas

- ✅ Almacenadas solo en localStorage (frontend)
- ✅ Nunca enviadas al backend
- ✅ Nunca enviadas a terceros
- ✅ Encriptación recomendada para producción

### Variables de Entorno

```env
# backend/.env
PORT=3001
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=TU_API_KEY
```

### Recomendaciones de Seguridad

1. **Usar billetera dedicada** con fondos limitados
2. **Nunca compartir** claves privadas
3. **Implementar encriptación** para producción
4. **Usar HTTPS** en producción
5. **Implementar autenticación** para endpoints sensibles
6. **Rate limiting** para prevenir abuso
7. **Logs de auditoría** para todas las operaciones

---

## 📊 Rendimiento

### Métricas de Latencia

| Operación | Latencia Esperada |
|-----------|-------------------|
| Detección de token | 100-300ms |
| Fetch Pump.fun | 200-500ms |
| Fetch Raydium | 200-500ms |
| Solana RPC | 50-200ms |
| Cache hit | <10ms |
| Renderizado UI | 16-60ms |

### Optimizaciones Implementadas

- ✅ **Cache de 2 segundos** para reducir llamadas a APIs
- ✅ **Polling optimizado** (1s Pump.fun, 5s Raydium)
- ✅ **Detección de tokens nuevos** sin re-procesar todos
- ✅ **Lazy loading** de componentes
- ✅ **Memoización** de cálculos pesados
- ✅ **AbortController** para timeouts de fetch

---

## 🚀 Despliegue

### Desarrollo Local

```bash
# Terminal 1: Backend
cd backend
npm install
npm start

# Terminal 2: Frontend
npm install
npm run dev
```

### Producción (Recomendaciones)

#### Frontend
```bash
npm run build
# Servir dist/ con nginx, Vercel, Netlify, etc.
```

#### Backend
```bash
# Usar PM2 para process management
pm2 start backend/server.js --name "sniper-bot"

# O usar Docker
docker build -t sniper-bot-backend .
docker run -p 3001:3001 sniper-bot-backend
```

#### Base de Datos (Para Producción)
- **PostgreSQL**: Para historial de operaciones
- **Redis**: Para cache distribuido
- **InfluxDB/TimescaleDB**: Para métricas de rendimiento

---

## 🎯 Características Principales

### Funcionalidades Implementadas

✅ **Detección en Tiempo Real**
- Polling cada 1 segundo a Pump.fun
- Polling cada 5 segundos a Raydium
- Detección automática de tokens nuevos

✅ **Ejecución de Snipes**
- Entrada automática cuando se detecta oportunidad
- Cálculo óptimo de monto
- Gestión de capital inteligente

✅ **Estrategia de Salida**
- Take Profit configurable
- Stop Loss automático
- Trailing Stop
- Time-based exit
- Profit time exit

✅ **Monitoreo en Vivo**
- Dashboard con estadísticas
- Monitor de transacciones
- Posiciones abiertas
- Historial completo

✅ **Testing y Simulación**
- Simulación con tokens reales
- Análisis de rentabilidad
- Equity curve
- Logs detallados

✅ **Gestión de Conexiones**
- Diagnóstico completo
- Reconexión automática
- Manejo de errores
- Logs detallados

### Funcionalidades Pendientes (Para Producción)

⚠️ **Ejecución Real de Trades**
- Integración con @solana/web3.js para firmar transacciones
- Envío de transacciones a la blockchain
- Monitoreo de confirmaciones

⚠️ **Jito Bundles**
- Integración con Jito para transacciones priorizadas
- Implementación de bundles para front-running

⚠️ **Base de Datos**
- Persistencia de historial
- Métricas de rendimiento a largo plazo
- Análisis avanzado

⚠️ **Autenticación**
- Login de usuarios
- Múltiples billeteras
- Permisos y roles

⚠️ **Notificaciones**
- Alertas por Telegram/Discord
- Notificaciones push
- Email alerts

---

## 📈 Escalabilidad

### Limitaciones Actuales

- **Single-threaded**: Node.js es single-threaded
- **Memory-bound**: Todo en memoria (sin base de datos)
- **Rate limits**: Dependiente de límites de APIs externas
- **Single-user**: Diseñado para un solo usuario

### Estrategias de Escalabilidad

1. **Horizontal Scaling**
   - Múltiples instancias del backend
   - Load balancer (nginx, HAProxy)
   - Base de datos distribuida

2. **Vertical Scaling**
   - Aumentar RAM para más cache
   - CPUs más rápidos para procesamiento
   - SSDs para I/O

3. **Microservicios**
   - Separar servicios por API (Pump.fun, Raydium, Solana)
   - Queue system (RabbitMQ, Kafka) para procesamiento asíncrono
   - Worker pools para tareas pesadas

4. **CDN y Caching**
   - CloudFlare para CDN
   - Redis para cache distribuido
   - CDN para assets estáticos

---

## 🔮 Roadmap Futuro

### Corto Plazo (1-2 meses)

- [ ] Implementar ejecución real de trades
- [ ] Integrar Jito bundles
- [ ] Base de datos PostgreSQL
- [ ] Sistema de notificaciones
- [ ] Autenticación de usuarios

### Mediano Plazo (3-6 meses)

- [ ] Multi-usuario con roles
- [ ] Dashboard analítico avanzado
- [ ] Backtesting con datos históricos
- [ ] Machine learning para predicción
- [ ] API pública para integraciones

### Largo Plazo (6-12 meses)

- [ ] Soporte para múltiples blockchains
- [ ] Estrategias de trading avanzadas
- [ ] Social trading (copiar estrategias)
- [ ] Marketplace de estrategias
- [ ] Integración con DEXs adicionales

---

## 📚 Recursos Adicionales

### Documentación Oficial

- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org
- **Express**: https://expressjs.com
- **Solana Web3.js**: https://solana-labs.github.io/solana-web3.js
- **Pump.fun**: https://pump.fun
- **Raydium**: https://raydium.io
- **Helius**: https://helius.dev

### APIs Utilizadas

- **Pump.fun API**: `https://frontend-api-v2.pump.fun`
- **Raydium API**: `https://api-v3.raydium.io`
- **Solana RPC**: `https://mainnet.helius-rpc.com`

### Herramientas Recomendadas

- **VS Code**: Editor de código
- **Postman**: Testing de APIs
- **Docker**: Containerización
- **PM2**: Process management
- **nginx**: Reverse proxy

---

## 🎓 Conclusión

Este bot representa una solución completa de trading automatizado para memecoins en Solana, con:

- ✅ **Arquitectura moderna** (React + Node.js + TypeScript)
- ✅ **Conexiones reales** a APIs de Pump.fun, Raydium y Solana
- ✅ **Sistema robusto** de detección y ejecución
- ✅ **Monitoreo en tiempo real** con métricas detalladas
- ✅ **Testing y simulación** para probar estrategias
- ✅ **Documentación completa** para mantenimiento

**Estado Actual**: Funcional para pruebas y simulación con datos reales
**Próximo Paso**: Implementar ejecución real de trades con @solana/web3.js

---

**Desarrollado con ❤️ para la comunidad de traders de Solana**
