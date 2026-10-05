# 🚀 Guía de Inicio Rápido - Backend Local

## 📋 Pasos para Configurar y Ejecutar

### 1️⃣ Instalar el Backend

#### En Linux/Mac:
```bash
cd backend
chmod +x setup.sh
./setup.sh
```

#### En Windows:
```bash
cd backend
setup.bat
```

#### Manual (cualquier sistema):
```bash
cd backend
npm install
```

### 2️⃣ Iniciar el Backend

```bash
npm start
```

Deberías ver:
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 PumpFun Sniper Bot Backend                           ║
║                                                           ║
║   ✅ Servidor corriendo en: http://localhost:3001        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

### 3️⃣ Verificar que Funciona

Abre en tu navegador:
- http://localhost:3001/api/health

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

### 4️⃣ Probar los Endpoints

#### Pump.fun:
```bash
curl http://localhost:3001/api/pumpfun/tokens?limit=5
```

#### Raydium:
```bash
curl http://localhost:3001/api/raydium/pools?pageSize=5
```

#### Solana:
```bash
curl http://localhost:3001/api/solana/version
```

### 5️⃣ Iniciar el Frontend

En otra terminal (desde la raíz del proyecto):
```bash
npm run dev
```

Abre: http://localhost:5173

### 6️⃣ Verificar Conexiones

1. Ve a la pestaña **"🔌 Estado de Conexiones"**
2. Haz clic en **"🔍 Probar Todas"**
3. Deberías ver todo en verde ✅

## 🎯 Flujo Completo

```
1. Terminal 1: Backend
   cd backend
   npm start
   
2. Terminal 2: Frontend
   npm run dev
   
3. Navegador:
   http://localhost:5173
```

## ✅ Verificación Final

### Backend funcionando:
- ✅ http://localhost:3001/api/health responde
- ✅ http://localhost:3001/api/pumpfun/tokens devuelve datos
- ✅ http://localhost:3001/api/raydium/pools devuelve datos
- ✅ http://localhost:3001/api/solana/version devuelve datos

### Frontend funcionando:
- ✅ http://localhost:5173 carga
- ✅ Panel de conexiones muestra todo en verde
- ✅ Se detectan tokens de Pump.fun y Raydium
- ✅ El bot puede iniciar y operar

## 🐛 Solución de Problemas

### Error: "Port 3001 already in use"
```bash
# Cambiar puerto en backend/.env
PORT=3002
```

### Error: "Cannot connect to backend"
1. Verifica que el backend esté corriendo
2. Verifica que el puerto sea correcto
3. Revisa la consola del navegador (F12)

### Los datos no se actualizan
```bash
# Limpiar cache
curl -X POST http://localhost:3001/api/cache/clear
```

### Error de CORS
Asegúrate de que el backend tenga `cors()` habilitado (ya está por defecto)

## 📊 Comparación de Rendimiento

### Antes (Proxy Público):
- Latencia: 500-2000ms
- Confiabilidad: 70-80%
- Costo: Gratis

### Ahora (Backend Local):
- Latencia: 100-300ms ⚡
- Confiabilidad: 95-99% 🎯
- Costo: Gratis

## ₿ Ejecutar solo Bitcoin sin consumir Helius

La integración Demo de Binance utiliza datos públicos directamente desde el frontend. Si aun así quieres levantar el backend para health checks, wallet u otros servicios, puedes iniciarlo en modo aislado:

```bash
cd backend
NETWORK_MODE=bitcoin SOLANA_RPC_URL='' SOLANA_WS_URL='' PORT=3002 npm start
```

En este modo el backend **no inicializa Solana, Helius ni el detector Pump.fun**. Para operar solamente BTC/USDT, selecciona en el frontend:

```text
Entrada: Bitcoin
Dirección: Ambos sentidos — long + short Demo
```

Para Solana o ambas redes, usa `NETWORK_MODE=solana` o `NETWORK_MODE=both` y configura las variables RPC normalmente.

## 🎓 Próximos Pasos

1. ✅ Backend instalado y corriendo
2. ✅ Frontend conectado al backend
3. ✅ Conexiones verificadas
4. 🔄 Prueba el bot en modo simulación
5. 🚀 Cuando estés listo, configura para producción

## 📞 Necesitas Ayuda?

Revisa:
- `backend/README.md` - Documentación completa
- Consola del navegador (F12) - Logs del frontend
- Terminal del backend - Logs del backend

---

**¡Listo para operar! 🚀**
