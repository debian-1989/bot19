# 🔧 Solución: Error 403 en Solana RPC y FALLBACK en Pump.fun

## ❌ Problemas Identificados

1. **Solana RPC Error 403 (Forbidden)**: El endpoint público de Solana está bloqueando las peticiones
2. **Pump.fun en modo FALLBACK**: El backend no puede conectar con las APIs de Pump.fun

## ✅ Soluciones Implementadas

### 1. Sistema de Rotación de RPCs para Solana

He implementado un sistema que **rota automáticamente entre múltiples RPCs** cuando uno falla:

```javascript
const RPC_ENDPOINTS = [
  'https://rpc.ankr.com/solana',           // Principal (gratis, confiable)
  'https://solana-mainnet.g.alchemy.com/v2/demo',  // Backup 1
  'https://api.mainnet-beta.solana.com'    // Backup 2 (público)
];
```

**Cómo funciona:**
- Si un RPC da error 403, automáticamente cambia al siguiente
- Muestra en los logs qué RPC está usando
- Reintenta automáticamente con el nuevo RPC

### 2. RPC Recomendados (de mejor a peor)

#### 🥇 **Helius** (RECOMENDADO - Gratis)
```env
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=TU_API_KEY
```
- ✅ 100,000 requests/día gratis
- ✅ Muy rápido y confiable
- ✅ Sin errores 403
- 📝 Regístrate en: https://helius.dev

#### 🥈 **QuickNode** (Pago - Profesional)
```env
SOLANA_RPC_URL=https://TU_ENDPOINT.solana.quiknode.pro/TU_API_KEY/
```
- ✅ Extremadamente rápido
- ✅ Sin límites estrictos
- 💰 Desde $49/mes
- 📝 Regístrate en: https://quicknode.com

#### 🥉 **Ankr** (Gratis - Alternativo)
```env
SOLANA_RPC_URL=https://rpc.ankr.com/solana
```
- ✅ Gratis
- ✅ Confiable
- ⚠️ Límites moderados
- 📝 Más info: https://ankr.com

#### 🏅 **Alchemy** (Gratis - Bueno)
```env
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/TU_API_KEY
```
- ✅ 300M compute units/mes gratis
- ✅ Muy confiable
- 📝 Regístrate en: https://alchemy.com

#### ❌ **Público** (No recomendado)
```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```
- ❌ Frecuentes errores 403
- ❌ Rate limits estrictos
- ❌ Lento
- ⚠️ Solo para pruebas básicas

## 🚀 Pasos para Solucionar

### Paso 1: Configurar un RPC Alternativo

Edita el archivo `backend/.env`:

```bash
# Cambiar esta línea:
SOLANA_RPC_URL=https://rpc.ankr.com/solana

# Por una de estas opciones (recomendado Helius):
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=TU_API_KEY
```

### Paso 2: Obtener API Key de Helius (Gratis)

1. Ve a https://helius.dev
2. Regístrate con email o GitHub
3. Ve a "API Keys" en el dashboard
4. Copia tu API key
5. Úsala en el `.env`:
   ```env
   SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=COPIA_TU_KEY_AQUI
   ```

### Paso 3: Reiniciar el Backend

```bash
# Detener el backend (Ctrl+C)
# Luego reiniciar:
cd backend
npm start
```

### Paso 4: Verificar que Funciona

```bash
# Probar la conexión
curl http://localhost:3001/api/solana/version
```

Deberías ver:
```json
{
  "success": true,
  "data": {
    "solana-core": "1.18.26",
    "feature-set": 4215500110
  },
  "rpc": "https://rpc.ankr.com/solana",
  "timestamp": 1234567890
}
```

## 🔍 Diagnóstico del FALLBACK en Pump.fun

### Causas del FALLBACK

El modo FALLBACK se activa cuando:

1. **El backend no está corriendo**
   - Solución: `cd backend && npm start`

2. **Las APIs de Pump.fun están caídas**
   - Solución: Esperar o usar datos simulados

3. **Error de CORS en el backend**
   - Solución: Verificar que `app.use(cors())` esté en `server.js`

4. **Rate limit de Pump.fun**
   - Solución: Reducir frecuencia de peticiones

### Verificar el Estado del Backend

```bash
# Health check
curl http://localhost:3001/api/health

# Debería responder:
{
  "success": true,
  "status": "ok",
  "timestamp": 1234567890,
  "uptime": 10.5,
  "cache_size": 0
}
```

### Probar Pump.fun Directamente

```bash
# Probar endpoint de Pump.fun
curl http://localhost:3001/api/pumpfun/tokens?limit=5
```

Si responde con datos, el backend funciona correctamente.

## 📊 Logs para Diagnóstico

### Logs del Backend (terminal del backend)

Busca estos mensajes:

```
[Solana] Rotated to RPC: https://rpc.ankr.com/solana
[Solana] RPC blocked (403), rotating to next RPC...
[PumpFun] Fetching tokens... { limit: 200 }
[PumpFun] Tokens received: 200
```

### Logs del Frontend (consola del navegador F12)

Busca:

```
[PumpFun] Fetching tokens from backend... { isConnected: true }
[PumpFun] Tokens received: 200
[PumpFun] Connection restored!
```

## 🎯 Configuración Recomendada para Producción

### backend/.env (Configuración Óptima)

```env
# Puerto del servidor
PORT=3001

# RPC de Solana (Helius - Recomendado)
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=TU_API_KEY_AQUI

# Alternativas (descomenta la que prefieras):
# SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/TU_API_KEY
# SOLANA_RPC_URL=https://rpc.ankr.com/solana
```

## 🔧 Solución de Problemas

### Problema: "All RPCs failed"

**Causa**: Todos los RPCs configurados están fallando

**Solución**:
1. Verifica tu conexión a internet
2. Cambia a un RPC más confiable (Helius)
3. Reinicia el backend

### Problema: Pump.fun sigue en FALLBACK

**Causa**: El backend no puede conectar con Pump.fun

**Solución**:
1. Verifica que el backend esté corriendo
2. Prueba manualmente: `curl http://localhost:3001/api/pumpfun/tokens?limit=5`
3. Revisa los logs del backend
4. Si las APIs de Pump.fun están caídas, el FALLBACK es correcto (usa datos simulados)

### Problema: Error 403 persiste

**Causa**: El RPC público de Solana está bloqueando

**Solución**:
1. **OBLIGATORIO**: Cambiar a un RPC privado (Helius, QuickNode, Alchemy)
2. Editar `backend/.env`
3. Reiniciar el backend

## 📈 Comparación de RPCs

| RPC | Velocidad | Confiabilidad | Costo | 403 Errors | Recomendado |
|-----|-----------|---------------|-------|------------|-------------|
| **Helius** | ⚡⚡⚡ | ✅✅✅ | Gratis (100k/día) | ❌ No | ✅ SÍ |
| **QuickNode** | ⚡⚡⚡⚡ | ✅✅✅✅ | $49+/mes | ❌ No | ✅ SÍ (producción) |
| **Ankr** | ⚡⚡ | ✅✅ | Gratis | ❌ Raros | ✅ SÍ |
| **Alchemy** | ⚡⚡⚡ | ✅✅✅ | Gratis (300M/mes) | ❌ No | ✅ SÍ |
| **Público** | ⚡ | ✅ | Gratis | ✅ Frecuentes | ❌ NO |

## ✅ Checklist de Verificación

- [ ] Backend corriendo (`npm start` en carpeta `backend`)
- [ ] RPC configurado en `backend/.env` (recomendado: Helius)
- [ ] Backend responde en `http://localhost:3001/api/health`
- [ ] Solana RPC funciona: `curl http://localhost:3001/api/solana/version`
- [ ] Pump.fun funciona: `curl http://localhost:3001/api/pumpfun/tokens?limit=5`
- [ ] Frontend conectado: Panel de conexiones muestra verde
- [ ] No hay errores 403 en los logs

## 🎓 Próximos Pasos

1. **Obtener API Key de Helius** (gratis): https://helius.dev
2. **Configurar en `backend/.env`**
3. **Reiniciar el backend**
4. **Verificar que todo funciona**
5. **Iniciar el bot y monitorear**

## 📞 Recursos Adicionales

- **Helius Docs**: https://docs.helius.dev
- **QuickNode Docs**: https://www.quicknode.com/docs/solana
- **Solana RPC Docs**: https://docs.solana.com/api/http
- **Pump.fun API**: https://frontend-api-v2.pump.fun

---

**Resumen**: El error 403 se soluciona usando un RPC privado como Helius (gratis). El FALLBACK en Pump.fun es normal si las APIs están caídas, pero si el backend funciona correctamente, debería obtener datos reales.
