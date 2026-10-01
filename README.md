# 🎯 PumpFun Sniper Bot

Bot de trading automatizado para tokens de [pump.fun](https://pump.fun) en Solana.

## 🚀 Características

### ✅ Conexión Real a Pump.fun
- **Tokens Reales**: Obtiene tokens directamente de la API pública de pump.fun
- **Precios Reales**: Calcula precios basados en las reservas virtuales de cada bonding curve
- **Actualización en Tiempo Real**: Polling cada 5 segundos para obtener los tokens más recientes
- **Sin Tokens Simulados**: A diferencia de versiones anteriores, este bot trabaja con datos reales

### 🎯 Estrategia de Trading
- **Detección Ultra-Rápida**: Detecta oportunidades cada 0.2-0.8 segundos
- **Ejecución Instantánea**: Sin delays, entra inmediatamente cuando detecta una oportunidad
- **Gestión de Capital Flexible**: Entra con cualquier cantidad de capital disponible
- **Múltiples Posiciones Simultáneas**: Hasta 10 operaciones al mismo tiempo (configurable)

### 🛡️ Sistema de Salida Automático
- **Take Profit**: Cierra automáticamente al alcanzar el multiplicador objetivo (2x por defecto)
- **Stop Loss**: Protege contra pérdidas grandes (30% por defecto)
- **Trailing Stop**: Bloquea ganancias siguiendo el precio hacia arriba
- **Time-Based Exit**: Cierra posiciones después del tiempo configurado
- **Profit Time Exit**: Cierra posiciones en ganancia después de X segundos
- **Cierre Forzoso**: Monitor cada segundo para asegurar que NINGUNA posición quede abierta

### 📊 Monitoreo en Tiempo Real
- Dashboard con estadísticas completas
- Monitor en vivo de todas las transacciones
- Historial detallado de operaciones
- Gestión de capital visual

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

## ⚙️ Configuración

### Parámetros Principales

- **Monto por Operación**: Cantidad fija de SOL para cada snipe (ej: 0.1 SOL)
- **Máx. Operaciones Simultáneas**: Límite de posiciones abiertas (default: 10)
- **Compra Mínima/Máxima a Detectar**: Rango de compras que el bot detectará
- **Take Profit**: Multiplicador para tomar ganancias (2x = 100% de ganancia)
- **Stop Loss**: Porcentaje máximo de pérdida permitida
- **Tiempo Máximo de Posición**: Segundos antes de cerrar forzosamente
- **Salida por Ganancia**: Segundos en ganancia antes de cerrar

### Configuración de Billetera

⚠️ **IMPORTANTE**: 
- Usa una billetera dedicada con fondos limitados
- NUNCA compartas tu clave privada
- La clave se almacena solo localmente en tu navegador

## 🎮 Uso

### Modo Simulación (Recomendado para empezar)

1. Ve a la pestaña **"Pruebas y Simulación"**
2. Configura los parámetros de tu estrategia
3. Haz clic en **"Iniciar Test"**
4. Observa cómo el bot detecta tokens reales de pump.fun
5. Analiza los resultados sin arriesgar fondos

### Modo Real

1. Ve a **"Billetera"** y configura tu wallet
2. Ve a **"Configuración"** y ajusta los parámetros
3. Haz clic en **"💾 Guardar Configuración"**
4. Ve al **"Panel Principal"**
5. Haz clic en **"▶ INICIAR BOT"**
6. El bot comenzará a:
   - Conectarse a pump.fun
   - Obtener tokens reales
   - Detectar oportunidades
   - Ejecutar snipes automáticamente
   - Cerrar posiciones según tu estrategia

## 📈 Cómo Funciona

### 1. Detección
```
Cada 0.2-0.8 segundos:
- Obtiene tokens reales de pump.fun
- Simula detección de compras
- Evalúa si puede entrar
```

### 2. Entrada
```
Si hay capital disponible:
- Calcula monto óptimo
- Ejecuta snipe instantáneo
- Registra la posición
```

### 3. Monitoreo
```
Cada segundo:
- Verifica condiciones de salida
- Evalúa take profit / stop loss
- Cierra si es necesario
- Fuerza cierre por tiempo
```

### 4. Salida
```
Cuando se cumple alguna condición:
- Take Profit alcanzado
- Stop Loss activado
- Trailing Stop triggered
- Tiempo máximo excedido
- Ganancia después de X segundos
```

## 🔧 API de Pump.fun

El bot utiliza la API pública de pump.fun:

```typescript
// Obtener tokens recientes
GET https://frontend-api-v2.pump.fun/coins/latest-metadatas

// Calcular precio real
precio = virtual_sol_reserves / virtual_token_reserves
```

## ⚠️ Advertencias

### Riesgos
- **Pérdida Total**: Puedes perder todo tu capital
- **Volatilidad**: Los memecoins son extremadamente volátiles
- **Rugpulls**: Muchos tokens son scams
- **Slippage**: El precio puede moverse contra ti

### Recomendaciones
- ✅ Prueba primero en simulación
- ✅ Usa fondos que puedas permitirte perder
- ✅ Empieza con montos pequeños
- ✅ Monitorea el bot regularmente
- ✅ Ajusta los parámetros según tus resultados
- ✅ No dejes el bot sin supervisión por largos períodos

### No es Consejo Financiero
Este software es solo para fines educativos y experimentales. No es consejo financiero. Úsalo bajo tu propio riesgo.

## 📊 Estadísticas en Tiempo Real

El bot muestra:
- Total de operaciones
- Tasa de éxito (win rate)
- Ganancia total
- Mejor/peor operación
- Volumen total
- Posiciones abiertas
- Capital disponible

## 🔐 Seguridad

- ✅ Clave privada almacenada solo localmente
- ✅ No se envía a ningún servidor
- ✅ Solo se usa para firmar transacciones
- ✅ Recomendado: billetera dedicada con fondos limitados

## 🎯 Próximos Pasos

1. **Probar en Simulación**: Familiarízate con el bot
2. **Ajustar Parámetros**: Encuentra la configuración óptima
3. **Analizar Resultados**: Revisa el historial
4. **Decidir Estrategia**: Define tu enfoque
5. **Operar con Cautela**: Si decides usar fondos reales

## 📝 Notas Técnicas

- **Framework**: React + TypeScript + Vite
- **Estilos**: Tailwind CSS
- **API**: pump.fun pública (sin autenticación)
- **Red**: Solana Mainnet
- **Almacenamiento**: localStorage para configuración

## 🤝 Contribuciones

Este es un proyecto experimental. Siéntete libre de:
- Reportar bugs
- Sugerir mejoras
- Probar diferentes estrategias
- Compartir resultados

## 📄 Licencia

MIT License - Úsalo bajo tu propio riesgo.

---

**⚠️ RECUERDA**: El trading de memecoins es extremadamente arriesgado. La mayoría de los tokens pierden valor. Nunca inviertas más de lo que puedas permitirte perder. Este bot es una herramienta experimental, no una garantía de ganancias.
