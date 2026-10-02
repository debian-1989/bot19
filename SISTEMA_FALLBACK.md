# 🔧 Sistema de Fallback Multi-Endpoint

## ✅ Problemas Solucionados

Se ha implementado un **sistema robusto de fallback con múltiples endpoints** para Pump.fun y Raydium, solucionando los problemas de CORS y bloqueos.

## 🎯 Cómo Funciona

### Sistema de Rotación Automática

Cuando una API falla, el backend **automáticamente** prueba con el siguiente endpoint:

```
Petición a Pump.fun/Raydium
    ↓
Endpoint 1 (Directo) → ¿Funciona? → ✅ OK
    ↓ (No - CORS/Error)
Endpoint 2 (AllOrigins Proxy) → ¿Funciona? → ✅ OK
    ↓ (No)
Endpoint 3 (CorsProxy.io) → ¿Funciona? → ✅ OK
    ↓ (No)
Endpoint 4 (CodeTabs Proxy) → ¿Funciona? → ✅ OK
    ↓ (No)
❌ Error: "All endpoints failed"
```

## 📊 Endpoints Configurados

### Pump.fun (4 endpoints)
1. `https://frontend-api-v2.pump.fun` - Directo (puede tener CORS)
2. `https://api.allorigins.win/raw?url=` - Proxy CORS
3. `https://corsproxy.io/?` - Proxy CORS alternativo
4. `https://api.codetabs.com/v1/proxy?quest=` - Proxy CORS backup

### Raydium (4 endpoints)
1. `https://api-v3.raydium.io` - Directo (puede tener CORS)
2. `https://api.allorigins.win/raw?url=` - Proxy CORS
3. `https://corsproxy.io/?` - Proxy CORS alternativo
4. `https://api.codetabs.com/v1/proxy?quest=` - Proxy CORS backup

### Solana RPC (3 RPCs)
1. `https://mainnet.helius-rpc.com/?api-key=...` - Helius (tu API key)
2. `https://solana-mainnet.g.alchemy.com/v2/demo` - Alchemy demo
3. `https://rpc.ankr.com/solana` - Ankr

## 🚀 Nuevos Endpoints de Diagnóstico

### 1. Diagnóstico Completo
```bash
curl http://localhost:3001/api/diagnose
```

Respuesta:
```json
{
  "success": true,
  "results": {
    "pumpfun": {
      "status": "ok",
      "endpoint": "https://api.allorigins.win/raw?url="
    },
    "raydium": {
      "status": "ok",
      "endpoint": "https://corsproxy.io/?"
    },
    "solana": {
      "status": "ok",
      "rpc": "https://mainnet.helius-rpc.com/?api-key=..."
    }
  }
}
```

### 2. Forzar Reconexión de Pump.fun
```bash
curl -X POST http://localhost:3001/api/pumpfun/reconnect
```

### 3. Forzar Reconexión de Raydium
```bash
curl -X POST http://localhost:3001/api/raydium/reconnect
```

### 4. Forzar Reconexión de Solana
```bash
curl -X POST http://localhost:3001/api/solana/reconnect
```

### 5. Health Check Mejorado
```bash
curl http://localhost:3001/api/health
```

Respuesta:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": 1234567890,
  "uptime": 3600.5,
  "cache_size": 42,
  "connections": {
    "pumpfun": {
      "current_endpoint": "https://api.allorigins.win/raw?url=",
      "last_success": 1234567880,
      "available_endpoints": 4
    },
    "raydium": {
      "current_endpoint": "https://corsproxy.io/?",
      "last_success": 1234567875,
      "available_endpoints": 4
    },
    "solana": {
      "current_rpc": "https://mainnet.helius-rpc.com/?api-key=...",
      "available_rpcs": 3
    }
  }
}
```

## 🔍 Logs del Backend

Ahora verás logs detallados como:

```
[Pump.fun] Attempt 1/4 with: https://frontend-api-v2.pump.fun
[Pump.fun] Failed with https://frontend-api-v2.pump.fun: HTTP 403
[Pump.fun] Attempt 2/4 with: https://api.allorigins.win/raw?url=
[Pump.fun] Tokens received: 200

[Raydium] Attempt 1/4 with: https://api-v3.raydium.io
[Raydium] Failed with https://api-v3.raydium.io: CORS error
[Raydium] Attempt 2/4 with: https://api.allorigins.win/raw?url=
[Raydium] Pools received: 50

[Solana] Rotated to RPC: https://rpc.ankr.com/solana
```

## 🎯 Pasos para Verificar que Todo Funciona

### Paso 1: Reiniciar el Backend
```bash
cd backend
# Detener con Ctrl+C
npm start
```

### Paso 2: Ejecutar Diagnóstico Completo
```bash
curl http://localhost:3001/api/diagnose
```

Deberías ver `"status": "ok"` para las 3 conexiones.

### Paso 3: Probar Pump.fun
```bash
curl http://localhost:3001/api/pumpfun/tokens?limit=5
```

Deberías recibir datos de tokens.

### Paso 4: Probar Raydium
```bash
curl http://localhost:3001/api/raydium/pools?pageSize=5
```

Deberías recibir datos de pools.

### Paso 5: Probar Solana
```bash
curl http://localhost:3001/api/solana/version
```

Deberías recibir la versión de Solana.

### Paso 6: Abrir el Bot
Abre http://localhost:5173 y ve a la pestaña **"🔌 Estado de Conexiones"**.

Deberías ver todo en verde ✅.

## 🔄 Si Algo Sigue Fallando

### Opción 1: Forzar Reconexión
```bash
# Forzar reconexión de Pump.fun
curl -X POST http://localhost:3001/api/pumpfun/reconnect

# Forzar reconexión de Raydium
curl -X POST http://localhost:3001/api/raydium/reconnect

# Forzar reconexión de Solana
curl -X POST http://localhost:3001/api/solana/reconnect
```

### Opción 2: Limpiar Cache
```bash
curl -X POST http://localhost:3001/api/cache/clear
```

### Opción 3: Reiniciar Todo
```bash
# Detener backend (Ctrl+C)
cd backend
npm start

# En otra terminal, reiniciar frontend
npm run dev
```

### Opción 4: Ver Logs Detallados
Abre la consola del navegador (F12) y la terminal del backend para ver los logs de intento de conexión.

## 📊 Estadísticas en Tiempo Real

```bash
curl http://localhost:3001/api/stats
```

Muestra:
- Tamaño del cache
- Uptime del servidor
- Uso de memoria
- Estado actual de todas las conexiones
- Último éxito de cada servicio

## 🎓 Cómo Funciona el Sistema de Fallback

### Para Pump.fun y Raydium:

1. **Intento 1**: Endpoint directo (más rápido)
   - Si funciona → ✅ OK, se queda con este endpoint
   - Si falla → Pasa al siguiente

2. **Intento 2**: Proxy AllOrigins
   - Si funciona → ✅ OK, se queda con este endpoint
   - Si falla → Pasa al siguiente

3. **Intento 3**: Proxy CorsProxy.io
   - Si funciona → ✅ OK, se queda con este endpoint
   - Si falla → Pasa al siguiente

4. **Intento 4**: Proxy CodeTabs
   - Si funciona → ✅ OK, se queda con este endpoint
   - Si falla → ❌ Error: "All endpoints failed"

### Para Solana RPC:

1. **Intento 1**: Helius (tu API key)
   - Si funciona → ✅ OK
   - Si falla (403) → Rota al siguiente RPC

2. **Intento 2**: Alchemy demo
   - Si funciona → ✅ OK
   - Si falla → Rota al siguiente RPC

3. **Intento 3**: Ankr
   - Si funciona → ✅ OK
   - Si falla → ❌ Error

## 🔧 Configuración Avanzada

### Agregar Más Endpoints

Edita `backend/server.js` y agrega más endpoints a los arrays:

```javascript
const PUMPFUN_ENDPOINTS = [
  'https://frontend-api-v2.pump.fun',
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
  // Agrega más aquí:
  'https://tu-proxy-personal.com/proxy?url='
];
```

### Cambiar el Orden de Preferencia

El sistema prueba los endpoints en orden. Si quieres que uno específico sea el primero, muévelo al inicio del array.

### Timeout Personalizado

En las funciones `fetchWithFallback` y `fetchRaydiumWithFallback`, puedes cambiar el timeout:

```javascript
const response = await fetch(fetchUrl, {
  ...options,
  timeout: 15000, // 15 segundos en lugar de 10
  // ...
});
```

## 📈 Ventajas del Sistema

✅ **Alta Disponibilidad**: Si un endpoint falla, automáticamente usa otro
✅ **Transparencia**: Logs detallados de cada intento
✅ **Flexibilidad**: Fácil agregar más endpoints
✅ **Robustez**: Manejo automático de errores CORS
✅ **Diagnóstico**: Endpoints específicos para verificar el estado
✅ **Reconexión Manual**: Botones para forzar reconexión

## 🎯 Resumen

El backend ahora tiene:
- ✅ **4 endpoints para Pump.fun** con rotación automática
- ✅ **4 endpoints para Raydium** con rotación automática
- ✅ **3 RPCs para Solana** con rotación automática
- ✅ **Sistema de diagnóstico completo** (`/api/diagnose`)
- ✅ **Endpoints de reconexión manual** (`/api/*/reconnect`)
- ✅ **Logs detallados** de cada intento
- ✅ **Cache inteligente** para reducir llamadas a APIs

**Reinicia el backend y todo debería funcionar perfectamente.** 🚀
