# 🔧 Solución de Problemas de Conexión

## ❌ Problema: Las conexiones se caen después de 1-2 segundos

### ✅ Solución Implementada

He agregado un **sistema de reconexión automática** con las siguientes características:

1. **Retry con Backoff Exponencial**: Si falla una conexión, reintenta automáticamente
   - Primer intento: 1 segundo
   - Segundo intento: 2 segundos
   - Tercer intento: 4 segundos
   - Cuarto intento: 8 segundos
   - Quinto intento: 16 segundos
   - Máximo: 30 segundos

2. **Máximo 5 reintentos** antes de caer en fallback

3. **Timeout de 10 segundos** para cada request

4. **Contador de errores consecutivos** para monitoreo

5. **Botón de reconexión manual** en el panel de conexiones

## 🎯 Cómo Verificar que Funciona

### 1. Abrir el Panel de Conexiones

Ve a la pestaña **"🔌 Estado de Conexiones"**

### 2. Observar los Logs

Abre la consola del navegador (F12) y busca:

```
[PumpFun] Fetching tokens from backend... {
  limit: 200,
  fetchUrl: "http://localhost:3001/api/pumpfun/tokens?limit=200&offset=0",
  retryCount: 0,
  isConnected: false
}

[PumpFun] Error fetching tokens (attempt 1): Failed to fetch
[PumpFun] Retrying in 1000ms... (attempt 1/5)

[PumpFun] Error fetching tokens (attempt 2): Failed to fetch
[PumpFun] Retrying in 2000ms... (attempt 2/5)

[PumpFun] Error fetching tokens (attempt 3): Failed to fetch
[PumpFun] Retrying in 4000ms... (attempt 3/5)
```

### 3. Verificar el Backend

Asegúrate de que el backend esté corriendo:

```bash
cd backend
npm start
```

Deberías ver:
```
╔═══════════════════════════════════════════════════════════╗
║   🚀 PumpFun Sniper Bot Backend                           ║
║   ✅ Servidor corriendo en: http://localhost:3001        ║
╚═══════════════════════════════════════════════════════════╝
```

### 4. Probar el Backend Manualmente

```bash
curl http://localhost:3001/api/health
```

Deberías ver:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": 1234567890,
  "uptime": 10.5,
  "cache_size": 0
}
```

## 🔍 Diagnóstico Paso a Paso

### Paso 1: Verificar que el Backend Está Corriendo

```bash
# En la carpeta backend
npm start
```

Si ves errores, revisa:
- ¿El puerto 3001 está ocupado?
- ¿Las dependencias están instaladas? (`npm install`)
- ¿Hay errores en el código?

### Paso 2: Verificar que el Frontend Apunta al Backend Correcto

En `src/services/pumpfun-real.ts`:
```typescript
private baseUrl = 'http://localhost:3001/api/pumpfun';
```

En `src/services/raydium.ts`:
```typescript
private baseUrl = 'http://localhost:3001/api/raydium';
```

### Paso 3: Verificar CORS

El backend debe tener CORS habilitado. En `backend/server.js`:
```javascript
app.use(cors()); // Esto debe estar presente
```

### Paso 4: Forzar Reconexión Manual

En el panel de conexiones, haz clic en el botón **"Reconectar"** para forzar una reconexión manual.

### Paso 5: Limpiar Cache del Backend

```bash
curl -X POST http://localhost:3001/api/cache/clear
```

## 📊 Información Nueva en el Panel

Ahora el panel muestra:

- ✅ **Estado de conexión real** (isConnected)
- ⚠️ **Errores consecutivos** (consecutiveErrors)
- ❌ **Último error** (lastError)
- 🔄 **Botón de reconexión manual**

## 🎯 Escenarios Comunes

### Escenario 1: Backend No Está Corriendo

**Síntomas:**
```
[PumpFun] Error fetching tokens (attempt 1): Failed to fetch
[PumpFun] Retrying in 1000ms... (attempt 1/5)
```

**Solución:**
```bash
cd backend
npm install
npm start
```

### Escenario 2: Puerto Ocupado

**Síntomas:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solución:**
```bash
# Cambiar puerto en backend/.env
PORT=3002
```

Luego actualizar el frontend:
```typescript
// En src/services/pumpfun-real.ts
private baseUrl = 'http://localhost:3002/api/pumpfun';

// En src/services/raydium.ts
private baseUrl = 'http://localhost:3002/api/raydium';
```

### Escenario 3: CORS Error

**Síntomas:**
```
Access to fetch at 'http://localhost:3001/api/pumpfun/tokens' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solución:**
Verificar que `backend/server.js` tenga:
```javascript
app.use(cors());
```

### Escenario 4: Backend Responde pero APIs Externas Fallan

**Síntomas:**
```
[Backend] Error fetching Pump.fun tokens: fetch failed
```

**Solución:**
- Verificar conexión a internet
- Las APIs de Pump.fun y Raydium pueden estar caídas temporalmente
- El backend usará cache si está disponible

## 🔄 Flujo de Reconexión Automática

```
1. Intento 1: Falla
   ↓
2. Espera 1 segundo
   ↓
3. Intento 2: Falla
   ↓
4. Espera 2 segundos
   ↓
5. Intento 3: Falla
   ↓
6. Espera 4 segundos
   ↓
7. Intento 4: Falla
   ↓
8. Espera 8 segundos
   ↓
9. Intento 5: Falla
   ↓
10. Espera 16 segundos
    ↓
11. Máximo de reintentos alcanzado
    ↓
12. Activar modo fallback (tokens simulados)
```

## 🎮 Comandos Útiles

```bash
# Verificar que el backend está corriendo
curl http://localhost:3001/api/health

# Limpiar cache del backend
curl -X POST http://localhost:3001/api/cache/clear

# Ver estadísticas del backend
curl http://localhost:3001/api/stats

# Probar endpoint de Pump.fun
curl http://localhost:3001/api/pumpfun/tokens?limit=5

# Probar endpoint de Raydium
curl http://localhost:3001/api/raydium/pools?pageSize=5

# Probar endpoint de Solana
curl http://localhost:3001/api/solana/version
```

## 📞 Si Nada Funciona

1. **Reinicia todo:**
   ```bash
   # Detener backend
   # Ctrl+C en la terminal del backend
   
   # Reiniciar backend
   cd backend
   npm start
   
   # Reiniciar frontend
   npm run dev
   ```

2. **Limpia todo:**
   ```bash
   # Limpiar frontend
   rm -rf node_modules
   npm install
   
   # Limpiar backend
   cd backend
   rm -rf node_modules
   npm install
   ```

3. **Verifica los logs:**
   - Consola del navegador (F12)
   - Terminal del backend
   - Terminal del frontend

4. **Usa el botón de reconexión:**
   - Ve a "🔌 Estado de Conexiones"
   - Haz clic en "Reconectar" para cada servicio

## ✅ Verificación Final

Después de aplicar las correcciones, deberías ver:

1. ✅ El backend corriendo sin errores
2. ✅ El frontend conectándose al backend
3. ✅ Reconexiones automáticas cuando hay errores
4. ✅ Contador de errores consecutivos en el panel
5. ✅ Botón de reconexión manual funcionando
6. ✅ Logs detallados en la consola

---

**El sistema ahora es mucho más robusto y debería manejar las caídas de conexión de forma automática.**
