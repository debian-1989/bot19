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

// Conexión a Solana - Usar múltiples RPCs como fallback
const RPC_ENDPOINTS = [
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://rpc.ankr.com/solana'
];

let currentRpcIndex = 0;
let solanaConnection = new Connection(RPC_ENDPOINTS[0], 'confirmed');

// Función para cambiar de RPC si uno falla
function rotateRpc() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  solanaConnection = new Connection(RPC_ENDPOINTS[currentRpcIndex], 'confirmed');
  console.log(`[Solana] Rotated to RPC: ${RPC_ENDPOINTS[currentRpcIndex]}`);
}

// Cache simple para reducir llamadas a APIs
const cache = new Map();
const CACHE_DURATION = 2000; // 2 segundos

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
// ENDPOINTS DE PUMP.FUN
// ============================================

// Obtener tokens recientes de Pump.fun
app.get('/api/pumpfun/tokens', async (req, res) => {
  try {
    const limit = req.query.limit || 200;
    const offset = req.query.offset || 0;
    const cacheKey = `pumpfun_tokens_${limit}_${offset}`;
    
    // Verificar cache
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const response = await fetch(
      `https://frontend-api-v2.pump.fun/coins/latest-metadatas?limit=${limit}&offset=${offset}&includeNsfw=false`
    );

    if (!response.ok) {
      throw new Error(`Pump.fun API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Guardar en cache
    setCacheData(cacheKey, data);
    
    res.json({
      success: true,
      data: data,
      count: data.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching Pump.fun tokens:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener información de un token específico de Pump.fun
app.get('/api/pumpfun/token/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const cacheKey = `pumpfun_token_${mint}`;
    
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const response = await fetch(
      `https://frontend-api-v2.pump.fun/coins/${mint}`
    );

    if (!response.ok) {
      throw new Error(`Pump.fun API error: ${response.status}`);
    }

    const data = await response.json();
    setCacheData(cacheKey, data);
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching Pump.fun token:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener trades de un token de Pump.fun
app.get('/api/pumpfun/token/:mint/trades', async (req, res) => {
  try {
    const { mint } = req.params;
    const limit = req.query.limit || 20;
    const cacheKey = `pumpfun_trades_${mint}_${limit}`;
    
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const response = await fetch(
      `https://frontend-api-v2.pump.fun/coins/${mint}/trades?limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Pump.fun API error: ${response.status}`);
    }

    const data = await response.json();
    setCacheData(cacheKey, data);
    
    res.json({
      success: true,
      data: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching Pump.fun trades:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ENDPOINTS DE RAYDIUM
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

    const url = `https://api-v3.raydium.io/pools/info/list?poolType=${poolType}&poolSortField=${sortField}&sortType=desc&pageSize=${pageSize}&page=${page}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Raydium API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Raydium API returned unsuccessful response');
    }
    
    setCacheData(cacheKey, data.data);
    
    res.json({
      success: true,
      data: data.data,
      count: data.data?.data?.length || 0,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching Raydium pools:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener información de un pool específico de Raydium
app.get('/api/raydium/pool/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `raydium_pool_${id}`;
    
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const response = await fetch(
      `https://api-v3.raydium.io/pools/info/ids?ids=${id}`
    );

    if (!response.ok) {
      throw new Error(`Raydium API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Raydium API returned unsuccessful response');
    }
    
    setCacheData(cacheKey, data.data);
    
    res.json({
      success: true,
      data: data.data
    });
  } catch (error) {
    console.error('Error fetching Raydium pool:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ENDPOINTS DE SOLANA RPC
// ============================================

// Obtener versión de Solana con rotación de RPC
app.get('/api/solana/version', async (req, res) => {
  try {
    const version = await solanaConnection.getVersion();
    
    res.json({
      success: true,
      data: version,
      rpc: RPC_ENDPOINTS[currentRpcIndex],
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`[Solana] Error with RPC ${currentRpcIndex}:`, error.message);
    
    // Si es error 403, rotar al siguiente RPC
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      console.log('[Solana] RPC blocked (403), rotating to next RPC...');
      rotateRpc();
      
      // Reintentar con el nuevo RPC
      try {
        const version = await solanaConnection.getVersion();
        res.json({
          success: true,
          data: version,
          rpc: RPC_ENDPOINTS[currentRpcIndex],
          timestamp: Date.now(),
          rotated: true
        });
      } catch (retryError) {
        res.status(500).json({
          success: false,
          error: `All RPCs failed. Last error: ${retryError.message}`
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// Obtener balance de una cuenta con rotación de RPC
app.get('/api/solana/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const cacheKey = `solana_balance_${address}`;
    
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const pubkey = new PublicKey(address);
    const balance = await solanaConnection.getBalance(pubkey);
    
    const balanceData = {
      address: address,
      lamports: balance,
      sol: balance / 1e9,
      rpc: RPC_ENDPOINTS[currentRpcIndex]
    };
    
    setCacheData(cacheKey, balanceData);
    
    res.json({
      success: true,
      data: balanceData
    });
  } catch (error) {
    console.error(`[Solana] Error with RPC ${currentRpcIndex}:`, error.message);
    
    // Si es error 403, rotar al siguiente RPC
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      console.log('[Solana] RPC blocked (403), rotating to next RPC...');
      rotateRpc();
      
      // Reintentar con el nuevo RPC
      try {
        const pubkey = new PublicKey(req.params.address);
        const balance = await solanaConnection.getBalance(pubkey);
        
        const balanceData = {
          address: req.params.address,
          lamports: balance,
          sol: balance / 1e9,
          rpc: RPC_ENDPOINTS[currentRpcIndex]
        };
        
        res.json({
          success: true,
          data: balanceData,
          rotated: true
        });
      } catch (retryError) {
        res.status(500).json({
          success: false,
          error: `All RPCs failed. Last error: ${retryError.message}`
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
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

    const mintPubkey = new PublicKey(mint);
    const mintInfo = await solanaConnection.getParsedAccountInfo(mintPubkey);
    
    setCacheData(cacheKey, mintInfo);
    
    res.json({
      success: true,
      data: mintInfo
    });
  } catch (error) {
    console.error('Error fetching Solana token:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
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
  res.json({
    success: true,
    message: 'Cache cleared'
  });
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

// 404 handler
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
║   📡 Endpoints disponibles:                               ║
║   - GET  /api/pumpfun/tokens                              ║
║   - GET  /api/pumpfun/token/:mint                         ║
║   - GET  /api/pumpfun/token/:mint/trades                  ║
║   - GET  /api/raydium/pools                               ║
║   - GET  /api/raydium/pool/:id                            ║
║   - GET  /api/solana/version                              ║
║   - GET  /api/solana/balance/:address                     ║
║   - GET  /api/solana/token/:mint                          ║
║   - GET  /api/health                                      ║
║   - GET  /api/stats                                       ║
║   - POST /api/cache/clear                                 ║
║                                                           ║
║   🔧 Configuración:                                       ║
║   - Puerto: ${PORT}                                       ║
║   - RPC: ${process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'}
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
