# 🎯 PumpFun Sniper Bot v2.0

Bot de trading de memecoins en Solana con **detección on-chain real** via WebSocket al programa Pump.fun.

## ⚠️ Estado Actual

**Versión**: 2.0.0 (Arquitectura On-Chain)

**Características Implementadas**:
- ✅ Detección on-chain de tokens Pump.fun via WebSocket
- ✅ Conexión Solana con health checks reales
- ✅ Configuración centralizada y validada
- ✅ Paper trading por defecto (seguro)
- ✅ Claves privadas solo en backend
- ✅ Script de diagnóstico completo
- ✅ Documentación completa

**Pendiente de Implementación**:
- ⚠️ Ejecución real de trades (firma y envío)
- ⚠️ Adaptadores completos para PumpSwap/Raydium
- ⚠️ Sistema de backfill para slots perdidos
- ⚠️ Tests unitarios exhaustivos

## 🚀 Inicio Rápido

### 1. Clonar y Configurar

```bash
# Clonar repositorio
git clone <repo-url>
cd pumpfun-sniper-bot

# Backend
cd backend
cp .env.example .env
# Editar .env con tus valores (especialmente SOLANA_RPC_URL)
npm install

# Frontend
cd ..
npm install
```

### 2. Configurar Variables de Entorno

Editar `backend/.env`:

```bash
# OBLIGATORIO
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=TU_API_KEY_AQUI
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false

# OPCIONAL (recomendado)
SOLANA_WS_URL=wss://mainnet.helius-rpc.com/?api-key=TU_API_KEY_AQUI
```

**Importante**: 
- Reemplaza `TU_API_KEY_AQUI` con tu API key de Helius
- Obtén una gratis en: https://helius.dev
- **NUNCA commitees el archivo `.env`**

### 3. Ejecutar Diagnóstico

```bash
cd backend
node diagnose.js
```

Deberías ver:
```
✅ Configuración cargada correctamente
✅ RPC HTTP conectado
✅ RPC getVersion
✅ RPC getSlot
✅ RPC getLatestBlockhash
✅ Modo de trading seguro
```

### 4. Iniciar Backend

```bash
cd backend
npm start
```

Verás:
```
🚀 PUMPFUN SNIPER BOT - BACKEND
============================================================

📋 Configuración:
   Modo: paper
   Live trading: DESACTIVADO
   RPC: https://mainnet.helius-rpc.com/?api-key=...
   Puerto: 3001

[Init] Conectando a Solana...
[Init] ✅ Solana conectado

[Init] Iniciando detector Pump.fun...
[Init] ✅ Detector Pump.fun activo

✅ Servidor corriendo en http://localhost:3001
```

### 5. Iniciar Frontend

```bash
# En otra terminal
npm run dev
```

Abre: http://localhost:5173

## 🏗️ Arquitectura

```
Frontend (React + TS)
    ↓ HTTP/WebSocket
Backend (Node.js + Express)
    ├── Config Module (validación)
    ├── Solana Connection Manager (HTTP + WebSocket)
    ├── Pump.fun Detector (on-chain via WebSocket)
    └── Execution Engine (paper/live)
    ↓ WebSocket
Solana Blockchain
    └── Pump.fun Program (6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P)
```

### Diferencias con v1.0

| Característica | v1.0 (Antes) | v2.0 (Ahora) |
|----------------|--------------|--------------|
| Detección | Polling HTTP a API web | WebSocket on-chain |
| Claves privadas | localStorage | Solo backend |
| Health checks | Falsos | Reales |
| Modo trading | Simulado | Paper/Live |
| Seguridad | Baja | Alta |

## 🔒 Seguridad

### Modo de Trading

**Paper Mode** (por defecto):
```bash
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
```
- ✅ NO firma transacciones
- ✅ NO envía transacciones
- ✅ Solo simulación
- ✅ Seguro para pruebas

**Live Mode** (peligroso):
```bash
TRADING_MODE=live
ENABLE_LIVE_TRADING=true
```
- ⚠️ FIRMA transacciones reales
- ⚠️ ENVÍA transacciones a Solana
- ⚠️ Usa dinero real
- ⚠️ Requiere wallet dedicada

### Claves Privadas

- ❌ NUNCA en localStorage
- ❌ NUNCA en código
- ❌ NUNCA en logs
- ✅ Solo en `.env` (backend)
- ✅ Wallet dedicada con fondos limitados

Ver [docs/SECURITY.md](docs/SECURITY.md) para guía completa.

## 📡 APIs Utilizadas

### Principal: On-Chain
- **Pump.fun Program**: `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`
  - Detección via WebSocket
  - Tiempo real
  - Sin polling

### Auxiliares (Deprecated)
- `https://frontend-api-v2.pump.fun` - API web no oficial (solo compatibilidad)
- `https://api-v3.raydium.io` - API Raydium (pendiente implementación completa)

### RPC
- **Helius** (recomendado): `https://mainnet.helius-rpc.com`
- **Fallback**: `https://api.mainnet-beta.solana.com`

## 🔧 Comandos

### Backend

```bash
cd backend

# Instalar dependencias
npm install

# Iniciar servidor
npm start

# Modo desarrollo (hot reload)
npm run dev

# Ejecutar diagnóstico
npm run diagnose
# o
node diagnose.js
```

### Frontend

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Build para producción
npm run build
```

## 📊 Endpoints

### Principales
- `GET /api/health` - Health check básico
- `GET /api/health/detailed` - Health check detallado
- `GET /api/diagnose` - Diagnóstico completo
- `GET /api/stats` - Estadísticas y métricas
- `GET /api/config` - Configuración (safe)

### Auxiliares (Deprecated)
- `GET /api/pumpfun/tokens` - AUXILIAR (usa on-chain)
- `GET /api/raydium/pools` - AUXILIAR

## 🧪 Testing

### Paper Trading (Recomendado)

1. Configurar `.env`:
```bash
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
```

2. Iniciar backend y frontend
3. Monitorear detección de tokens en logs
4. Verificar que NO se firman transacciones

### Live Trading (Peligroso)

**ANTES de activar**:
- [ ] Probar exhaustivamente en paper mode
- [ ] Crear wallet dedicada
- [ ] Transferir solo fondos limitados
- [ ] Configurar límites de riesgo
- [ ] Revisar [docs/SECURITY.md](docs/SECURITY.md)

**Activar**:
```bash
TRADING_MODE=live
ENABLE_LIVE_TRADING=true
WALLET_PRIVATE_KEY=tu_clave_aqui
```

**Kill Switch**:
```bash
# Detener inmediatamente
Ctrl+C

# O cambiar a paper mode
TRADING_MODE=paper
npm start
```

## 📚 Documentación

- [ARQUITECTURA.md](docs/ARCHITECTURE.md) - Arquitectura completa
- [SECURITY.md](docs/SECURITY.md) - Guía de seguridad
- [INSPECCION_INICIAL.md](INSPECCION_INICIAL.md) - Informe de inspección
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Solución de problemas

## ⚙️ Configuración

### Variables de Entorno Obligatorias

```bash
# RPC de Solana (Helius recomendado)
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=TU_API_KEY

# Modo de trading
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
```

### Variables Opcionales

```bash
# WebSocket (recomendado para tiempo real)
SOLANA_WS_URL=wss://mainnet.helius-rpc.com/?api-key=TU_API_KEY

# RPC de respaldo
SOLANA_RPC_FALLBACK_URL=https://api.mainnet-beta.solana.com

# Wallet (solo para live trading)
WALLET_PRIVATE_KEY=tu_clave_privada

# Límites de riesgo
DAILY_LOSS_LIMIT=1.0
MAX_TRADE_AMOUNT=0.5
MAX_SLIPPAGE_PERCENT=15
MIN_WALLET_BALANCE=0.1
```

Ver [backend/.env.example](backend/.env.example) para lista completa.

## 🐛 Troubleshooting

### Error: "SOLANA_RPC_URL es obligatorio"
```bash
# Solución: Configurar .env
cd backend
cp .env.example .env
# Editar .env y agregar SOLANA_RPC_URL
```

### Error: "Debes reemplazar TU_API_KEY"
```bash
# Solución: Obtener API key de Helius
# 1. Ir a https://helius.dev
# 2. Registrarse
# 3. Copiar API key
# 4. Reemplazar en .env
```

### Error: "Conexión HTTP falló"
```bash
# Solución: Verificar RPC
node diagnose.js
# Revisar resultados y corregir SOLANA_RPC_URL
```

### Bot no detecta tokens
```bash
# Verificar que el detector está activo
# Buscar en logs: "[PumpFun] ✅ Suscrito a logs del programa Pump.fun"
# Si no aparece, revisar SOLANA_WS_URL
```

Ver [TROUBLESHOOTING.md](TROUBLESHOOTING.md) para más problemas.

## 📈 Métricas

El bot expone métricas en `/api/stats`:

```json
{
  "pumpFunMetrics": {
    "eventsReceived": 1234,
    "eventsProcessed": 1200,
    "eventsDuplicated": 34,
    "eventsFailed": 0,
    "lastEventAt": 1234567890,
    "lastSlot": 123456789
  }
}
```

## 🔮 Roadmap

### Corto Plazo
- [ ] Implementar ejecución real de trades
- [ ] Agregar adaptador PumpSwap
- [ ] Agregar adaptador Raydium completo
- [ ] Tests unitarios

### Mediano Plazo
- [ ] Sistema de backfill para slots perdidos
- [ ] Yellowstone gRPC integration
- [ ] Base de datos para persistencia
- [ ] Sistema de notificaciones

### Largo Plazo
- [ ] Multi-usuario con autenticación
- [ ] Dashboard analítico avanzado
- [ ] Machine learning para predicción
- [ ] Soporte para múltiples blockchains

## 🤝 Contribuir

1. Fork el repositorio
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

MIT

## ⚠️ Disclaimer

**ESTE SOFTWARE ES EXPERIMENTAL**

- El trading de criptomonedas conlleva riesgos significativos
- Puedes perder todo tu capital
- Prueba exhaustivamente en paper mode antes de usar fondos reales
- Usa solo fondos que puedas permitirte perder
- No es consejo financiero
- Úsalo bajo tu propio riesgo

## 📞 Soporte

- Issues: GitHub Issues
- Documentación: Ver carpeta `docs/`
- Seguridad: Ver [docs/SECURITY.md](docs/SECURITY.md)

---

**Desarrollado con ❤️ para la comunidad de traders de Solana**

**Versión**: 2.0.0  
**Última actualización**: 2024  
**Estado**: Funcional (paper trading) / En desarrollo (live trading)
