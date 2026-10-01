# 🎯 PumpFun Sniper Bot

Bot de trading automatizado para tokens de [pump.fun](https://pump.fun) en Solana.

## 🚀 Características

### ✅ Conexión Real a Múltiples Plataformas
- **Pump.fun**: Obtiene tokens directamente de la API pública de pump.fun
- **Raydium Launchpad**: Obtiene tokens nuevos del launchpad de Raydium
- **Doble Fuente de Oportunidades**: El bot monitorea ambas plataformas simultáneamente
- **Precios Reales**: Calcula precios basados en las reservas reales de cada plataforma
- **Actualización en Tiempo Real**: Polling cada 5 segundos para obtener los tokens más recientes
- **Indicador Visual**: Muestra de qué plataforma proviene cada token (🎯 pump.fun / 🌊 Raydium)

### 🎯 Estrategia de Trading
- **Detección Ultra-Rápida**: Detecta oportunidades cada 0.05-0.2 segundos
- **Polling Acelerado**: Obtiene tokens nuevos cada 1 segundo (antes 5s)
- **Detección de Tokens Nuevos**: Identifica automáticamente tokens recién creados
- **Priorización de Tokens Recientes**: Enfoca el 60% de las detecciones en pump.fun
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

## 🌊 Integración con Raydium Launchpad

### ¿Qué es Raydium Launchpad?
Raydium Launchpad (también conocido como LaunchLab) es la plataforma de lanzamiento de tokens de Raydium, uno de los DEX más grandes de Solana. Es competencia directa de pump.fun.

### Ventajas de usar Raydium Launchpad:
- **Liquidez Real**: Los tokens tienen liquidez real desde el inicio
- **Menos Rugpulls**: Al tener liquidez bloqueada, es más difícil que los creadores huyan con el dinero
- **Tokens de Calidad**: Generalmente hay más proyectos serios que en pump.fun
- **85 SOL para Graduar**: Los tokens necesitan levantar 85 SOL para completar la curva de bonding

### Cómo funciona la integración:
1. **Conexión Automática**: Al iniciar el bot, se conecta a ambas plataformas
2. **Detección Dual**: Detecta tokens de pump.fun Y Raydium simultáneamente
3. **Indicador Visual**: Cada token muestra de qué plataforma proviene
   - 🎯 = pump.fun
   - 🌊 = Raydium Launchpad
4. **Distribución 50/50**: El bot alterna entre ambas plataformas para maximizar oportunidades

### Estadísticas en Tiempo Real:
En el header verás dos badges:
- `🎯 X pump.fun` - Tokens detectados de pump.fun
- `🌊 X raydium` - Tokens detectados de Raydium

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

### 1. Detección Ultra-Rápida
```
Cada 1 segundo (polling):
- Obtiene 200 tokens más recientes de pump.fun (🎯)
- Obtiene 200 tokens más recientes de Raydium Launchpad (🌊)
- Detecta tokens NUEVOS automáticamente
- Prioriza tokens nuevos para detección inmediata

Cada 0.05-0.2 segundos (detección):
- Selecciona token aleatorio (60% pump.fun, 40% raydium)
- Prioriza los 50 tokens más recientes de pump.fun
- Simula detección de compras
- Evalúa si puede entrar
- Muestra de qué plataforma proviene cada token
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

## 🔧 APIs Utilizadas

### Pump.fun API
El bot utiliza la API pública de pump.fun:

```typescript
// Obtener tokens recientes
GET https://frontend-api-v2.pump.fun/coins/latest-metadatas

// Calcular precio real
precio = virtual_sol_reserves / virtual_token_reserves
```

### Raydium API v3
El bot también se conecta a Raydium Launchpad:

```typescript
// Obtener pools nuevos
GET https://api-v3.raydium.io/pools/info/list?poolType=all&poolSortField=default&sortType=desc

// Calcular precio real
precio = pool.price (directo de la API)
```

### ¿Por qué ambas plataformas?

**Pump.fun:**
- Tokens en bonding curve (pre-graduation)
- Mayor volatilidad, mayor potencial de ganancias
- Tokens muy nuevos, menos competencia

**Raydium Launchpad:**
- Tokens con liquidez real desde el inicio
- Mayor estabilidad, menor riesgo de rugpulls
- Competencia directa con pump.fun
- Más oportunidades de detección

**Combinar ambas = 2x más oportunidades de trading**

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
