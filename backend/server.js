require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { Connection, PublicKey } = require('@solana/web3.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración
app.use(cors());
app.use(express.json());

// Conexión a Solana con Helius
const solanaConnection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

// Cache simple
const cache = new Map();
const CACHE_DURATION = 2000;

function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCacheData(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// ============================================
// ENDPOINTS DE PUMP.FUN (API REAL)
// ============================================

// Obtener tokens recientes de Pump.fun
app.get('/api/pumpfun/tokens', async (req, res) => {
  try {
    const limit = req.query.limit || 200;
    const offset = req.query.offset || 0;
    const cacheKey = `pumpfun_tokens_${limit}_${offset}`;
    
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    console.log(`[Pump.fun] Fetching ${limit} tokens from offset ${offset}`);
    
    const response = await fetch(
      `https://frontend-api-v2.pump.fun/coins/latest-metadatas?limit=${limit}&offset=${offset}&includeNsfw=false`,
      {
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Pump.fun API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    setCacheData(cacheKey, data);
    
    console.log(`[Pump.fun] ✅ Received ${data.length} tokens`);
    
    res.json({
      success: true,
      data: data,
      count: data.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[Pump.fun] ❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener información de un token específico
app.get('/api/pumpfun/token/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const cacheKey = `pumpfun_token_${mint}`;
    
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    console.log(`[Pump.fun] Fetching token: ${mint}`);
    
    const response = await fetch(
      `https://frontend-api-v2.pump.fun/coins/${mint}`,
      {
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Pump.fun API error: ${response.status}`);
    }

    const data = await response.json();
    setCacheData(cacheKey, data);
    
    res.json({ success: true, data: data });
  } catch (error) {
    console.error('[Pump.fun] ❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener trades de un token
app.get('/api/pumpfun/token/:mint/trades', async (req, res) => {
  try {
    const { mint } = req.params;
    const limit = req.query.limit || 20;
    const cacheKey = `pumpfun_trades_${mint}_${limit}`;
    
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    console.log(`[Pump.fun] Fetching trades for: ${mint}`);
    
    const response = await fetch(
      `https://frontend-api-v2.pump.fun/coins/${mint}/trades?limit=${limit}`,
      {
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Pump.fun API error: ${response.status}`);
    }

    const data = await response.json();
    setCacheData(cacheKey, data);
    
    res.json({ success: true, data: data, count: data.length });
  } catch (error) {
    console.error('[Pump.fun] ❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ENDPOINTS DE RAYDIUM (API REAL)
// ============================================

// Obtener pools de Raydium
app.get('/api/raydium/pools', async (req, res) => {
  try {
    const pageSize = req.query.pageSize || 50;
    const page = req.query.page || 1;
    const poolType = req.query.poolType || 'all';
    const sortField = req.query.sortField || 'default';
    const cacheKey = `raydium_pools_${pageSize}_${page}_${poolType}_${sortField}`;
    
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    console.log(`[Raydium] Fetching ${pageSize} pools (page ${page})`);
    
    const response = await fetch(
      `https://api-v3.raydium.io/pools/info/list?poolType=${poolType}&poolSortField=${sortField}&sortType=desc&pageSize=${pageSize}&page=${page}`,
      {
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Raydium API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Raydium API returned unsuccessful response');
    }
    
    setCacheData(cacheKey, data.data);
    
    console.log(`[Raydium] ✅ Received ${data.data?.data?.length || 0} pools`);
    
    res.json({
      success: true,
      data: data.data,
      count: data.data?.data?.length || 0,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[Raydium] ❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener información de un pool específico
app.get('/api/raydium/pool/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `raydium_pool_${id}`;
    
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    console.log(`[Raydium] Fetching pool: ${id}`);
    
    const response = await fetch(
      `https://api-v3.raydium.io/pools/info/ids?ids=${id}`,
      {
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Raydium API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Raydium API returned unsuccessful response');
    }
    
    setCacheData(cacheKey, data.data);
    
    res.json({ success: true, data: data.data });
  } catch (error) {
    console.error('[Raydium] ❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ENDPOINTS DE SOLANA RPC (API REAL)
// ============================================

// Obtener versión de Solana
app.get('/api/solana/version', async (req, res) => {
  try {
    console.log('[Solana] Fetching version...');
    const version = await solanaConnection.getVersion();
    
    console.log('[Solana] ✅ Connected successfully');
    
    res.json({
      success: true,
      data: version,
      rpc: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[Solana] ❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener balance de una cuenta
app.get('/api/solana/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const cacheKey = `solana_balance_${address}`;
    
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    console.log(`[Solana] Fetching balance for: ${address}`);
    
    const pubkey = new PublicKey(address);
    const balance = await solanaConnection.getBalance(pubkey);
    
    const balanceData = {
      address: address,
      lamports: balance,
      sol: balance / 1e9
    };
    
    setCacheData(cacheKey, balanceData);
    
    console.log(`[Solana] ✅ Balance: ${balanceData.sol} SOL`);
    
    res.json({ success: true, data: balanceData });
  } catch (error) {
    console.error('[Solana] ❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener información de un token SPL
app.get('/api/solana/token/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const cacheKey = `solana_token_${mint}`;
    
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    console.log(`[Solana] Fetching token info: ${mint}`);
    
    const mintPubkey = new PublicKey(mint);
    const mintInfo = await solanaConnection.getParsedAccountInfo(mintPubkey);
    
    setCacheData(cacheKey, mintInfo);
    
    res.json({ success: true, data: mintInfo });
  } catch (error) {
    console.error('[Solana] ❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ENDPOINTS DE UTILIDAD
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    cache_size: cache.size
  });
});

// Diagnóstico completo
app.get('/api/diagnose', async (req, res) => {
  const results = {
    timestamp: Date.now(),
    pumpfun: { status: 'unknown', error: null },
    raydium: { status: 'unknown', error: null },
    solana: { status: 'unknown', error: null }
  };

  // Probar Pump.fun
  try {
    const response = await fetch('https://frontend-api-v2.pump.fun/coins/latest-metadatas?limit=1&offset=0', {
      timeout: 10000,
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      results.pumpfun = { status: 'ok' };
    } else {
      results.pumpfun = { status: 'error', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    results.pumpfun = { status: 'error', error: error.message };
  }

  // Probar Raydium
  try {
    const response = await fetch('https://api-v3.raydium.io/pools/info/list?poolType=all&poolSortField=default&sortType=desc&pageSize=1&page=1', {
      timeout: 10000,
      headers: { 'Accept': 'application/json' }
    });
    if (response.ok) {
      results.raydium = { status: 'ok' };
    } else {
      results.raydium = { status: 'error', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    results.raydium = { status: 'error', error: error.message };
  }

  // Probar Solana
  try {
    await solanaConnection.getVersion();
    results.solana = { status: 'ok' };
  } catch (error) {
    results.solana = { status: 'error', error: error.message };
  }

  res.json({ success: true, results: results });
});

// Estadísticas del servidor
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      cache_size: cache.size,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      node_version: process.version
    }
  });
});

// Limpiar cache
app.post('/api/cache/clear', (req, res) => {
  cache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

// ============================================
// MANEJO DE ERRORES
// ============================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 PumpFun Sniper Bot Backend                           ║
║                                                           ║
║   ✅ Servidor corriendo en: http://localhost:${PORT}        ║
║                                                           ║
║   📡 APIs REALES conectadas:                              ║
║   - Pump.fun: https://frontend-api-v2.pump.fun           ║
║   - Raydium: https://api-v3.raydium.io                   ║
║   - Solana RPC: ${process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'}
║                                                           ║
║   🔧 Endpoints disponibles:                               ║
║   - GET  /api/pumpfun/tokens                              ║
║   - GET  /api/pumpfun/token/:mint                         ║
║   - GET  /api/pumpfun/token/:mint/trades                  ║
║   - GET  /api/raydium/pools                               ║
║   - GET  /api/raydium/pool/:id                            ║
║   - GET  /api/solana/version                              ║
║   - GET  /api/solana/balance/:address                     ║
║   - GET  /api/solana/token/:mint                          ║
║   - GET  /api/health                                      ║
║   - GET  /api/diagnose                                    ║
║   - GET  /api/stats                                       ║
║   - POST /api/cache/clear                                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
