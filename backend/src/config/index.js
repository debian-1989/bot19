/**
 * Módulo de Configuración Centralizado
 * 
 * Valida todas las variables de entorno al inicio
 * No permite que el bot arranque con configuración inválida
 */

require('dotenv').config();

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

class Config {
  constructor() {
    this.validate();
  }

  validate() {
    console.log('[Config] Validando configuración...');

    this.networkMode = process.env.NETWORK_MODE || 'both';
    if (!['solana', 'bitcoin', 'both'].includes(this.networkMode)) {
      throw new ConfigError(`NETWORK_MODE inválido: ${this.networkMode}. Debe ser solana, bitcoin o both`);
    }

    // Validar modo de trading
    this.tradingMode = process.env.TRADING_MODE || 'paper';
    if (!['paper', 'live'].includes(this.tradingMode)) {
      throw new ConfigError(`TRADING_MODE inválido: ${this.tradingMode}. Debe ser 'paper' o 'live'`);
    }

    // Validar ENABLE_LIVE_TRADING
    this.enableLiveTrading = process.env.ENABLE_LIVE_TRADING === 'true';
    if (this.tradingMode === 'live' && !this.enableLiveTrading) {
      throw new ConfigError('TRADING_MODE=live requiere ENABLE_LIVE_TRADING=true');
    }

    // Validar RPC URLs
    this.solanaRpcUrl = process.env.SOLANA_RPC_URL || '';
    if (this.networkMode !== 'bitcoin' && !this.solanaRpcUrl) {
      throw new ConfigError('SOLANA_RPC_URL es obligatorio cuando NETWORK_MODE no es bitcoin');
    }

    if (this.solanaRpcUrl && !this.solanaRpcUrl.startsWith('http://') && !this.solanaRpcUrl.startsWith('https://')) {
      throw new ConfigError('SOLANA_RPC_URL debe ser una URL HTTP/HTTPS válida');
    }

    // Validar API key si está presente
    if (this.solanaRpcUrl.includes('api-key=') && this.solanaRpcUrl.includes('TU_API_KEY')) {
      throw new ConfigError('Debes reemplazar TU_API_KEY con tu API key real de Helius');
    }

    this.solanaWsUrl = process.env.SOLANA_WS_URL || '';
    if (this.solanaWsUrl && !this.solanaWsUrl.startsWith('ws://') && !this.solanaWsUrl.startsWith('wss://')) {
      throw new ConfigError('SOLANA_WS_URL debe ser una URL WebSocket válida');
    }

    // RPCs de respaldo (opcionales)
    this.solanaRpcFallback = process.env.SOLANA_RPC_FALLBACK_URL;
    this.solanaWsFallback = process.env.SOLANA_WS_FALLBACK_URL;

    // Validar programa Pump.fun
    this.pumpProgramId = process.env.PUMP_PROGRAM_ID || '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

    // Validar wallet (solo si live trading está habilitado)
    this.walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
    if (this.tradingMode === 'live' && this.enableLiveTrading && !this.walletPrivateKey) {
      throw new ConfigError('WALLET_PRIVATE_KEY es obligatorio para live trading');
    }

    // NO validar que la wallet exista en paper mode
    // La wallet es opcional en paper mode

    // Límites de riesgo
    this.minWalletBalance = parseFloat(process.env.MIN_WALLET_BALANCE || '0.1');
    this.dailyLossLimit = parseFloat(process.env.DAILY_LOSS_LIMIT || '1.0');
    this.maxTradeAmount = parseFloat(process.env.MAX_TRADE_AMOUNT || '0.5');
    this.maxSlippagePercent = parseFloat(process.env.MAX_SLIPPAGE_PERCENT || '15');
    this.defaultSlippagePercent = parseFloat(process.env.DEFAULT_SLIPPAGE_PERCENT || '5');
    this.maxPriorityFee = parseInt(process.env.MAX_PRIORITY_FEE || '1000000');
    this.defaultPriorityFee = parseInt(process.env.DEFAULT_PRIORITY_FEE || '50000');
    this.gasStrategy = process.env.GAS_STRATEGY || 'fast';
    if (!['standard', 'fast', 'instant'].includes(this.gasStrategy)) {
      throw new ConfigError('GAS_STRATEGY inválida. Debe ser standard, fast o instant');
    }
    this.priorityFees = {
      standard: parseInt(process.env.STANDARD_PRIORITY_FEE || '5000'),
      fast: parseInt(process.env.FAST_PRIORITY_FEE || '50000'),
      instant: parseInt(process.env.INSTANT_PRIORITY_FEE || '250000')
    };
    this.selectedPriorityFee = Math.min(this.priorityFees[this.gasStrategy], this.maxPriorityFee);

    // Detección y filtros
    this.minDetectedBuySize = parseFloat(process.env.MIN_DETECTED_BUY_SIZE || '0.01');
    this.maxDetectedBuySize = parseFloat(process.env.MAX_DETECTED_BUY_SIZE || '5.0');
    this.minLiquidity = parseFloat(process.env.MIN_LIQUIDITY || '0.5');
    this.maxMarketCap = parseFloat(process.env.MAX_MARKET_CAP || '50000');

    // Filtro inteligente local: score explicable, sin llamadas externas.
    this.aiQualityFilterEnabled = process.env.AI_QUALITY_FILTER_ENABLED !== 'false';
    this.aiMinQualityScore = Math.min(100, Math.max(0, parseFloat(process.env.AI_MIN_QUALITY_SCORE || '72')));
    this.aiMinLiquiditySol = Math.max(0, parseFloat(process.env.AI_MIN_LIQUIDITY_SOL || '3'));

    // Estrategia de salida
    this.takeProfitMultiplier = parseFloat(process.env.TAKE_PROFIT_MULTIPLIER || '2.0');
    this.stopLossPercent = parseFloat(process.env.STOP_LOSS_PERCENT || '30');
    this.trailingStopActivation = parseFloat(process.env.TRAILING_STOP_ACTIVATION || '50');
    this.trailingStopPercent = parseFloat(process.env.TRAILING_STOP_PERCENT || '15');
    this.timeBasedExit = parseInt(process.env.TIME_BASED_EXIT || '300');
    this.profitTimeExit = parseInt(process.env.PROFIT_TIME_EXIT || '180');
    this.maxLossPerTrade = parseFloat(process.env.MAX_LOSS_PER_TRADE || '0.05');

    // Gestión de posiciones
    this.maxConcurrentTrades = parseInt(process.env.MAX_CONCURRENT_TRADES || '10');
    this.tradeAmount = parseFloat(process.env.TRADE_AMOUNT || '0.1');

    // Backend
    this.port = parseInt(process.env.PORT || '3001');
    this.corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');

    // Logs
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.debug = process.env.DEBUG === 'true';

    // Confirmaciones
    this.commitmentProcessed = process.env.SOLANA_COMMITMENT_PROCESSED || 'processed';
    this.commitmentConfirm = process.env.SOLANA_COMMITMENT_CONFIRM || 'confirmed';
    this.commitmentFinalized = process.env.SOLANA_COMMITMENT_FINALIZED || 'finalized';

    console.log('[Config] ✅ Configuración válida');
    console.log(`[Config] Modo: ${this.tradingMode}`);
    console.log(`[Config] Live trading: ${this.enableLiveTrading ? 'HABILITADO' : 'DESACTIVADO'}`);
    console.log(`[Config] RPC: ${this.solanaRpcUrl.substring(0, 50)}...`);
  }

  isPaperMode() {
    return this.tradingMode === 'paper';
  }

  isLiveMode() {
    return this.tradingMode === 'live' && this.enableLiveTrading;
  }

  canTrade() {
    return this.isLiveMode() && this.walletPrivateKey;
  }

  // Redactar información sensible para logs
  toSafeObject() {
    return {
      tradingMode: this.tradingMode,
      enableLiveTrading: this.enableLiveTrading,
      networkMode: this.networkMode,
      solanaRpcUrl: this.solanaRpcUrl ? this.solanaRpcUrl.substring(0, 50) + '...' : 'No requerido',
      solanaWsUrl: this.solanaWsUrl ? 'Configurada' : 'No configurada',
      pumpProgramId: this.pumpProgramId,
      walletConfigured: !!this.walletPrivateKey,
      port: this.port,
      maxConcurrentTrades: this.maxConcurrentTrades,
      tradeAmount: this.tradeAmount,
      gasStrategy: this.gasStrategy,
      priorityFee: this.selectedPriorityFee,
      aiQualityFilterEnabled: this.aiQualityFilterEnabled,
      aiMinQualityScore: this.aiMinQualityScore,
      aiMinLiquiditySol: this.aiMinLiquiditySol,
      // NO incluir walletPrivateKey, API keys, etc.
    };
  }
}

// Singleton
let configInstance = null;

function getConfig() {
  if (!configInstance) {
    configInstance = new Config();
  }
  return configInstance;
}

module.exports = { getConfig, ConfigError };
