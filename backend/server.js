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
let solanaUseDemo = false; // Modo demo si todos los RPCs fallan

// Función para cambiar de RPC si uno falla
function rotateRpc() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  solanaConnection = new Connection(RPC_ENDPOINTS[currentRpcIndex], 'confirmed');
  console.log(`[Solana] Rotated to RPC: ${RPC_ENDPOINTS[currentRpcIndex]}`);
}

// Datos demo para Solana
function getSolanaDemoVersion() {
  return {
    'solana-core': '1.18.26',
    'feature-set': 4215500110,
    _demo: true
  };
}

function getSolanaDemoBalance(address) {
  return {
    address: address,
    lamports: Math.floor(Math.random() * 10000000000), // 0-10 SOL aleatorio
    sol: Math.random() * 10,
    _demo: true
  };
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

// Configuración de endpoints para Pump.fun con múltiples opciones
const PUMPFUN_ENDPOINTS = [
  // Directo (puede tener CORS issues)
  'https://frontend-api-v2.pump.fun',
  // Proxies CORS públicos como fallback
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];

let currentPumpFunIndex = 0;
let pumpFunLastSuccess = 0;
let pumpFunUseDemo = false; // Modo demo si todas las APIs fallan

// Función para rotar entre endpoints de Pump.fun
function rotatePumpFunEndpoint() {
  currentPumpFunIndex = (currentPumpFunIndex + 1) % PUMPFUN_ENDPOINTS.length;
  console.log(`[Pump.fun] Rotated to endpoint: ${PUMPFUN_ENDPOINTS[currentPumpFunIndex]}`);
}

// Generar tokens demo realistas
function generateDemoTokens(count = 200) {
  const symbols = ['BONK', 'WIF', 'POPCAT', 'MYRO', 'WEN', 'BOME', 'SLERF', 'MEW', 'PNUT', 'ACT', 'MOODENG', 'GOAT', 'HIPPO', 'TOSHI', 'COQ'];
  const tokens = [];
  
  for (let i = 0; i < count; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const mint = Array.from({length: 44}, () => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]).join('');
    
    tokens.push({
      mint: mint,
      name: `${symbol} Token`,
      symbol: symbol,
      description: `Demo ${symbol} token for testing`,
      image_uri: '',
      created_timestamp: Date.now() - Math.floor(Math.random() * 86400000),
      raydium_pool: null,
      complete: Math.random() > 0.7,
      virtual_sol_reserves: Math.random() * 100 + 10,
      virtual_token_reserves: Math.random() * 1000000000 + 100000000,
      total_supply: 1000000000,
      market_cap: Math.random() * 1000000,
      king_of_the_hill_timestamp: 0,
      usd_market_cap: Math.random() * 100000000,
      _demo: true
    });
  }
  
  return tokens;
}

// Función auxiliar para hacer fetch con fallback
async function fetchWithFallback(url, options = {}) {
  const errors = [];
  
  // Si ya estamos en modo demo, retornar datos demo inmediatamente
  if (pumpFunUseDemo) {
    console.log('[Pump.fun] Using demo mode');
    return { data: generateDemoTokens(), endpoint: 'demo' };
  }
  
  for (let i = 0; i < PUMPFUN_ENDPOINTS.length; i++) {
    const endpointIndex = (currentPumpFunIndex + i) % PUMPFUN_ENDPOINTS.length;
    const endpoint = PUMPFUN_ENDPOINTS[endpointIndex];
    
    try {
      let fetchUrl;
      
      // Si es un proxy CORS, necesitamos codificar la URL
      if (endpoint.includes('allorigins') || endpoint.includes('corsproxy') || endpoint.includes('codetabs')) {
        fetchUrl = `${endpoint}${encodeURIComponent(url)}`;
      } else {
        fetchUrl = url;
      }
      
      console.log(`[Pump.fun] Attempt ${i + 1}/${PUMPFUN_ENDPOINTS.length} with: ${endpoint}`);
      
      const response = await fetch(fetchUrl, {
        ...options,
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Éxito - actualizar índice
      currentPumpFunIndex = endpointIndex;
      pumpFunLastSuccess = Date.now();
      pumpFunUseDemo = false; // Desactivar modo demo si funciona
      
      return { data, endpoint: PUMPFUN_ENDPOINTS[endpointIndex] };
    } catch (error) {
      errors.push(`${endpoint}: ${error.message}`);
      console.error(`[Pump.fun] Failed with ${endpoint}:`, error.message);
    }
  }
  
  // Si todos los endpoints fallan, activar modo demo
  console.warn('[Pump.fun] All endpoints failed, activating demo mode');
  pumpFunUseDemo = true;
  
  return { data: generateDemoTokens(), endpoint: 'demo' };
}

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

    const targetUrl = `https://frontend-api-v2.pump.fun/coins/latest-metadatas?limit=${limit}&offset=${offset}&includeNsfw=false`;
    
    const { data, endpoint } = await fetchWithFallback(targetUrl);
    
    // Guardar en cache
    setCacheData(cacheKey, data);
    
    res.json({
      success: true,
      data: data,
      count: data.length,
      endpoint: endpoint,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[Pump.fun] Error fetching tokens:', error.message);
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

    const targetUrl = `https://frontend-api-v2.pump.fun/coins/${mint}`;
    const { data, endpoint } = await fetchWithFallback(targetUrl);
    
    setCacheData(cacheKey, data);
    
    res.json({
      success: true,
      data: data,
      endpoint: endpoint
    });
  } catch (error) {
    console.error('[Pump.fun] Error fetching token:', error.message);
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

    const targetUrl = `https://frontend-api-v2.pump.fun/coins/${mint}/trades?limit=${limit}`;
    const { data, endpoint } = await fetchWithFallback(targetUrl);
    
    setCacheData(cacheKey, data);
    
    res.json({
      success: true,
      data: data,
      count: data.length,
      endpoint: endpoint
    });
  } catch (error) {
    console.error('[Pump.fun] Error fetching trades:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ENDPOINTS DE RAYDIUM
// ============================================

// Configuración de endpoints para Raydium con múltiples opciones
const RAYDIUM_ENDPOINTS = [
  // Directo (puede tener CORS issues)
  'https://api-v3.raydium.io',
  // Proxies CORS públicos como fallback
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];

let currentRaydiumIndex = 0;
let raydiumLastSuccess = 0;
let raydiumUseDemo = false; // Modo demo si todas las APIs fallan

// Función para rotar entre endpoints de Raydium
function rotateRaydiumEndpoint() {
  currentRaydiumIndex = (currentRaydiumIndex + 1) % RAYDIUM_ENDPOINTS.length;
  console.log(`[Raydium] Rotated to endpoint: ${RAYDIUM_ENDPOINTS[currentRaydiumIndex]}`);
}

// Generar pools demo realistas
function generateDemoPools(count = 50) {
  const symbols = ['RAY', 'ORCA', 'MNGO', 'STEP', 'SRM', 'COPE', 'OXY', 'MAPS', 'MER', 'FRKT', 'PORT', 'SLIM', 'ATLAS', 'POLIS'];
  const pools = [];
  
  for (let i = 0; i < count; i++) {
    const symbolA = symbols[Math.floor(Math.random() * symbols.length)];
    const mintA = Array.from({length: 44}, () => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]).join('');
    
    pools.push({
      id: `pool_${mintA}`,
      mintA: {
        symbol: symbolA,
        mint: mintA,
        decimals: 9
      },
      mintB: {
        symbol: 'SOL',
        mint: 'So11111111111111111111111111111111111111112',
        decimals: 9
      },
      price: Math.random() * 10,
      liquidity: Math.random() * 100000,
      volume24h: Math.random() * 1000000,
      fee24h: Math.random() * 10000,
      apr24h: Math.random() * 100,
      type: 'CLMM',
      status: 'Initialized',
      _demo: true
    });
  }
  
  return pools;
}

// Función auxiliar para hacer fetch con fallback para Raydium
async function fetchRaydiumWithFallback(url, options = {}) {
  const errors = [];
  
  // Si ya estamos en modo demo, retornar datos demo inmediatamente
  if (raydiumUseDemo) {
    console.log('[Raydium] Using demo mode');
    const demoPools = generateDemoPools();
    return { 
      data: { 
        success: true, 
        data: { data: demoPools } 
      }, 
      endpoint: 'demo' 
    };
  }
  
  for (let i = 0; i < RAYDIUM_ENDPOINTS.length; i++) {
    const endpointIndex = (currentRaydiumIndex + i) % RAYDIUM_ENDPOINTS.length;
    const endpoint = RAYDIUM_ENDPOINTS[endpointIndex];
    
    try {
      let fetchUrl;
      
      // Si es un proxy CORS, necesitamos codificar la URL
      if (endpoint.includes('allorigins') || endpoint.includes('corsproxy') || endpoint.includes('codetabs')) {
        fetchUrl = `${endpoint}${encodeURIComponent(url)}`;
      } else {
        fetchUrl = url;
      }
      
      console.log(`[Raydium] Attempt ${i + 1}/${RAYDIUM_ENDPOINTS.length} with: ${endpoint}`);
      
      const response = await fetch(fetchUrl, {
        ...options,
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Éxito - actualizar índice
      currentRaydiumIndex = endpointIndex;
      raydiumLastSuccess = Date.now();
      raydiumUseDemo = false; // Desactivar modo demo si funciona
      
      return { data, endpoint: RAYDIUM_ENDPOINTS[endpointIndex] };
    } catch (error) {
      errors.push(`${endpoint}: ${error.message}`);
      console.error(`[Raydium] Failed with ${endpoint}:`, error.message);
    }
  }
  
  // Si todos los endpoints fallan, activar modo demo
  console.warn('[Raydium] All endpoints failed, activating demo mode');
  raydiumUseDemo = true;
  
  const demoPools = generateDemoPools();
  return { 
    data: { 
      success: true, 
      data: { data: demoPools } 
    }, 
    endpoint: 'demo' 
  };
}

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

    const targetUrl = `https://api-v3.raydium.io/pools/info/list?poolType=${poolType}&poolSortField=${sortField}&sortType=desc&pageSize=${pageSize}&page=${page}`;
    
    const { data, endpoint } = await fetchRaydiumWithFallback(targetUrl);
    
    if (!data.success) {
      throw new Error('Raydium API returned unsuccessful response');
    }
    
    setCacheData(cacheKey, data.data);
    
    res.json({
      success: true,
      data: data.data,
      count: data.data?.data?.length || 0,
      endpoint: endpoint,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[Raydium] Error fetching pools:', error.message);
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

    const targetUrl = `https://api-v3.raydium.io/pools/info/ids?ids=${id}`;
    const { data, endpoint } = await fetchRaydiumWithFallback(targetUrl);
    
    if (!data.success) {
      throw new Error('Raydium API returned unsuccessful response');
    }
    
    setCacheData(cacheKey, data.data);
    
    res.json({
      success: true,
      data: data.data,
      endpoint: endpoint
    });
  } catch (error) {
    console.error('[Raydium] Error fetching pool:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ENDPOINTS DE SOLANA RPC
// ============================================

// Obtener versión de Solana con rotación de RPC y modo demo
app.get('/api/solana/version', async (req, res) => {
  // Si ya estamos en modo demo, retornar datos demo inmediatamente
  if (solanaUseDemo) {
    console.log('[Solana] Using demo mode');
    return res.json({
      success: true,
      data: getSolanaDemoVersion(),
      rpc: 'demo',
      timestamp: Date.now(),
      demo: true
    });
  }

  try {
    const version = await solanaConnection.getVersion();
    
    solanaUseDemo = false; // Desactivar modo demo si funciona
    
    res.json({
      success: true,
      data: version,
      rpc: RPC_ENDPOINTS[currentRpcIndex],
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`[Solana] Error with RPC ${currentRpcIndex}:`, error.message);
    
    // Si es error 403 o fetch, rotar al siguiente RPC
    if (error.message.includes('403') || error.message.includes('Forbidden') || error.message.includes('fetch')) {
      console.log('[Solana] RPC failed, rotating to next RPC...');
      
      // Intentar con todos los RPCs
      for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
        rotateRpc();
        
        try {
          const testConnection = new Connection(RPC_ENDPOINTS[currentRpcIndex], 'confirmed');
          const version = await testConnection.getVersion();
          
          solanaUseDemo = false;
          
          return res.json({
            success: true,
            data: version,
            rpc: RPC_ENDPOINTS[currentRpcIndex],
            timestamp: Date.now(),
            rotated: true
          });
        } catch (retryError) {
          console.error(`[Solana] RPC ${currentRpcIndex} failed:`, retryError.message);
        }
      }
      
      // Si todos los RPCs fallan, activar modo demo
      console.warn('[Solana] All RPCs failed, activating demo mode');
      solanaUseDemo = true;
      
      return res.json({
        success: true,
        data: getSolanaDemoVersion(),
        rpc: 'demo',
        timestamp: Date.now(),
        demo: true,
        warning: 'All RPCs failed, using demo data'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// Obtener balance de una cuenta con rotación de RPC y modo demo
app.get('/api/solana/balance/:address', async (req, res) => {
  const { address } = req.params;
  const cacheKey = `solana_balance_${address}`;
  
  // Si ya estamos en modo demo, retornar datos demo inmediatamente
  if (solanaUseDemo) {
    console.log('[Solana] Using demo mode for balance');
    const demoBalance = getSolanaDemoBalance(address);
    return res.json({
      success: true,
      data: demoBalance,
      demo: true
    });
  }
  
  try {
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
    solanaUseDemo = false;
    
    res.json({
      success: true,
      data: balanceData
    });
  } catch (error) {
    console.error(`[Solana] Error with RPC ${currentRpcIndex}:`, error.message);
    
    // Si es error 403 o fetch, intentar con otros RPCs
    if (error.message.includes('403') || error.message.includes('Forbidden') || error.message.includes('fetch')) {
      console.log('[Solana] RPC failed, trying other RPCs...');
      
      // Intentar con todos los RPCs
      for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
        rotateRpc();
        
        try {
          const testConnection = new Connection(RPC_ENDPOINTS[currentRpcIndex], 'confirmed');
          const pubkey = new PublicKey(address);
          const balance = await testConnection.getBalance(pubkey);
          
          const balanceData = {
            address: address,
            lamports: balance,
            sol: balance / 1e9,
            rpc: RPC_ENDPOINTS[currentRpcIndex]
          };
          
          solanaUseDemo = false;
          
          return res.json({
            success: true,
            data: balanceData,
            rotated: true
          });
        } catch (retryError) {
          console.error(`[Solana] RPC ${currentRpcIndex} failed:`, retryError.message);
        }
      }
      
      // Si todos los RPCs fallan, activar modo demo
      console.warn('[Solana] All RPCs failed for balance, activating demo mode');
      solanaUseDemo = true;
      
      const demoBalance = getSolanaDemoBalance(address);
      return res.json({
        success: true,
        data: demoBalance,
        demo: true,
        warning: 'All RPCs failed, using demo data'
      });
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

// Health check mejorado
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    cache_size: cache.size,
    connections: {
      pumpfun: {
        current_endpoint: PUMPFUN_ENDPOINTS[currentPumpFunIndex],
        last_success: pumpFunLastSuccess,
        available_endpoints: PUMPFUN_ENDPOINTS.length,
        demo_mode: pumpFunUseDemo
      },
      raydium: {
        current_endpoint: RAYDIUM_ENDPOINTS[currentRaydiumIndex],
        last_success: raydiumLastSuccess,
        available_endpoints: RAYDIUM_ENDPOINTS.length,
        demo_mode: raydiumUseDemo
      },
      solana: {
        current_rpc: RPC_ENDPOINTS[currentRpcIndex],
        available_rpcs: RPC_ENDPOINTS.length,
        demo_mode: solanaUseDemo
      }
    },
    message: solanaUseDemo || pumpFunUseDemo || raydiumUseDemo 
      ? 'Some services are in demo mode' 
      : 'All services operational'
  });
});

// Diagnóstico completo de conexiones
app.get('/api/diagnose', async (req, res) => {
  const results = {
    timestamp: Date.now(),
    pumpfun: { status: 'unknown', error: null, endpoint: null, demo: pumpFunUseDemo },
    raydium: { status: 'unknown', error: null, endpoint: null, demo: raydiumUseDemo },
    solana: { status: 'unknown', error: null, rpc: null, demo: solanaUseDemo }
  };

  // Probar Pump.fun
  try {
    const testUrl = 'https://frontend-api-v2.pump.fun/coins/latest-metadatas?limit=1&offset=0';
    const { endpoint } = await fetchWithFallback(testUrl);
    results.pumpfun = { 
      status: 'ok', 
      endpoint: endpoint,
      demo: endpoint === 'demo'
    };
  } catch (error) {
    results.pumpfun = { status: 'error', error: error.message, demo: false };
  }

  // Probar Raydium
  try {
    const testUrl = 'https://api-v3.raydium.io/pools/info/list?poolType=all&poolSortField=default&sortType=desc&pageSize=1&page=1';
    const { endpoint } = await fetchRaydiumWithFallback(testUrl);
    results.raydium = { 
      status: 'ok', 
      endpoint: endpoint,
      demo: endpoint === 'demo'
    };
  } catch (error) {
    results.raydium = { status: 'error', error: error.message, demo: false };
  }

  // Probar Solana
  try {
    await solanaConnection.getVersion();
    results.solana = { 
      status: 'ok', 
      rpc: RPC_ENDPOINTS[currentRpcIndex],
      demo: false
    };
  } catch (error) {
    results.solana = { 
      status: 'error', 
      error: error.message,
      demo: solanaUseDemo
    };
  }

  res.json({
    success: true,
    results: results,
    summary: {
      total_ok: Object.values(results).filter(r => r.status === 'ok').length,
      total_error: Object.values(results).filter(r => r.status === 'error').length,
      total_demo: Object.values(results).filter(r => r.demo).length
    }
  });
});

// Forzar reconexión de Pump.fun
app.post('/api/pumpfun/reconnect', (req, res) => {
  rotatePumpFunEndpoint();
  res.json({
    success: true,
    message: 'Pump.fun endpoint rotated',
    new_endpoint: PUMPFUN_ENDPOINTS[currentPumpFunIndex]
  });
});

// Forzar reconexión de Raydium
app.post('/api/raydium/reconnect', (req, res) => {
  rotateRaydiumEndpoint();
  res.json({
    success: true,
    message: 'Raydium endpoint rotated',
    new_endpoint: RAYDIUM_ENDPOINTS[currentRaydiumIndex]
  });
});

// Forzar reconexión de Solana
app.post('/api/solana/reconnect', (req, res) => {
  rotateRpc();
  res.json({
    success: true,
    message: 'Solana RPC rotated',
    new_rpc: RPC_ENDPOINTS[currentRpcIndex]
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
      node_version: process.version,
      connections: {
        pumpfun: {
          current_endpoint: PUMPFUN_ENDPOINTS[currentPumpFunIndex],
          last_success: pumpFunLastSuccess,
          available_endpoints: PUMPFUN_ENDPOINTS.length
        },
        raydium: {
          current_endpoint: RAYDIUM_ENDPOINTS[currentRaydiumIndex],
          last_success: raydiumLastSuccess,
          available_endpoints: RAYDIUM_ENDPOINTS.length
        },
        solana: {
          current_rpc: RPC_ENDPOINTS[currentRpcIndex],
          available_rpcs: RPC_ENDPOINTS.length
        }
      }
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
║   - POST /api/pumpfun/reconnect                           ║
║   - GET  /api/raydium/pools                               ║
║   - GET  /api/raydium/pool/:id                            ║
║   - POST /api/raydium/reconnect                           ║
║   - GET  /api/solana/version                              ║
║   - GET  /api/solana/balance/:address                     ║
║   - GET  /api/solana/token/:mint                          ║
║   - POST /api/solana/reconnect                            ║
║   - GET  /api/health                                      ║
║   - GET  /api/diagnose                                    ║
║   - GET  /api/stats                                       ║
║   - POST /api/cache/clear                                 ║
║                                                           ║
║   🔧 Configuración:                                       ║
║   - Puerto: ${PORT}                                       ║
║   - RPC: ${process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'}
║                                                           ║
║   🔄 Sistema de Fallback Activo:                          ║
║   - Pump.fun: ${PUMPFUN_ENDPOINTS.length} endpoints       ║
║   - Raydium: ${RAYDIUM_ENDPOINTS.length} endpoints        ║
║   - Solana: ${RPC_ENDPOINTS.length} RPCs                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
