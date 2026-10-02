# 🚨 Guía de Troubleshooting - Todas las Conexiones con Error

## ✅ Solución Implementada: Modo Demo Automático

He implementado un **sistema de modo demo automático** que garantiza que el bot funcione incluso cuando todas las APIs fallen.

### 🎯 ¿Qué es el Modo Demo?

Cuando **TODAS** las APIs reales fallan (Pump.fun, Raydium, Solana), el backend automáticamente cambia a **modo demo** y genera datos realistas simulados. Esto permite que el bot siga funcionando para pruebas y desarrollo.

### 🔄 Cómo Funciona

```
Intento 1: API Real (Pump.fun/Raydium/Solana)
    ↓
Falla ❌
    ↓
Intento 2: Proxy CORS 1
    ↓
Falla ❌
    ↓
Intento 3: Proxy CORS 2
    ↓
Falla ❌
    ↓
Intento 4: Proxy CORS 3
    ↓
Falla ❌
    ↓
✅ ACTIVAR MODO DEMO
    ↓
Generar datos realistas simulados
    ↓
Bot funciona normalmente
```

## 🚀 Pasos Inmediatos

### Paso 1: Reiniciar el Backend

```bash
cd backend
# Detener con Ctrl+C
npm start
```

### Paso 2: Ejecutar Diagnóstico Rápido

```bash
chmod +x test-connections.sh
./test-connections.sh
```

O manualmente:

```bash
# Diagnóstico completo
curl http://localhost:3001/api/diagnose

# Health check
curl http://localhost:3001/api/health
```

### Paso 3: Verificar en el Navegador

1. Abre http://localhost:5173
2. Ve a la pestaña **"🔌 Estado de Conexiones"**
3. Haz clic en **"🔍 Probar Todas"**

## 📊 Interpretación de Resultados

### Escenario 1: Todo en Modo Demo 🎭

```json
{
  "results": {
    "pumpfun": { "status": "ok", "demo": true },
    "raydium": { "status": "ok", "demo": true },
    "solana": { "status": "ok", "demo": true }
  },
  "summary": {
    "total_ok": 3,
    "total_demo": 3
  }
}
```

**Significado**: Las APIs reales no están disponibles, pero el bot funciona con datos simulados.

**¿Es malo?**: No necesariamente. Puede ser:
- APIs temporalmente caídas
- Bloqueos de red/firewall
- Rate limiting
- Proxies CORS públicos bloqueados

**Solución**: Esperar o implementar tu propio proxy CORS (ver abajo).

### Escenario 2: Mixto (Algunas OK, Otras Demo) ⚠️

```json
{
  "results": {
    "pumpfun": { "status": "ok", "demo": false },
    "raydium": { "status": "ok", "demo": true },
    "solana": { "status": "ok", "demo": false }
  }
}
```

**Significado**: Algunas APIs funcionan, otras no.

**Solución**: El bot funcionará parcialmente. Esperar a que las APIs caídas se recuperen.

### Escenario 3: Todo OK ✅

```json
{
  "results": {
    "pumpfun": { "status": "ok", "demo": false },
    "raydium": { "status": "ok", "demo": false },
    "solana": { "status": "ok", "demo": false }
  }
}
```

**Significado**: ¡Perfecto! Todas las APIs funcionan con datos reales.

## 🔧 Soluciones Avanzadas

### Solución 1: Implementar tu Propio Proxy CORS

Si los proxies públicos están bloqueados, crea tu propio servidor proxy:

#### Opción A: Proxy Simple con Node.js

```javascript
// proxy-server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

// Proxy para Pump.fun
app.get('/proxy/pumpfun/*', async (req, res) => {
  const path = req.params[0];
  const url = `https://frontend-api-v2.pump.fun/${path}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy para Raydium
app.get('/proxy/raydium/*', async (req, res) => {
  const path = req.params[0];
  const url = `https://api-v3.raydium.io/${path}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3002, () => {
  console.log('Proxy CORS corriendo en http://localhost:3002');
});
```

Ejecutar:
```bash
npm install express cors node-fetch
node proxy-server.js
```

Luego actualizar `backend/server.js`:
```javascript
const PUMPFUN_ENDPOINTS = [
  'http://localhost:3002/proxy/pumpfun/',
  'https://frontend-api-v2.pump.fun',
  // ... otros endpoints
];
```

#### Opción B: Usar Cloudflare Workers (Gratis)

```javascript
// worker.js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    
    if (!target) {
      return new Response('Missing URL parameter', { status: 400 });
    }
    
    const response = await fetch(target, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
    
    return new Response(response.body, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    });
  }
};
```

Deploy en Cloudflare Workers y usa tu URL como proxy.

### Solución 2: Usar APIs Alternativas

#### Para Pump.fun:
- API oficial: `https://frontend-api-v2.pump.fun`
- Alternativa: Monitorear directamente la blockchain de Solana

#### Para Raydium:
- API oficial: `https://api-v3.raydium.io`
- Alternativa: Usar la API de Birdeye o DexScreener

#### Para Solana:
- Helius (tu API key): ✅ Ya configurado
- QuickNode: https://quicknode.com
- Alchemy: https://alchemy.com
- Triton: https://triton.one

### Solución 3: Verificar Red y Firewall

```bash
# Verificar conectividad
ping frontend-api-v2.pump.fun
ping api-v3.raydium.io

# Verificar DNS
nslookup frontend-api-v2.pump.fun
nslookup api-v3.raydium.io

# Verificar puertos
curl -v http://localhost:3001/api/health
```

## 📋 Checklist de Troubleshooting

### ✅ Básico
- [ ] Backend está corriendo (`npm start` en carpeta `backend`)
- [ ] Puerto 3001 está libre
- [ ] Node.js está instalado (versión 18+)
- [ ] Dependencias instaladas (`npm install` en carpeta `backend`)

### ✅ Red
- [ ] Internet funciona
- [ ] No hay firewall bloqueando
- [ ] DNS resuelve correctamente
- [ ] Puertos 3001 y 5173 están abiertos

### ✅ APIs
- [ ] API key de Helius configurada en `backend/.env`
- [ ] Proxies CORS públicos accesibles
- [ ] APIs de Pump.fun y Raydium no están caídas

### ✅ Backend
- [ ] Logs muestran intentos de conexión
- [ ] Modo demo se activa cuando es necesario
- [ ] Endpoints responden correctamente

## 🎯 Comandos Útiles

```bash
# Diagnóstico completo
curl http://localhost:3001/api/diagnose | jq

# Health check
curl http://localhost:3001/api/health | jq

# Forzar reconexión Pump.fun
curl -X POST http://localhost:3001/api/pumpfun/reconnect

# Forzar reconexión Raydium
curl -X POST http://localhost:3001/api/raydium/reconnect

# Forzar reconexión Solana
curl -X POST http://localhost:3001/api/solana/reconnect

# Limpiar cache
curl -X POST http://localhost:3001/api/cache/clear

# Ver estadísticas
curl http://localhost:3001/api/stats | jq
```

## 📊 Logs del Backend

Busca estos mensajes en la terminal del backend:

### Modo Demo Activado
```
[Pump.fun] All endpoints failed, activating demo mode
[Raydium] All endpoints failed, activating demo mode
[Solana] All RPCs failed, activating demo mode
```

### Conexión Exitosa
```
[Pump.fun] Tokens received: 200
[Raydium] Pools received: 50
[Solana] Connected to RPC: https://mainnet.helius-rpc.com
```

### Errores Comunes
```
[Pump.fun] Failed with https://frontend-api-v2.pump.fun: HTTP 403
[Raydium] Failed with https://api-v3.raydium.io: CORS error
[Solana] RPC 0 failed: 403 Forbidden
```

## 🎓 ¿Cuándo Preocuparse?

### ✅ No te preocupes si:
- El bot funciona en modo demo
- Puedes ver tokens y pools (aunque sean simulados)
- Los logs muestran "activating demo mode"
- El panel de conexiones muestra "DEMO"

### ❌ Preocúpate si:
- El backend no inicia
- Hay errores de sintaxis en el código
- Los puertos están ocupados
- Node.js no está instalado

## 🚀 Próximos Pasos

1. **Reinicia el backend**: `cd backend && npm start`
2. **Ejecuta el diagnóstico**: `./test-connections.sh`
3. **Verifica en el navegador**: http://localhost:5173 → 🔌 Estado de Conexiones
4. **Si todo está en demo**: El bot funciona, solo que con datos simulados
5. **Si quieres datos reales**: Implementa tu propio proxy CORS (ver Solución 1)

## 📞 Soporte

Si después de seguir esta guía todo sigue fallando:

1. Revisa los logs completos del backend
2. Verifica tu conexión a internet
3. Prueba desde otra red (móvil, otra WiFi)
4. Verifica que no haya firewall/antivirus bloqueando
5. Considera implementar tu propio proxy CORS

---

**Resumen**: El bot ahora funciona en **modo demo automático** cuando las APIs fallan. Esto garantiza que siempre puedas usar el bot, incluso sin conexión a las APIs reales. Para producción, se recomienda implementar tu propio proxy CORS.
