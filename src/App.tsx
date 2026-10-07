import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BotConfig, DetectedTransaction, Trade, BotStats, TabType } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LiveMonitor from './components/LiveMonitor';
import BotConfigPanel from './components/BotConfigPanel';
import TradeHistory from './components/TradeHistory';
import WalletPanel from './components/WalletPanel';
import TestingPanel from './components/TestingPanel';
import ConnectionStatus from './components/ConnectionStatus';
import { pumpFunRealService, PumpFunToken } from './services/pumpfun-real';
import { raydiumService, RaydiumToken } from './services/raydium';
import { binanceBitcoinService, BitcoinMarketToken, BitcoinServiceStatus } from './services/binance-btc';

const defaultConfig: BotConfig = {
  executionMode: 'demo',
  entryPlatform: 'both',
  graduatedOnly: true,
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  walletAddress: '',
  tradeAmount: 0.1,
  maxConcurrentTrades: 10,
  takeProfitMultiplier: 2,
  stopLossPercent: 30,
  trailingStopPercent: 15,
  trailingStopActivation: 50,
  timeBasedExit: 300,
  maxLossPerTrade: 0.05,
  profitTimeExit: 180,
  minDetectedBuySize: 0.01,
  maxDetectedBuySize: 5,
  slippage: 15,
  priorityFee: 50000,
  autoSnipe: true,
  minLiquidity: 0.5,
  maxMarketCap: 50000,
  maxEntryImpactPercent: 5,
  aiQualityFilterEnabled: true,
  aiMinQualityScore: 72,
  minTokenAgeSeconds: 5,
  minRaydiumVolume: 0.1,
  gasStrategy: 'fast',
  jitoBundle: true,
  bitcoinTradeAmountUsd: 20,
  maxBitcoinSpreadPercent: 0.25,
  bitcoinFeeRate: 0.001,
  bitcoinTradingDirection: 'both',
  bitcoinTrendFilter: true,
  bitcoinRiskEngine: true,
  bitcoinStopLossPercent: 0.45,
  bitcoinTakeProfitPercent: 0.90,
  bitcoinBreakEvenTriggerPercent: 0.35,
  bitcoinTrailingAtrMultiplier: 1.5,
  bitcoinExitOnTrendFlip: true,
  aiTradingEnabled: false,
  aiPairs: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT'],
  aiEntryPrices: { BTCUSDT: 0, ETHUSDT: 0, SOLUSDT: 0, BNBUSDT: 0, DOGEUSDT: 0 },
  aiEntryTolerancePercent: 0.10,
  aiStopLossPercent: 0.60,
  aiTakeProfitPercent: 1.20,
  aiMaxPositionsPerPair: 1,
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const randomAddress = () => {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const PAPER_COMPUTE_UNITS = 200_000;

const estimatePaperFee = (config: BotConfig) =>
  0.000005 + (config.priorityFee * PAPER_COMPUTE_UNITS) / 1_000_000_000_000_000;

const estimateBitcoinPaperFee = (config: BotConfig, quoteAmount: number) =>
  quoteAmount * Math.max(0, config.bitcoinFeeRate);

const estimatePriceImpact = (candidate: {
  platform: 'pump.fun' | 'raydium' | 'bitcoin';
  token: PumpFunToken | RaydiumToken | BitcoinMarketToken;
}, solAmount: number) => {
  if (candidate.platform === 'bitcoin') {
    const token = candidate.token as BitcoinMarketToken;
    return Math.min(0.05, (token.spreadPercent / 100) + (0.001 / Math.max(token.liquidity / Math.max(solAmount, 1), 1)));
  }
  if (candidate.platform === 'pump.fun') {
    const token = candidate.token as PumpFunToken;
    const reserveSol = token.virtual_sol_reserves > 1_000_000
      ? token.virtual_sol_reserves / 1_000_000_000
      : token.virtual_sol_reserves;
    return Math.min(0.5, solAmount / Math.max(reserveSol, solAmount * 2));
  }

  const token = candidate.token as RaydiumToken;
  return Math.min(0.5, solAmount / Math.max(token.liquidity || 0, solAmount * 2));
};

type Candidate = {
  token: PumpFunToken | RaydiumToken | BitcoinMarketToken;
  platform: 'pump.fun' | 'raydium' | 'bitcoin';
  price: number;
};

const getTimestampMs = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value < 10_000_000_000 ? value * 1000 : value;
};

const evaluateCandidate = (candidate: Candidate, config: BotConfig, amount: number) => {
  const token = candidate.token;
  if (candidate.platform === 'pump.fun') {
    const pumpToken = token as PumpFunToken;
    if (config.aiQualityFilterEnabled && typeof pumpToken.qualityScore === 'number' && pumpToken.qualityScore < config.aiMinQualityScore) {
      return { accepted: false, reason: `score IA ${pumpToken.qualityScore}/100 < mínimo ${config.aiMinQualityScore}` };
    }
  }
  if (candidate.platform === 'bitcoin') {
    const btc = token as BitcoinMarketToken;
    if (!btc.price || btc.price <= 0) return { accepted: false, reason: 'precio BTC no disponible' };
    if (btc.spreadPercent > config.maxBitcoinSpreadPercent) return { accepted: false, reason: `spread BTC ${btc.spreadPercent.toFixed(3)}% > máximo ${config.maxBitcoinSpreadPercent}%` };
    return { accepted: true, reason: '', liquidity: btc.liquidity, marketCap: 0, volume: btc.dailyVolume, ageSeconds: 0, impactPercent: btc.spreadPercent };
  }
  const liquidity = candidate.platform === 'pump.fun'
    ? ((token as PumpFunToken).virtual_sol_reserves > 1_000_000
      ? (token as PumpFunToken).virtual_sol_reserves / 1_000_000_000
      : (token as PumpFunToken).virtual_sol_reserves)
    : Number((token as RaydiumToken).liquidity || 0);
  const marketCap = candidate.platform === 'pump.fun'
    ? Number((token as PumpFunToken).usd_market_cap || (token as PumpFunToken).market_cap || 0)
    : Number((token as RaydiumToken).market_cap_usd || (token as RaydiumToken).market_cap || 0);
  const volume = candidate.platform === 'raydium'
    ? Number((token as RaydiumToken).daily_volume || 0)
    : 0;
  const timestamp = candidate.platform === 'pump.fun'
    ? (token as PumpFunToken).created_timestamp
    : (token as RaydiumToken).create_time;
  const timestampMs = getTimestampMs(timestamp);
  const ageSeconds = timestampMs > 0 ? Math.max(0, (Date.now() - timestampMs) / 1000) : 0;
  const impactPercent = estimatePriceImpact(candidate, amount) * 100;

  if (liquidity < config.minLiquidity) return { accepted: false, reason: `liquidez ${liquidity.toFixed(3)} < mínimo ${config.minLiquidity}` };
  if (config.maxMarketCap > 0 && marketCap > config.maxMarketCap) return { accepted: false, reason: `market cap ${marketCap.toFixed(0)} > máximo ${config.maxMarketCap}` };
  if (timestampMs > 0 && ageSeconds < config.minTokenAgeSeconds) return { accepted: false, reason: `token demasiado nuevo (${ageSeconds.toFixed(0)}s)` };
  if (candidate.platform === 'raydium' && volume < config.minRaydiumVolume) return { accepted: false, reason: `volumen Raydium ${volume.toFixed(3)} < mínimo ${config.minRaydiumVolume}` };
  if (impactPercent > config.maxEntryImpactPercent) return { accepted: false, reason: `impacto ${impactPercent.toFixed(2)}% > máximo ${config.maxEntryImpactPercent}%` };

  return { accepted: true, reason: '', liquidity, marketCap, volume, ageSeconds, impactPercent };
};

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [config, setConfig] = useState<BotConfig>(() => {
    const saved = localStorage.getItem('botConfig');
    if (!saved) return defaultConfig;
    const parsed = JSON.parse(saved);
    if ('privateKey' in parsed) delete parsed.privateKey;
    return { ...defaultConfig, ...parsed };
  });
  const [isRunning, setIsRunning] = useState(false);
  const [detectedTxns, setDetectedTxns] = useState<DetectedTransaction[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<BotStats>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfit: 0,
    winRate: 0,
    avgProfitPerTrade: 0,
    bestTrade: 0,
    worstTrade: 0,
    totalVolume: 0,
    activeSince: new Date(),
  });
  const [solBalance, setSolBalance] = useState(0.5);
  const [usdBalance, setUsdBalance] = useState(1000);
  const usdBalanceRef = useRef(usdBalance);
  const [logs, setLogs] = useState<string[]>([]);
  const [realTokens, setRealTokens] = useState<PumpFunToken[]>([]);
  const [raydiumTokens, setRaydiumTokens] = useState<RaydiumToken[]>([]);
  const [bitcoinToken, setBitcoinToken] = useState<BitcoinMarketToken>(binanceBitcoinService.getToken());
  const [bitcoinTokens, setBitcoinTokens] = useState<BitcoinMarketToken[]>(binanceBitcoinService.getTokens());
  const [bitcoinStatus, setBitcoinStatus] = useState<BitcoinServiceStatus>(binanceBitcoinService.getStatus());
  
  const configRef = useRef(config);
  const tradesRef = useRef(trades);
  const solBalanceRef = useRef(solBalance);
  const tokensRef = useRef<PumpFunToken[]>([]);
  const raydiumTokensRef = useRef<RaydiumToken[]>([]);
  const bitcoinTokenRef = useRef(bitcoinToken);
  const bitcoinTokensRef = useRef(bitcoinTokens);
  const processedTokenKeysRef = useRef<Set<string>>(new Set());
  const qualityLogRef = useRef<Map<string, number>>(new Map());
  const lastBitcoinEntryRef = useRef(0);
  const bitcoinHighWaterRef = useRef<Map<string, number>>(new Map());
  const bitcoinPeakMoveRef = useRef<Map<string, number>>(new Map());
  
  useEffect(() => {
    configRef.current = config;
    tradesRef.current = trades;
    solBalanceRef.current = solBalance;
    usdBalanceRef.current = usdBalance;
    tokensRef.current = realTokens;
    raydiumTokensRef.current = raydiumTokens;
    bitcoinTokenRef.current = bitcoinToken;
    bitcoinTokensRef.current = bitcoinTokens;
  }, [config, trades, solBalance, usdBalance, realTokens, raydiumTokens, bitcoinToken, bitcoinTokens]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 100));
  }, []);

  // Suscribirse a actualizaciones de tokens reales de pump.fun
  useEffect(() => {
    const unsubscribe = pumpFunRealService.onTokensUpdate((tokens) => {
      setRealTokens(tokens);
    });

    // Suscribirse específicamente a tokens NUEVOS
    const unsubscribeNew = pumpFunRealService.onNewTokens((newTokens) => {
      addLog(`🆕 ${newTokens.length} token(s) NUEVO(S) detectado(s) en pump.fun`);
    });

    return () => {
      unsubscribe();
      unsubscribeNew();
    };
  }, [addLog]);

  // Suscribirse a actualizaciones de tokens de Raydium
  useEffect(() => {
    const unsubscribe = raydiumService.onTokensUpdate((tokens) => {
      setRaydiumTokens(tokens);
      addLog(`🌊 Actualizados ${tokens.length} tokens de Raydium Launchpad`);
    });

    return () => {
      unsubscribe();
    };
  }, [addLog]);

  useEffect(() => {
    return binanceBitcoinService.onTokenUpdate(token => setBitcoinToken(token));
  }, []);

  useEffect(() => {
    return binanceBitcoinService.onTokensUpdate(tokens => setBitcoinTokens(tokens));
  }, []);

  useEffect(() => {
    return binanceBitcoinService.onStatusUpdate(status => setBitcoinStatus(status));
  }, []);

  // Simular detección de compras usando tokens reales de Solana y Bitcoin
  useEffect(() => {
    if (!isRunning) return;

    console.log('[App] Detection useEffect started');

    // Aumentar frecuencia de detección: 0.05-0.2 segundos (antes 0.2-0.8s)
    const interval = setInterval(() => {
      const currentConfig = configRef.current;
      const currentTrades = tradesRef.current;
      const currentBalance = solBalanceRef.current;
      const currentPumpTokens = tokensRef.current;
      const currentRaydiumTokens = raydiumTokensRef.current;
      const currentBitcoinToken = bitcoinTokenRef.current;
      const currentBitcoinTokens = bitcoinTokensRef.current;

      console.log('[App] Detection interval triggered', {
        pumpTokens: currentPumpTokens.length,
        raydiumTokens: currentRaydiumTokens.length,
        bitcoinPrice: currentBitcoinToken.price,
      });

      const candidates: Candidate[] = [
        ...currentPumpTokens.map(token => ({ token, platform: 'pump.fun' as const, price: pumpFunRealService.calculateTokenPrice(token) })),
        ...currentRaydiumTokens.map(token => ({ token, platform: 'raydium' as const, price: token.price || 0 })),
        ...currentBitcoinTokens.map(token => ({ token, platform: 'bitcoin' as const, price: token.price })),
      ].filter(candidate => {
        const selected = currentConfig.entryPlatform;
        const allowed = selected === 'all' || selected === 'both' && candidate.platform !== 'bitcoin' || selected === 'solana' && candidate.platform !== 'bitcoin' || selected === candidate.platform;
        if (!allowed) return false;
        if (currentConfig.graduatedOnly && candidate.platform === 'pump.fun' && !(candidate.token as PumpFunToken).complete) return false;
        if (candidate.platform === 'bitcoin') {
          const aiPair = candidate.token.mint;
          const configuredEntry = currentConfig.aiEntryPrices[aiPair] || 0;
          const tolerance = Math.max(0.01, currentConfig.aiEntryTolerancePercent);
          const atConfiguredPrice = configuredEntry <= 0 || Math.abs(candidate.price - configuredEntry) / configuredEntry * 100 <= tolerance;
          if (currentConfig.aiTradingEnabled && !atConfiguredPrice) return false;
          if (currentConfig.bitcoinTrendFilter && (!candidate.token.trendReady || candidate.token.trendDirection === 'neutral')) return false;
          const openForPair = currentTrades.filter(trade => trade.status === 'open' && trade.tokenAddress === aiPair).length;
          return openForPair < (currentConfig.aiTradingEnabled ? currentConfig.aiMaxPositionsPerPair : 1) && Date.now() - lastBitcoinEntryRef.current >= 1000;
        }
        return !processedTokenKeysRef.current.has(`${candidate.platform}:${candidate.token.mint}`);
      });

      if (candidates.length === 0) {
        return;
      }

      // Procesar un lote completo. El capital local se actualiza en cada entrada
      // para que varias órdenes del mismo ciclo no sobrepasen el saldo real.
      let localOpenTrades = currentTrades.filter((t: Trade) => t.status === 'open').length;
      let localAvailableCapital = currentBalance;
      let localAvailableUsd = usdBalanceRef.current;
      const minEntry = currentConfig.tradeAmount * 0.1;

      for (const candidate of candidates) {
        if (!currentConfig.autoSnipe) break;
        if (localOpenTrades >= currentConfig.maxConcurrentTrades) break;

        const token = candidate.token;
        const platform = candidate.platform;
        const realPrice = candidate.price;
        const tokenKey = `${platform}:${token.mint}`;
        if (realPrice <= 0) {
          processedTokenKeysRef.current.add(tokenKey);
          continue;
        }

        const quoteAmount = platform === 'bitcoin' ? currentConfig.bitcoinTradeAmountUsd : currentConfig.tradeAmount;
        const marketBitcoinToken = platform === 'bitcoin' ? token as BitcoinMarketToken : currentBitcoinToken;
        const direction: 'long' | 'short' = platform === 'bitcoin'
          ? currentConfig.bitcoinTradingDirection === 'short'
            ? 'short'
            : currentConfig.bitcoinTradingDirection === 'long'
              ? 'long'
              : currentConfig.bitcoinTrendFilter && marketBitcoinToken.trendReady
                ? marketBitcoinToken.trendDirection as 'long' | 'short'
                : marketBitcoinToken.priceChangePercent < 0 ? 'short' : 'long'
          : 'long';
        if (platform === 'bitcoin' && currentConfig.bitcoinTrendFilter && direction !== marketBitcoinToken.trendDirection) continue;
        const quality = evaluateCandidate(candidate, currentConfig, quoteAmount);
        if (!quality.accepted) {
          const lastLogged = qualityLogRef.current.get(tokenKey) || 0;
          if (Date.now() - lastLogged > 10_000) {
            addLog(`⛔ Rechazado $${token.symbol} (${platform}): ${quality.reason}`);
            qualityLogRef.current.set(tokenKey, Date.now());
          }
          continue;
        }

        const buyAmount = Number(quoteAmount.toFixed(platform === 'bitcoin' ? 2 : 3));
        const newTx: DetectedTransaction = {
          id: generateId(), timestamp: new Date(), buyerAddress: randomAddress(),
          tokenAddress: token.mint, tokenName: token.name, tokenSymbol: token.symbol,
          buyAmount, estimatedPrice: realPrice, status: 'detected', platform, quoteCurrency: platform === 'bitcoin' ? 'USDT' : 'SOL', direction,
        };
        setDetectedTxns(prev => [newTx, ...prev].slice(0, 100));
        const platformIcon = platform === 'pump.fun' ? '🎯' : platform === 'raydium' ? '🌊' : '₿';
        addLog(`${platformIcon} Detectada: ${buyAmount} ${platform === 'bitcoin' ? 'USDT' : 'SOL'} en $${token.symbol} (${platform}${platform === 'bitcoin' ? `, ${direction.toUpperCase()}` : ''})`);

        const entryFee = platform === 'bitcoin' ? estimateBitcoinPaperFee(currentConfig, quoteAmount) : estimatePaperFee(currentConfig);
        const available = platform === 'bitcoin' ? localAvailableUsd : localAvailableCapital;
        const snipeAmount = Math.min(quoteAmount, Math.max(0, (available - entryFee) * 0.95));
        if (snipeAmount < (platform === 'bitcoin' ? quoteAmount * 0.1 : minEntry)) break;

        // Estimar una ejecución realista: impacto de liquidez + una fracción
        // conservadora del slippage permitido, sin inventar un precio aleatorio.
        const impact = estimatePriceImpact(candidate, snipeAmount);
        const simulatedSlippage = currentConfig.slippage > 0
          ? Math.min(currentConfig.slippage / 100, Math.max(0.0005, impact * 0.5))
          : 0;
        const ourBuyPrice = direction === 'short'
          ? realPrice * Math.max(0, 1 - impact - simulatedSlippage)
          : realPrice * (1 + impact + simulatedSlippage);
        const tokenAmount = snipeAmount / ourBuyPrice;
        const bitcoinAtr = platform === 'bitcoin' ? currentBitcoinToken.atrPercent : 0;
        const bitcoinStopPercent = Math.max(platform === 'bitcoin' && currentConfig.aiTradingEnabled ? currentConfig.aiStopLossPercent : currentConfig.bitcoinStopLossPercent, bitcoinAtr * 1.5);
        const bitcoinTargetPercent = Math.max(platform === 'bitcoin' && currentConfig.aiTradingEnabled ? currentConfig.aiTakeProfitPercent : currentConfig.bitcoinTakeProfitPercent, bitcoinAtr * 2.5);
        const riskStopPrice = platform === 'bitcoin'
          ? direction === 'short' ? ourBuyPrice * (1 + bitcoinStopPercent / 100) : ourBuyPrice * (1 - bitcoinStopPercent / 100)
          : undefined;
        const riskTargetPrice = platform === 'bitcoin'
          ? direction === 'short' ? ourBuyPrice * (1 - bitcoinTargetPercent / 100) : ourBuyPrice * (1 + bitcoinTargetPercent / 100)
          : undefined;
        processedTokenKeysRef.current.add(tokenKey);
        if (platform === 'bitcoin') lastBitcoinEntryRef.current = Date.now();
        if (platform === 'bitcoin') localAvailableUsd -= snipeAmount + entryFee;
        else localAvailableCapital -= snipeAmount + entryFee;
        localOpenTrades += 1;

        const currency = platform === 'bitcoin' ? 'USDT' : 'SOL';
        addLog(`⚡ PAPER ${direction === 'short' ? 'SHORT SELL' : 'BUY'}: ${snipeAmount.toFixed(platform === 'bitcoin' ? 2 : 3)} ${currency} en $${token.symbol} | impacto ${(impact * 100).toFixed(2)}% | fee ${entryFee.toFixed(platform === 'bitcoin' ? 4 : 6)} ${currency}`);
        const newTrade: Trade = {
          id: generateId(), timestamp: new Date(), tokenAddress: token.mint,
          tokenName: token.name, tokenSymbol: token.symbol, platform, buyAmount: snipeAmount,
          buyPrice: ourBuyPrice, tokenAmount, lastMarketPrice: realPrice, entryFee,
          quoteCurrency: platform === 'bitcoin' ? 'USDT' : 'SOL', direction, status: 'open',
          riskStopPrice, riskTargetPrice,
        };

        setTrades(prev => [newTrade, ...prev]);
        if (platform === 'bitcoin') { setUsdBalance(prev => prev - snipeAmount - entryFee); usdBalanceRef.current = localAvailableUsd; }
        else { setSolBalance(prev => prev - snipeAmount - entryFee); solBalanceRef.current = localAvailableCapital; }
        tradesRef.current = [newTrade, ...tradesRef.current];
        setDetectedTxns(prev => prev.map(tx => tx.id === newTx.id ? { ...tx, status: 'sniped' as const, ourBuyPrice } : tx));
      }

      if (localOpenTrades >= currentConfig.maxConcurrentTrades) {
        addLog(`⏳ Máx posiciones (${localOpenTrades}/${currentConfig.maxConcurrentTrades}); candidatos restantes quedan en cola`);
      } else if (localAvailableCapital < minEntry && localAvailableUsd < currentConfig.bitcoinTradeAmountUsd * 0.1) {
        addLog(`⏳ Capital bajo: ${localAvailableCapital.toFixed(4)} SOL; candidatos restantes quedan en cola`);
      }
    }, Math.random() * 150 + 50); // 0.05-0.2 segundos (antes 0.2-0.8s)

    return () => clearInterval(interval);
  }, [isRunning, addLog]);

  // Monitor de posiciones abiertas
  useEffect(() => {
    if (!isRunning) return;

    const monitorInterval = setInterval(() => {
      const currentConfig = configRef.current;
      const currentTrades = tradesRef.current;
      const currentPumpTokens = tokensRef.current;
      const currentRaydiumTokens = raydiumTokensRef.current;
      const currentBitcoinToken = bitcoinTokenRef.current;
      const currentBitcoinTokens = bitcoinTokensRef.current;
      const now = Date.now();
      
      currentTrades.forEach(trade => {
        if (trade.status !== 'open') return;
        
        const tradeAge = now - trade.timestamp.getTime();
        const maxAge = currentConfig.timeBasedExit * 1000;

        const liveCandidate = trade.platform === 'bitcoin'
          ? currentBitcoinTokens.find(token => token.mint === trade.tokenAddress)
          : trade.platform === 'pump.fun'
            ? currentPumpTokens.find(token => token.mint === trade.tokenAddress)
            : currentRaydiumTokens.find(token => token.mint === trade.tokenAddress);
        const marketPrice = liveCandidate
          ? trade.platform === 'bitcoin'
            ? Number((liveCandidate as BitcoinMarketToken).price || 0)
            : trade.platform === 'pump.fun'
              ? pumpFunRealService.calculateTokenPrice(liveCandidate as PumpFunToken)
              : Number((liveCandidate as RaydiumToken).price || 0)
          : trade.lastMarketPrice;

        // Si el feed dejó de mostrar el token, conservamos el último precio
        // conocido y esperamos al cierre temporal en vez de inventar una cotización.
        if (!marketPrice || marketPrice <= 0) {
          if (tradeAge < maxAge) return;
        } else {
          trade.lastMarketPrice = marketPrice;
        }

        const effectiveMarketPrice = marketPrice || trade.lastMarketPrice || trade.buyPrice;
        const isBitcoin = trade.platform === 'bitcoin';
        const bitcoinLiveToken = isBitcoin ? (liveCandidate as BitcoinMarketToken | undefined) || currentBitcoinToken : currentBitcoinToken;
        const currentMovePercent = isBitcoin
          ? trade.direction === 'short'
            ? ((trade.buyPrice - effectiveMarketPrice) / trade.buyPrice) * 100
            : ((effectiveMarketPrice - trade.buyPrice) / trade.buyPrice) * 100
          : 0;
        if (isBitcoin) {
          const previousWater = bitcoinHighWaterRef.current.get(trade.id);
          const nextWater = trade.direction === 'short'
            ? Math.min(previousWater ?? effectiveMarketPrice, effectiveMarketPrice)
            : Math.max(previousWater ?? effectiveMarketPrice, effectiveMarketPrice);
          bitcoinHighWaterRef.current.set(trade.id, nextWater);
          bitcoinPeakMoveRef.current.set(trade.id, Math.max(bitcoinPeakMoveRef.current.get(trade.id) || 0, currentMovePercent));
        }
        const exitCandidate = liveCandidate
          ? { platform: trade.platform || 'raydium' as const, token: liveCandidate }
          : null;
        const exitImpact = exitCandidate ? estimatePriceImpact(exitCandidate, trade.buyAmount) : 0;
        const exitSlippage = currentConfig.slippage > 0
          ? Math.min(currentConfig.slippage / 100, Math.max(0.0005, exitImpact * 0.5))
          : 0;
        const sellPrice = trade.direction === 'short'
          ? effectiveMarketPrice * (1 + exitImpact + exitSlippage)
          : effectiveMarketPrice * Math.max(0, 1 - exitImpact - exitSlippage);
        const tokenAmount = trade.tokenAmount || trade.buyAmount / Math.max(trade.buyPrice, Number.EPSILON);
        const sellAmount = tokenAmount * sellPrice;
        const exitFee = trade.platform === 'bitcoin' ? estimateBitcoinPaperFee(currentConfig, sellAmount) : estimatePaperFee(currentConfig);
        const profitSOL = trade.direction === 'short'
          ? (trade.buyPrice - sellPrice) * tokenAmount - exitFee - (trade.entryFee || 0)
          : sellAmount - exitFee - trade.buyAmount - (trade.entryFee || 0);
        const investedSOL = trade.buyAmount + (trade.entryFee || 0);
        const profitPercent = investedSOL > 0 ? (profitSOL / investedSOL) * 100 : 0;
        const priceMultiplier = trade.direction === 'short'
          ? trade.buyPrice / Math.max(sellPrice, Number.EPSILON)
          : sellPrice / Math.max(trade.buyPrice, Number.EPSILON);
        const timeExit = tradeAge >= maxAge;
        const bitcoinAtr = isBitcoin ? bitcoinLiveToken.atrPercent : 0;
        const waterPrice = isBitcoin ? bitcoinHighWaterRef.current.get(trade.id) || effectiveMarketPrice : effectiveMarketPrice;
        const trailDistance = isBitcoin ? Math.max(bitcoinAtr * currentConfig.bitcoinTrailingAtrMultiplier, 0.05) / 100 : 0;
        const trailPrice = isBitcoin
          ? trade.direction === 'short' ? waterPrice * (1 + trailDistance) : waterPrice * (1 - trailDistance)
          : effectiveMarketPrice;
        const breakEvenPrice = isBitcoin
          ? trade.direction === 'short' ? trade.buyPrice * (1 + (trade.entryFee || 0) / Math.max(trade.buyAmount, 1)) : trade.buyPrice * (1 + (trade.entryFee || 0) / Math.max(trade.buyAmount, 1))
          : trade.buyPrice;
        const peakMovePercent = isBitcoin ? bitcoinPeakMoveRef.current.get(trade.id) || 0 : 0;
        const breakEvenArmed = isBitcoin && currentConfig.bitcoinRiskEngine && peakMovePercent >= currentConfig.bitcoinBreakEvenTriggerPercent;
        const protectedStopPrice = breakEvenArmed
          ? breakEvenPrice
          : trade.riskStopPrice;
        const stopHit = isBitcoin && currentConfig.bitcoinRiskEngine && (
          trade.direction === 'short' ? effectiveMarketPrice >= (protectedStopPrice || Infinity) : effectiveMarketPrice <= (protectedStopPrice || 0)
        );
        const targetHit = isBitcoin && currentConfig.bitcoinRiskEngine && (
          trade.direction === 'short' ? effectiveMarketPrice <= (trade.riskTargetPrice || 0) : effectiveMarketPrice >= (trade.riskTargetPrice || Infinity)
        );
        const breakEvenHit = breakEvenArmed && (
          trade.direction === 'short' ? effectiveMarketPrice >= breakEvenPrice : effectiveMarketPrice <= breakEvenPrice
        );
        const trailingHit = isBitcoin && currentConfig.bitcoinRiskEngine && peakMovePercent >= currentConfig.bitcoinBreakEvenTriggerPercent && (
          trade.direction === 'short' ? effectiveMarketPrice >= trailPrice : effectiveMarketPrice <= trailPrice
        );
        const trendFlip = isBitcoin && currentConfig.bitcoinRiskEngine && currentConfig.bitcoinExitOnTrendFlip && bitcoinLiveToken.trendReady && bitcoinLiveToken.trendDirection !== 'neutral' && bitcoinLiveToken.trendDirection !== trade.direction;

        let exitReason = '';
        if (targetHit || (!isBitcoin && priceMultiplier >= currentConfig.takeProfitMultiplier)) {
          exitReason = isBitcoin ? `OBJETIVO ATR/RENDIMIENTO a ${currentMovePercent.toFixed(2)}%` : `TOMA DE GANANCIA a ${priceMultiplier.toFixed(2)}x`;
        } else if (breakEvenHit) {
          exitReason = `BREAK-EVEN protegido tras +${currentMovePercent.toFixed(2)}%`;
        } else if (stopHit) {
          exitReason = `STOP ATR a ${currentMovePercent.toFixed(2)}%`;
        } else if (trailingHit) {
          exitReason = `TRAILING ATR tras máximo favorable de ${currentMovePercent.toFixed(2)}%`;
        } else if (trendFlip) {
          exitReason = `SALIDA: cambio de tendencia ${bitcoinLiveToken.trendDirection.toUpperCase()}`;
        } else if (profitPercent <= -currentConfig.stopLossPercent) {
          exitReason = `STOP LOSS a ${profitPercent.toFixed(1)}%`;
        } else if (Math.abs(profitSOL) >= currentConfig.maxLossPerTrade && profitSOL < 0) {
          exitReason = `PÉRDIDA MÁXIMA: ${profitSOL.toFixed(4)} ${trade.quoteCurrency || 'SOL'}`;
        } else if (timeExit) {
          exitReason = `SALIDA POR TIEMPO a precio vivo`;
        } else if (profitPercent >= currentConfig.trailingStopActivation) {
          exitReason = `TRAILING STOP a +${profitPercent.toFixed(1)}%`;
        } else if (tradeAge >= currentConfig.profitTimeExit * 1000 && profitSOL > 0) {
          exitReason = `SALIDA POR GANANCIA tras ${Math.floor(tradeAge / 60000)}m`;
        } else {
          return;
        }

        const closedTrade: Trade = {
          ...trade,
          sellPrice,
          sellAmount,
          exitFee,
          profit: profitSOL,
          profitPercent,
          exitReason,
          status: 'closed',
          txHash: `PAPER-${generateId()}`,
        };

        if (trade.platform === 'bitcoin') {
          const balanceDelta = trade.direction === 'short' ? trade.buyAmount + profitSOL : sellAmount - exitFee;
          setUsdBalance(prev => prev + balanceDelta); usdBalanceRef.current += balanceDelta;
          bitcoinHighWaterRef.current.delete(trade.id);
          bitcoinPeakMoveRef.current.delete(trade.id);
        }
        else { setSolBalance(prev => prev + sellAmount - exitFee); solBalanceRef.current += sellAmount - exitFee; }
        tradesRef.current = tradesRef.current.map(t => t.id === trade.id ? closedTrade : t);
        setTrades(prev => prev.map(t => t.id === trade.id ? closedTrade : t));

        const emoji = profitSOL >= 0 ? '💰' : '🛑';
        addLog(`${emoji} ${exitReason}: $${trade.tokenSymbol} | ${profitSOL >= 0 ? '+' : ''}${profitSOL.toFixed(4)} ${trade.quoteCurrency || 'SOL'} (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(1)}%) | precio vivo`);
      });
    }, 1000);

    return () => clearInterval(monitorInterval);
  }, [isRunning, addLog]);

  // Actualizar estadísticas
  useEffect(() => {
    const closedTrades = trades.filter(t => t.status === 'closed');
    const winners = closedTrades.filter(t => (t.profit || 0) > 0);
    const losers = closedTrades.filter(t => (t.profit || 0) <= 0);
    
    const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalVolume = trades.reduce((sum, t) => sum + t.buyAmount, 0);
    
    setStats({
      totalTrades: closedTrades.length,
      winningTrades: winners.length,
      losingTrades: losers.length,
      totalProfit,
      winRate: closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0,
      avgProfitPerTrade: closedTrades.length > 0 ? totalProfit / closedTrades.length : 0,
      bestTrade: closedTrades.length > 0 ? Math.max(...closedTrades.map(t => t.profitPercent || 0)) : 0,
      worstTrade: closedTrades.length > 0 ? Math.min(...closedTrades.map(t => t.profitPercent || 0)) : 0,
      totalVolume,
      activeSince: new Date(Date.now() - 3600000),
    });
  }, [trades]);

  const toggleBot = () => {
    if (!isRunning && configRef.current.executionMode === 'real') {
      addLog('⛔ Modo real bloqueado: el ejecutor de operaciones reales no está habilitado en esta versión.');
      return;
    }
    const newRunning = !isRunning;
    setIsRunning(newRunning);
    
    if (newRunning) {
      const selectedNetwork = configRef.current.entryPlatform;
      const useSolana = !configRef.current.aiTradingEnabled && selectedNetwork !== 'bitcoin';
      const useBitcoin = configRef.current.aiTradingEnabled || selectedNetwork === 'bitcoin' || selectedNetwork === 'all';
      addLog('🟢 Bot INICIADO');
      if (useSolana) {
        addLog('🔗 Conectando a pump.fun...');
        pumpFunRealService.startPolling(1000); // 1 segundo (antes 5s)
        addLog('✅ Conectado a pump.fun - Obteniendo tokens (polling cada 1s)');
        addLog('🔗 Conectando a Raydium Launchpad...');
        raydiumService.startPolling(5000);
        addLog('✅ Conectado a Raydium - Obteniendo tokens');
      } else {
        addLog('⏸️ Solana desactivada: no se consultarán Pump.fun, Raydium ni Helius');
      }
      if (useBitcoin) {
        const aiSymbols = configRef.current.aiTradingEnabled ? configRef.current.aiPairs : ['BTCUSDT'];
        binanceBitcoinService.startPolling(10000, aiSymbols);
        addLog(`₿ Conectando a Binance | ${aiSymbols.join(', ')} | WebSocket multi-par + REST respaldo 10s`);
        if (configRef.current.aiTradingEnabled) addLog('🤖 Trading con IA Demo activo: espera precios configurados y gestiona stop/take automático');
      }
      addLog(`🚀 Red activa: ${useSolana && useBitcoin ? 'Solana + Bitcoin' : useBitcoin ? 'Bitcoin' : 'Solana'}`);
      addLog('📈 Paper trading realista: precios, liquidez y salidas basadas en datos vivos');
      addLog(`⚡ Detección ultra-rápida | fee estimada por lado: ${estimatePaperFee(configRef.current).toFixed(6)} SOL`);
    } else {
      addLog('🔴 Bot DETENIDO');
      addLog('🔌 Desconectando de pump.fun...');
      pumpFunRealService.stopPolling();
      addLog('🔌 Desconectando de Raydium...');
      raydiumService.stopPolling();
      binanceBitcoinService.stopPolling();
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isRunning={isRunning} />
      
      <main className="flex-1 overflow-auto">
        <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              🎯 PumpFun Sniper Bot
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isRunning ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-red-500/20 text-red-400'}`}>
              {isRunning ? '● EJECUTANDO' : '● DETENIDO'}
            </span>
            {(realTokens.length > 0 || raydiumTokens.length > 0 || bitcoinToken.price > 0) && (
              <div className="flex gap-2">
                {realTokens.length > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
                    🎯 {realTokens.length} pump.fun
                  </span>
                )}
                {raydiumTokens.length > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">
                    🌊 {raydiumTokens.length} raydium
                  </span>
                )}
                {bitcoinToken.price > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300">
                    ₿ BTC ${bitcoinToken.price.toFixed(2)}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-400">Saldos Demo</p>
              <p className="text-sm font-bold text-yellow-400">{solBalance.toFixed(3)} SOL</p>
              <p className="text-sm font-bold text-orange-300">{usdBalance.toFixed(2)} USDT</p>
              <p className={`text-[10px] font-semibold ${bitcoinStatus.connected ? 'text-green-400' : 'text-red-400'}`}>
                {bitcoinStatus.connected ? '● Binance API conectada' : '● Binance API desconectada'}
              </p>
              {bitcoinToken.trendReady && <p className="text-[10px] text-blue-300">Tendencia: {bitcoinToken.trendDirection.toUpperCase()} · RSI {bitcoinToken.rsi.toFixed(1)}</p>}
            </div>
            <button
              onClick={toggleBot}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                isRunning
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30'
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30'
              }`}
            >
              {isRunning ? '⏹ DETENER BOT' : '▶ INICIAR BOT'}
            </button>
          </div>
        </header>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <Dashboard stats={stats} logs={logs} detectedTxns={detectedTxns} trades={trades} isRunning={isRunning} solBalance={solBalance} usdBalance={usdBalance} />
          )}
          {activeTab === 'monitor' && (
            <LiveMonitor detectedTxns={detectedTxns} isRunning={isRunning} />
          )}
          {activeTab === 'config' && (
            <BotConfigPanel config={config} setConfig={setConfig} isRunning={isRunning} />
          )}
          {activeTab === 'history' && (
            <TradeHistory trades={trades} />
          )}
          {activeTab === 'wallet' && (
            <WalletPanel solBalance={solBalance} usdBalance={usdBalance} bitcoinPrice={bitcoinToken.price} config={config} setConfig={setConfig} />
          )}
          {activeTab === 'testing' && (
            <TestingPanel />
          )}
          {activeTab === 'connections' && (
            <ConnectionStatus />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
