# 🏗️ Arquitectura del PumpFun Sniper Bot

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                    (React + TypeScript)                      │
│                      Puerto: 5173                            │
├─────────────────────────────────────────────────────────────┤
│  • Dashboard con estadísticas en tiempo real                │
│  • Monitor de conexiones con estados independientes         │
│  • Configuración de parámetros de trading                   │
│  • Historial de operaciones                                 │
│  • NO almacena claves privadas                             │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                          BACKEND                             │
│                    (Node.js + Express)                       │
│                      Puerto: 3001                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Config Module                                        │  │
│  │  • Validación de variables de entorno                 │  │
│  │  • Seguridad de configuración                         │  │
│  │  • Singleton pattern                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Solana Connection Manager                            │  │
│  │  • Conexión HTTP y WebSocket                          │  │
│  │  • Health checks periódicos                           │  │
│  │  • Reconexión automática                              │  │
│  │  • Fallback a RPC secundario                          │  │
│  │  • Métricas de latencia                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Pump.fun Detector (On-Chain)                         │  │
│  │  • Suscripción WebSocket al programa Pump.fun         │  │
│  │  • Detección de nuevos tokens en tiempo real          │  │
│  │  • Parsing de eventos on-chain                        │  │
│  │  • Deduplicación por signature y mint                 │  │
│  │  • Tracking de slots procesados                       │  │
│  │  • Métricas de eventos                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Execution Engine (Paper/Live)                        │  │
│  │  • Paper mode: simulación sin firma                   │  │
│  │  • Live mode: firma y envío real                      │  │
│  │  • Risk checks                                        │  │
│  │  • Slippage protection                                │  │
│  │  • Kill switch                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ WebSocket/HTTP
┌─────────────────────────────────────────────────────────────┐
│                    SOLANA BLOCKCHAIN                         │
├─────────────────────────────────────────────────────────────┤
│  • Pump.fun Program: 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ...   │
│  • Raydium Programs (AMM, CPMM, CLMM)                       │
│  • Token Program                                            │
│  • System Program                                           │
└─────────────────────────────────────────────────────────────┘
```

## Flujo de Detección On-Chain

```
1. Backend se suscribe al programa Pump.fun via WebSocket
   ↓
2. Solana envía logs de transacciones en tiempo real
   ↓
3. Detector parsea logs buscando creación de tokens
   ↓
4. Deduplicación por signature y mint
   ↓
5. Evento normalizado publicado internamente
   ↓
6. Lógica de negocio evalúa si hacer snipe
   ↓
7. Si cumple filtros → ejecutar trade (paper/live)
   ↓
8. Frontend recibe evento via WebSocket/SSE
   ↓
9. UI actualizada en tiempo real
```

## Flujo de Ejecución de Trade

```
Paper Mode:
  TradeSignal → RiskCheck → SimulateTrade → RecordResult → NotifyFrontend

Live Mode:
  TradeSignal
    → RiskCheck
    → MarketValidation
    → Quote
    → SlippageCheck
    → BuildTransaction
    → SignLocally (backend)
    → SendTransaction
    → ConfirmTransaction
    → ReconcileBalances
    → PersistTradeResult
    → NotifyFrontend
```

## Módulos del Backend

### 1. Config Module (`src/config/index.js`)
- Valida todas las variables de entorno al inicio
- No permite arrancar con configuración inválida
- Singleton pattern
- Redacta información sensible en logs

### 2. Solana Connection Manager (`src/solana/connection.js`)
- Gestiona conexiones HTTP y WebSocket
- Health checks periódicos (cada 30s)
- Reconexión automática con backoff exponencial
- Fallback a RPC secundario
- Métricas de latencia y estado

### 3. Pump.fun Detector (`src/detectors/pumpfun.js`)
- Suscripción WebSocket al programa Pump.fun
- Detección on-chain de nuevos tokens
- Parsing de eventos
- Deduplicación por signature y mint
- Tracking de slots procesados
- Métricas de eventos recibidos/procesados/duplicados

### 4. Execution Engine (pendiente de implementación completa)
- Paper mode: simulación sin firma
- Live mode: firma y envío real
- Risk checks
- Slippage protection
- Kill switch

## Seguridad

### Claves Privadas
- ❌ NUNCA en localStorage del frontend
- ❌ NUNCA en logs
- ❌ NUNCA en respuestas HTTP
- ✅ Solo en backend via variable de entorno
- ✅ Solo en archivo .env (no versionado)
- ✅ Wallet dedicada con fondos limitados

### Modo de Trading
- ✅ Paper mode por defecto
- ✅ Live trading DESACTIVADO por defecto
- ✅ Requiere dos variables para activar:
  - `TRADING_MODE=live`
  - `ENABLE_LIVE_TRADING=true`
- ✅ Kill switch disponible

### Límites de Riesgo
- ✅ Límite diario de pérdida
- ✅ Límite por operación
- ✅ Slippage máximo
- ✅ Balance mínimo requerido
- ✅ Máximo de posiciones concurrentes

## Health Checks

El endpoint `/api/health` verifica independientemente:

1. **Configuración**: Variables de entorno válidas
2. **RPC HTTP**: Conexión a Solana RPC
3. **RPC WebSocket**: Conexión WebSocket (si está configurada)
4. **Pump.fun Detector**: Suscripción activa al programa
5. **Wallet**: Balance y disponibilidad (solo live mode)
6. **Último slot**: Slot procesado más reciente
7. **Último evento**: Timestamp del último evento recibido
8. **Latencia**: Latencia del RPC en ms

NO usa un único booleano `connected` para todo.

## Endpoints

### Principales
- `GET /api/health` - Health check básico
- `GET /api/health/detailed` - Health check detallado
- `GET /api/diagnose` - Diagnóstico completo
- `GET /api/stats` - Estadísticas y métricas
- `GET /api/config` - Configuración (safe, sin secretos)

### Auxiliares (Deprecated)
- `GET /api/pumpfun/tokens` - AUXILIAR (usa on-chain)
- `GET /api/raydium/pools` - AUXILIAR

## Variables de Entorno Críticas

```bash
# OBLIGATORIAS
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false

# OPCIONALES PERO RECOMENDADAS
SOLANA_WS_URL=wss://mainnet.helius-rpc.com/?api-key=...
SOLANA_RPC_FALLBACK_URL=https://api.mainnet-beta.solana.com
WALLET_PRIVATE_KEY=... (solo para live trading)
```

## Diferencias con la Arquitectura Anterior

### Antes (Problemas)
- ❌ Detección por polling HTTP a API web no oficial
- ❌ Claves privadas en localStorage
- ❌ Health checks falsos
- ❌ Sin detección on-chain real
- ❌ Sin WebSocket subscriptions
- ❌ Sin deduplicación de eventos
- ❌ Sin tracking de slots

### Ahora (Soluciones)
- ✅ Detección on-chain via WebSocket al programa Pump.fun
- ✅ Claves privadas solo en backend
- ✅ Health checks reales con verificación independiente
- ✅ Suscripción WebSocket en tiempo real
- ✅ Deduplicación por signature y mint
- ✅ Tracking de slots procesados
- ✅ Reconexión automática
- ✅ Fallback a RPC secundario

## Limitaciones Conocidas

1. **API de Pump.fun no oficial**: El endpoint `frontend-api-v2.pump.fun` es una API web interna, no documentada oficialmente. Puede cambiar sin aviso.

2. **Cobertura de eventos**: Dependemos del RPC WebSocket para recibir eventos. Si el RPC tiene limitaciones, podemos perder eventos.

3. **Parsing de logs**: El parser actual es básico. Para producción se necesita el IDL completo del programa Pump.fun.

4. **Yellowstone gRPC**: Para menor latencia y mayor cobertura, se recomienda migrar a Yellowstone gRPC/Geyser en el futuro.

5. **Ejecución real**: La ejecución real de trades (firma y envío) está pendiente de implementación completa.

## Próximos Pasos

1. Implementar Execution Engine completo con firma de transacciones
2. Agregar adaptadores para PumpSwap y Raydium
3. Implementar sistema de backfill para slots perdidos
4. Agregar Yellowstone gRPC integration
5. Implementar tests unitarios y de integración
6. Agregar sistema de notificaciones (Telegram/Discord)
7. Implementar base de datos para persistencia

## Documentación Adicional

- `SECURITY.md` - Guía de seguridad
- `TRADING_EXECUTION.md` - Documentación de ejecución de trades
- `CONNECTION_DIAGNOSTICS.md` - Diagnóstico de conexiones
- `TROUBLESHOOTING.md` - Solución de problemas
