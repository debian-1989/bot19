/**
 * Servidor Principal del Bot
 * 
 * Arquitectura modular con:
 * - Configuración centralizada y validada
 * - Conexión Solana con health checks
 * - Detector on-chain de Pump.fun
 * - Health checks reales
 * - Paper trading por defecto
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { getConfig } = require('./src/config');
const { getConnectionManager } = require('./src/solana/connection');
const { getPumpFunDetector } = require('./src/detectors/pumpfun');

// Validar configuración al inicio
let config;
try {
  config = getConfig();
} catch (error) {
  console.error('\n❌ Error de configuración:', error.message);
  console.error('Copia backend/.env.example a backend/.env y completa los valores\n');
  process.exit(1);
}

const app = express();
const PORT = config.port;

// Middleware
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  if (config.debug) {
    console.log(`[HTTP] ${req.method} ${req.path}`);
  }
  next();
});

// ============================================
// SERVICIOS GLOBALES
// ============================================

let connectionManager;
let pumpFunDetector;
const recentPumpFunTokens = [];
const MAX_RECENT_PUMP_FUN_TOKENS = 500;

function rememberPumpFunToken(event) {
  const exists = recentPumpFunTokens.some((token) => token.mint === event.mint || token.signature === event.signature);
  if (exists) return;
  recentPumpFunTokens.unshift(event);
  if (recentPumpFunTokens.length > MAX_RECENT_PUMP_FUN_TOKENS) {
    recentPumpFunTokens.length = MAX_RECENT_PUMP_FUN_TOKENS;
  }
}

// ============================================
// ENDPOINTS DE HEALTH CHECK
// ============================================

/**
 * Health check completo del sistema
 * Verifica TODOS los componentes independientemente
 */
app.get('/api/health', async (req, res) => {
  try {
      const health = {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
      tradingMode: config.tradingMode,
      liveTradingEnabled: config.enableLiveTrading,
      components: {}
    };

    // Verificar conexión Solana
    if (connectionManager) {
      const solanaStatus = connectionManager.getStatus();
      health.components.solana = {
        httpConnected: solanaStatus.httpConnected,
        wsConnected: solanaStatus.wsConnected,
        lastSlot: solanaStatus.lastSlot,
        lastEventAt: solanaStatus.lastEventAt,
        latencyMs: solanaStatus.latencyMs,
        lastHealthCheck: solanaStatus.lastHealthCheck,
        usingFallback: solanaStatus.usingFallback
      };
    } else {
      health.components.solana = { httpConnected: false, error: 'Not initialized' };
    }

    // Verificar detector Pump.fun
    if (pumpFunDetector) {
      const detectorStatus = pumpFunDetector.getStatus();
      health.components.pumpFunDetector = {
        isListening: detectorStatus.isListening,
        lastProcessedSlot: detectorStatus.lastProcessedSlot,
        eventsProcessed: detectorStatus.metrics.eventsProcessed,
        lastEventAt: detectorStatus.metrics.lastEventAt
      };
    } else {
      health.components.pumpFunDetector = { isListening: false, error: 'Not initialized' };
    }

    // Determinar estado general
    const allHealthy = 
      health.components.solana.httpConnected &&
      health.components.solana.wsConnected &&
      health.components.pumpFunDetector.isListening;

      health.status = allHealthy ? 'ok' : 'degraded';
      health.healthy = allHealthy;

    res.json(health);
  } catch (error) {
    console.error('[Health] Error:', error.message);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: Date.now()
    });
  }
});

/**
 * Health check detallado para diagnóstico
 */
app.get('/api/health/detailed', async (req, res) => {
  try {
    const detailed = {
      timestamp: Date.now(),
      config: config.toSafeObject(),
      solana: connectionManager ? connectionManager.getStatus() : null,
      pumpFunDetector: pumpFunDetector ? pumpFunDetector.getStatus() : null,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };

    res.json(detailed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENDPOINTS DE DIAGNÓSTICO
// ============================================

app.get('/api/diagnose', async (req, res) => {
  try {
    const diagnosis = {
      timestamp: Date.now(),
      config: {
        tradingMode: config.tradingMode,
        liveTrading: config.enableLiveTrading,
        rpcConfigured: !!config.solanaRpcUrl,
        walletConfigured: !!config.walletPrivateKey
      },
      solana: {
        connected: false,
        slot: null,
        latency: null,
        error: null
      },
      pumpFun: {
        listening: false,
        eventsProcessed: 0,
        lastEventAt: null,
        error: null
      }
    };

    // Diagnosticar Solana
    if (connectionManager) {
      try {
        const status = connectionManager.getStatus();
        diagnosis.solana.connected = status.httpConnected;
        diagnosis.solana.slot = status.lastSlot;
        diagnosis.solana.latency = status.latencyMs;
      } catch (error) {
        diagnosis.solana.error = error.message;
      }
    }

    // Diagnosticar Pump.fun detector
    if (pumpFunDetector) {
      try {
        const status = pumpFunDetector.getStatus();
        diagnosis.pumpFun.listening = status.isListening;
        diagnosis.pumpFun.eventsProcessed = status.metrics.eventsProcessed;
        diagnosis.pumpFun.lastEventAt = status.metrics.lastEventAt;
      } catch (error) {
        diagnosis.pumpFun.error = error.message;
      }
    }

    res.json(diagnosis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENDPOINTS DE ESTADÍSTICAS
// ============================================

app.get('/api/stats', (req, res) => {
  try {
    const stats = {
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      tradingMode: config.tradingMode,
      liveTrading: config.enableLiveTrading
    };

    if (pumpFunDetector) {
      stats.pumpFunMetrics = pumpFunDetector.getMetrics();
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENDPOINTS DE CONFIGURACIÓN (READ-ONLY)
// ============================================

app.get('/api/config', (req, res) => {
  // NO exponer información sensible
  res.json({
    tradingMode: config.tradingMode,
    liveTradingEnabled: config.enableLiveTrading,
    maxConcurrentTrades: config.maxConcurrentTrades,
    tradeAmount: config.tradeAmount,
    takeProfitMultiplier: config.takeProfitMultiplier,
    stopLossPercent: config.stopLossPercent,
    // NO exponer: walletPrivateKey, API keys, etc.
  });
});

// ============================================
// ENDPOINTS AUXILIARES (COMPATIBILIDAD)
// ============================================

// Mantener endpoints antiguos para compatibilidad con frontend existente
// Pero marcarlos como auxiliares/deprecated

app.get('/api/pumpfun/tokens', async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '100', 10) || 100, 1), 500);
  res.json({
    success: true,
    data: recentPumpFunTokens.slice(0, limit),
    count: Math.min(recentPumpFunTokens.length, limit),
    source: 'pumpfun-on-chain-websocket',
    timestamp: Date.now()
  });
});

app.get('/api/raydium/pools', async (req, res) => {
  try {
    const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize || '50', 10) || 50, 1), 100);
    const page = Math.max(Number.parseInt(req.query.page || '1', 10) || 1, 1);
    const url = new URL('https://api-v3.raydium.io/pools/info/list');
    url.searchParams.set('poolType', req.query.poolType || 'all');
    url.searchParams.set('poolSortField', req.query.poolSortField || 'default');
    url.searchParams.set('sortType', req.query.sortType || 'desc');
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('page', String(page));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ success: false, error: payload?.msg || `Raydium HTTP ${response.status}` });
      }
      return res.json({ success: true, data: payload.data || payload, source: 'raydium-api-v3', timestamp: Date.now() });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('[Raydium] Error consultando API:', error.message);
    return res.status(502).json({ success: false, error: error.name === 'AbortError' ? 'Raydium timeout' : error.message });
  }
});

app.get('/api/raydium/pool/:id', async (req, res) => {
  try {
    const url = new URL('https://api-v3.raydium.io/pools/info/ids');
    url.searchParams.set('ids', req.params.id);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ success: false, error: payload?.msg || `Raydium HTTP ${response.status}` });
      }
      return res.json({ success: true, data: payload.data || payload, source: 'raydium-api-v3', timestamp: Date.now() });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('[Raydium] Error consultando pool:', error.message);
    return res.status(502).json({ success: false, error: error.name === 'AbortError' ? 'Raydium timeout' : error.message });
  }
});

// ============================================
// INICIALIZACIÓN
// ============================================

async function initializeServices() {
  console.log('\n🚀 Iniciando servicios...\n');

  // 1. Inicializar conexión Solana
  try {
    console.log('[Init] Conectando a Solana...');
    connectionManager = getConnectionManager();
    await connectionManager.initialize();
    console.log('[Init] ✅ Solana conectado\n');
  } catch (error) {
    console.error('[Init] ❌ Error conectando a Solana:', error.message);
    console.error('[Init] Verifica tu SOLANA_RPC_URL en .env\n');
    process.exit(1);
  }

  // 2. Inicializar detector Pump.fun
  try {
    console.log('[Init] Iniciando detector Pump.fun...');
    pumpFunDetector = getPumpFunDetector();
    await pumpFunDetector.start();
    console.log('[Init] ✅ Detector Pump.fun activo\n');
    
    // Registrar listener para nuevos tokens
    pumpFunDetector.onNewToken((event) => {
      rememberPumpFunToken(event);
      console.log(`[Event] Nuevo token: ${event.symbol} (${event.mint})`);
    });
  } catch (error) {
    console.error('[Init] ❌ Error iniciando detector:', error.message);
    console.error('[Init] El bot continuará sin detección on-chain\n');
    // No es fatal, el bot puede continuar sin detector
  }

  console.log('✅ Todos los servicios inicializados\n');
}

// ============================================
// SHUTDOWN GRACEFUL
// ============================================

async function shutdown(signal) {
  console.log(`\n\n🛑 Recibida señal ${signal}. Cerrando servicios...\n`);

  try {
    if (pumpFunDetector) {
      await pumpFunDetector.stop();
    }
    
    if (connectionManager) {
      await connectionManager.shutdown();
    }
    
    console.log('✅ Servicios cerrados correctamente\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cerrando servicios:', error.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ============================================
// START SERVER
// ============================================

async function start() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 PUMPFUN SNIPER BOT - BACKEND');
  console.log('='.repeat(60) + '\n');

  // Mostrar configuración (sin información sensible)
  console.log('📋 Configuración:');
  console.log(`   Modo: ${config.tradingMode}`);
  console.log(`   Live trading: ${config.enableLiveTrading ? 'HABILITADO' : 'DESACTIVADO'}`);
  console.log(`   RPC: ${config.solanaRpcUrl.substring(0, 50)}...`);
  console.log(`   Puerto: ${config.port}`);
  console.log('');

  // Inicializar servicios
  await initializeServices();

  // Iniciar servidor
  app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log('='.repeat(60));
    console.log('\n📡 Endpoints disponibles:');
    console.log('   GET  /api/health          - Health check básico');
    console.log('   GET  /api/health/detailed - Health check detallado');
    console.log('   GET  /api/diagnose        - Diagnóstico completo');
    console.log('   GET  /api/stats           - Estadísticas');
    console.log('   GET  /api/config          - Configuración (safe)');
    console.log('\n⚠️  Endpoints auxiliares (deprecated):');
    console.log('   GET  /api/pumpfun/tokens  - AUXILIAR (usa on-chain)');
    console.log('   GET  /api/raydium/pools   - AUXILIAR');
    console.log('\n🔒 Seguridad:');
    console.log(`   Trading mode: ${config.tradingMode}`);
    console.log(`   Live trading: ${config.enableLiveTrading ? '⚠️  HABILITADO' : '✅ DESACTIVADO'}`);
    console.log('');
  });
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('\n❌ Error no capturado:', error);
  console.error('Stack:', error.stack);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Promesa rechazada no manejada:', reason);
  shutdown('UNHANDLED_REJECTION');
});

// Iniciar
start().catch(error => {
  console.error('\n❌ Error fatal iniciando servidor:', error);
  process.exit(1);
});
