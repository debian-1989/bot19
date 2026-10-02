# 🚀 PumpFun Sniper Bot - Backend Local

Backend completo para el PumpFun Sniper Bot que corre localmente con Node.js y Express.

## ✨ Características

- ✅ **Velocidad**: 100-300ms por request (vs 500-2000ms con proxy público)
- ✅ **Confiabilidad**: 95-99% de uptime
- ✅ **Cache**: Sistema de cache integrado para reducir llamadas a APIs
- ✅ **Endpoints completos**: Pump.fun, Raydium y Solana RPC
- ✅ **Fácil de usar**: Solo 3 comandos para iniciar

## 📋 Requisitos

- Node.js 18 o superior
- npm o yarn
- Conexión a internet

## 🚀 Instalación Rápida

```bash
# 1. Ir a la carpeta del backend
cd backend

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor
npm start
```

¡Eso es todo! El backend estará corriendo en `http://localhost:3001`

## 📡 Endpoints Disponibles

### Pump.fun
- `GET /api/pumpfun/tokens` - Obtener tokens recientes
- `GET /api/pumpfun/token/:mint` - Información de un token
- `GET /api/pumpfun/token/:mint/trades` - Trades de un token

### Raydium
- `GET /api/raydium/pools` - Obtener pools
- `GET /api/raydium/pool/:id` - Información de un pool

### Solana RPC
- `GET /api/solana/version` - Versión de Solana
- `GET /api/solana/balance/:address` - Balance de una cuenta
- `GET /api/solana/token/:mint` - Información de un token SPL

### Utilidad
- `GET /api/health` - Health check
- `GET /api/stats` - Estadísticas del servidor
- `POST /api/cache/clear` - Limpiar cache

## 🧪 Probar Endpoints

### Con cURL:

```bash
# Health check
curl http://localhost:3001/api/health

# Obtener tokens de Pump.fun
curl http://localhost:3001/api/pumpfun/tokens?limit=10

# Obtener pools de Raydium
curl http://localhost:3001/api/raydium/pools?pageSize=10

# Obtener versión de Solana
curl http://localhost:3001/api/solana/version
```

### Con el navegador:

Simplemente abre estas URLs en tu navegador:
- http://localhost:3001/api/health
- http://localhost:3001/api/pumpfun/tokens?limit=5
- http://localhost:3001/api/raydium/pools?pageSize=5
- http://localhost:3001/api/solana/version

## ⚙️ Configuración

Edita el archivo `.env` para personalizar:

```env
# Puerto del servidor (default: 3001)
PORT=3001

# URL del RPC de Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### RPCs Recomendados:

**Públicos (gratis pero limitados):**
```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Helius (recomendado, gratis hasta 100k credits/día):**
```env
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=TU_API_KEY
```

**QuickNode (pago, muy rápido):**
```env
SOLANA_RPC_URL=https://TU_ENDPOINT.solana.quiknode.pro/TU_API_KEY/
```

## 🔧 Modo Desarrollo

Para desarrollo con hot-reload:

```bash
npm run dev
```

Esto usa `nodemon` para reiniciar automáticamente cuando cambies el código.

## 📊 Estadísticas

Ver estadísticas del servidor:

```bash
curl http://localhost:3001/api/stats
```

Respuesta:
```json
{
  "success": true,
  "stats": {
    "cache_size": 42,
    "uptime": 3600.5,
    "memory_usage": {
      "rss": 52428800,
      "heapTotal": 31457280,
      "heapUsed": 25165824,
      "external": 1048576
    },
    "node_version": "v18.17.0"
  }
}
```

## 🧹 Limpiar Cache

```bash
curl -X POST http://localhost:3001/api/cache/clear
```

## 🔄 Integración con el Frontend

El frontend ya está configurado para usar este backend. Solo asegúrate de que el backend esté corriendo antes de iniciar el frontend.

### Flujo de datos:

```
┌─────────────┐    HTTP     ┌──────────────┐    HTTP     ┌─────────────┐
│   Frontend  │ ──────────> │   Backend    │ ──────────> │  APIs       │
│  (React)    │ <────────── │  (Express)   │ <────────── │  (Pump/Ray) │
│  Port 5173  │   JSON      │  Port 3001   │   JSON      │             │
└─────────────┘             └──────────────┘             └─────────────┘
```

## 🐛 Troubleshooting

### Error: "Cannot find module"
```bash
npm install
```

### Error: "Port 3001 already in use"
Cambia el puerto en `.env`:
```env
PORT=3002
```

### Error: "ECONNREFUSED"
Asegúrate de que el backend esté corriendo:
```bash
npm start
```

### Los datos no se actualizan
Limpia el cache:
```bash
curl -X POST http://localhost:3001/api/cache/clear
```

## 📈 Rendimiento

### Con Backend Local (este):
- **Latencia**: 100-300ms
- **Confiabilidad**: 95-99%
- **Cache**: Sí (2 segundos)
- **Rate limits**: Depende del RPC

### Con Proxy Público (anterior):
- **Latencia**: 500-2000ms
- **Confiabilidad**: 70-80%
- **Cache**: No
- **Rate limits**: Estrictos

## 🔐 Seguridad

⚠️ **Importante**: Este backend es para uso local. Para producción:

1. Agrega autenticación (API keys, JWT)
2. Implementa rate limiting
3. Usa HTTPS
4. Valida todas las entradas
5. Agrega logs de auditoría
6. Usa variables de entorno para secrets

## 📝 Logs

El servidor muestra logs detallados en la consola:

```
[PumpFun] Fetching tokens... { limit: 200, fetchUrl: '...' }
[PumpFun] Response status: 200
[PumpFun] Tokens received: 200
```

## 🎯 Próximos Pasos

1. ✅ Instalar dependencias: `npm install`
2. ✅ Iniciar el backend: `npm start`
3. ✅ Verificar que funciona: `curl http://localhost:3001/api/health`
4. ✅ Iniciar el frontend: `npm run dev` (en la carpeta principal)
5. ✅ Abrir el navegador: `http://localhost:5173`
6. ✅ Verificar conexiones en el panel "🔌 Estado de Conexiones"

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en la consola
2. Verifica que el backend esté corriendo
3. Prueba los endpoints con curl
4. Revisa la configuración en `.env`

## 📄 Licencia

MIT

---

**Hecho con ❤️ para el PumpFun Sniper Bot**
