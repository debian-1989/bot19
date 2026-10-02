# 🔒 Guía de Seguridad

## Principios de Seguridad

### 1. Claves Privadas

#### ❌ NUNCA Hacer
- Almacenar en localStorage del navegador
- Incluir en código fuente
- Commitear a git
- Mostrar en logs
- Enviar en respuestas HTTP
- Compartir en chats/emails
- Usar wallet principal con fondos significativos

#### ✅ Hacer
- Almacenar solo en backend via variable de entorno
- Usar archivo `.env` (no versionado)
- Usar wallet dedicada con fondos limitados
- Rotar claves periódicamente
- Monitorear uso de la wallet
- Tener plan de contingencia para compromiso

### 2. Modo de Trading

#### Paper Mode (Por Defecto)
```bash
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
```
- ✅ NO firma transacciones
- ✅ NO envía transacciones a Solana
- ✅ Solo simula operaciones
- ✅ Seguro para pruebas

#### Live Mode (Peligroso)
```bash
TRADING_MODE=live
ENABLE_LIVE_TRADING=true
```
- ⚠️ FIRMA transacciones reales
- ⚠️ ENVÍA transacciones a Solana
- ⚠️ Usa dinero real
- ⚠️ Requiere wallet dedicada
- ⚠️ Requiere límites de riesgo configurados

### 3. Variables de Entorno

#### Críticas
```bash
# NUNCA commitear estos valores
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=TU_API_KEY
WALLET_PRIVATE_KEY=tu_clave_privada_aqui
```

#### Protección
- ✅ `.env` en `.gitignore`
- ✅ `.env.example` sin valores reales
- ✅ Validación al inicio
- ✅ Redacción en logs

### 4. Límites de Riesgo

#### Configuración Recomendada
```bash
# Límite diario máximo de pérdida (SOL)
DAILY_LOSS_LIMIT=1.0

# Límite máximo por operación (SOL)
MAX_TRADE_AMOUNT=0.5

# Slippage máximo permitido (%)
MAX_SLIPPAGE_PERCENT=15

# Balance mínimo requerido (SOL)
MIN_WALLET_BALANCE=0.1

# Máximo de posiciones concurrentes
MAX_CONCURRENT_TRADES=10
```

#### Kill Switch
Si algo sale mal:
1. Detener el bot: `Ctrl+C`
2. Cambiar a paper mode: `TRADING_MODE=paper`
3. Reiniciar el bot

### 5. Wallet Dedicada

#### Recomendaciones
- ✅ Crear wallet nueva solo para el bot
- ✅ Transferir solo fondos que puedas perder
- ✅ NO usar wallet principal
- ✅ Monitorear balance regularmente
- ✅ Retirar ganancias periódicamente
- ✅ Tener plan de emergencia

#### Ejemplo
```bash
# Wallet principal (NO usar con el bot)
Principal Wallet: 100 SOL

# Wallet del bot (dedicada)
Bot Wallet: 2 SOL (máximo que puedes perder)
```

### 6. RPC Providers

#### Recomendados
1. **Helius** (Recomendado)
   - URL: `https://mainnet.helius-rpc.com/?api-key=...`
   - WebSocket: `wss://mainnet.helius-rpc.com/?api-key=...`
   - Gratis hasta 100k credits/día
   - Baja latencia

2. **QuickNode**
   - URL: `https://TU_ENDPOINT.solana.quiknode.pro/TU_API_KEY/`
   - Pago, muy rápido
   - Sin límites estrictos

3. **Alchemy**
   - URL: `https://solana-mainnet.g.alchemy.com/v2/TU_API_KEY`
   - Gratis hasta 300M compute units/mes

#### Evitar
- ❌ RPC público (`https://api.mainnet-beta.solana.com`)
  - Rate limits estrictos
  - Errores 403 frecuentes
  - No confiable para producción

### 7. Logs y Monitoreo

#### Qué NO Loggear
- ❌ Claves privadas
- ❌ API keys completas
- ❌ Seed phrases
- ❌ Transacciones completas con secretos

#### Qué SÍ Loggear
- ✅ Timestamps de eventos
- ✅ Signatures de transacciones (públicas)
- ✅ Slots procesados
- ✅ Métricas de rendimiento
- ✅ Errores (sin información sensible)

#### Redacción
```javascript
// ❌ MAL
console.log('API Key:', config.apiKey);

// ✅ BIEN
console.log('API Key:', config.apiKey.substring(0, 10) + '...');
```

### 8. CORS y Seguridad Web

#### Configuración
```javascript
// backend/server.js
app.use(cors({
  origin: config.corsOrigins, // Solo orígenes específicos
  credentials: true
}));
```

#### Recomendaciones
- ✅ Restringir CORS a orígenes específicos
- ✅ NO usar `origin: '*'` en producción
- ✅ Implementar rate limiting
- ✅ Usar HTTPS en producción
- ✅ Implementar autenticación si es necesario

### 9. Checklist de Seguridad

Antes de activar live trading:

- [ ] Wallet dedicada creada
- [ ] Fondos limitados en wallet del bot
- [ ] Paper mode probado exhaustivamente
- [ ] Límites de riesgo configurados
- [ ] Kill switch probado
- [ ] Logs revisados (sin información sensible)
- [ ] `.env` en `.gitignore`
- [ ] API keys rotadas si es necesario
- [ ] Plan de contingencia documentado
- [ ] Monitoreo activo configurado

### 10. Incident Response

#### Si la Wallet es Comprometida
1. **INMEDIATAMENTE**: Detener el bot
2. Transferir fondos restantes a wallet nueva
3. Generar nueva clave privada
4. Investigar cómo fue comprometida
5. Actualizar `.env` con nueva clave
6. Reiniciar bot con nueva configuración

#### Si el Servidor es Comprometido
1. Detener el bot
2. Rotar todas las claves (API keys, wallet)
3. Revisar logs para identificar brecha
4. Parchear vulnerabilidad
5. Reiniciar con nuevas credenciales

#### Si hay Pérdidas Inusuales
1. Detener el bot inmediatamente
2. Revisar logs de operaciones
3. Verificar transacciones en Solana Explorer
4. Identificar causa
5. Ajustar límites de riesgo
6. Reiniciar con configuración más conservadora

### 11. Mejores Prácticas

#### Desarrollo
- ✅ Usar paper mode siempre en desarrollo
- ✅ Probar con wallet sin fondos
- ✅ Revisar código antes de commitear
- ✅ NO commitear `.env`

#### Producción
- ✅ Usar servidor dedicado (no localhost)
- ✅ Implementar monitoreo 24/7
- ✅ Tener alertas de pérdidas
- ✅ Backups de configuración
- ✅ Documentación de procedimientos

#### Operación
- ✅ Monitorear balance diariamente
- ✅ Revisar logs regularmente
- ✅ Ajustar límites según rendimiento
- ✅ Retirar ganancias periódicamente
- ✅ Mantener software actualizado

### 12. Recursos Adicionales

#### Solana Security
- [Solana Security Best Practices](https://docs.solana.com/developing/clients/javascript-reference)
- [Wallet Security](https://solana.com/wallets)

#### General
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

## Contacto y Soporte

Si encuentras un problema de seguridad:
1. NO lo reportes en issues públicos
2. Contacta directamente al mantenedor
3. Proporciona detalles mínimos necesarios
4. Espera confirmación antes de divulgar

---

**Recuerda**: La seguridad es responsabilidad de todos. Nunca compartas claves privadas, usa wallets dedicadas, y prueba exhaustivamente en paper mode antes de operar con dinero real.
