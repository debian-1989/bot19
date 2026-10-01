import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BotConfig, DetectedTransaction, Trade, BotStats, TabType } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LiveMonitor from './components/LiveMonitor';
import BotConfigPanel from './components/BotConfigPanel';
import TradeHistory from './components/TradeHistory';
import WalletPanel from './components/WalletPanel';
import TestingPanel from './components/TestingPanel';
import { pumpFunRealService, PumpFunToken } from './services/pumpfun-real';
import { raydiumService, RaydiumToken } from './services/raydium';

const defaultConfig: BotConfig = {
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  walletAddress: '',
  privateKey: '',
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
  gasStrategy: 'fast',
  jitoBundle: true,
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

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [config, setConfig] = useState<BotConfig>(() => {
    const saved = localStorage.getItem('botConfig');
    return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
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
  const [solBalance, setSolBalance] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  const [realTokens, setRealTokens] = useState<PumpFunToken[]>([]);
  const [raydiumTokens, setRaydiumTokens] = useState<RaydiumToken[]>([]);
  
  const configRef = useRef(config);
  const tradesRef = useRef(trades);
  const solBalanceRef = useRef(solBalance);
  const tokensRef = useRef<PumpFunToken[]>([]);
  const raydiumTokensRef = useRef<RaydiumToken[]>([]);
  
  useEffect(() => {
    configRef.current = config;
    tradesRef.current = trades;
    solBalanceRef.current = solBalance;
    tokensRef.current = realTokens;
    raydiumTokensRef.current = raydiumTokens;
  }, [config, trades, solBalance, realTokens, raydiumTokens]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 100));
  }, []);

  // Suscribirse a actualizaciones de tokens reales de pump.fun
  useEffect(() => {
    const unsubscribe = pumpFunRealService.onTokensUpdate((tokens) => {
      setRealTokens(tokens);
      addLog(`📡 Actualizados ${tokens.length} tokens de pump.fun`);
    });

    return () => {
      unsubscribe();
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

  // Simular detección de compras usando tokens reales de pump.fun y Raydium
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const currentConfig = configRef.current;
      const currentTrades = tradesRef.current;
      const currentBalance = solBalanceRef.current;
      const currentPumpTokens = tokensRef.current;
      const currentRaydiumTokens = raydiumTokensRef.current;

      // Combinar tokens de ambas plataformas
      const totalTokens = currentPumpTokens.length + currentRaydiumTokens.length;
      
      // Si no hay tokens de ninguna plataforma, esperar
      if (totalTokens === 0) {
        return;
      }

      // Decidir de qué plataforma obtener el token (50/50 o proporcional)
      let token: any;
      let platform: 'pump.fun' | 'raydium';
      let realPrice: number;

      if (currentPumpTokens.length > 0 && currentRaydiumTokens.length > 0) {
        // Ambas plataformas tienen tokens, elegir aleatoriamente
        if (Math.random() < 0.5) {
          token = currentPumpTokens[Math.floor(Math.random() * currentPumpTokens.length)];
          platform = 'pump.fun';
          realPrice = pumpFunRealService.calculateTokenPrice(token);
        } else {
          token = currentRaydiumTokens[Math.floor(Math.random() * currentRaydiumTokens.length)];
          platform = 'raydium';
          realPrice = token.price || 0.0001;
        }
      } else if (currentPumpTokens.length > 0) {
        token = currentPumpTokens[Math.floor(Math.random() * currentPumpTokens.length)];
        platform = 'pump.fun';
        realPrice = pumpFunRealService.calculateTokenPrice(token);
      } else {
        token = currentRaydiumTokens[Math.floor(Math.random() * currentRaydiumTokens.length)];
        platform = 'raydium';
        realPrice = token.price || 0.0001;
      }
      
      // Simular una compra (monto aleatorio entre 0.001 y 15 SOL)
      const buyAmount = parseFloat((Math.random() * 15 + 0.001).toFixed(3));
      
      const newTx: DetectedTransaction = {
        id: generateId(),
        timestamp: new Date(),
        buyerAddress: randomAddress(),
        tokenAddress: token.mint,
        tokenName: token.name,
        tokenSymbol: token.symbol,
        buyAmount,
        estimatedPrice: realPrice,
        status: 'detected',
        platform: platform,
      };

      setDetectedTxns(prev => [newTx, ...prev].slice(0, 50));
      const platformIcon = platform === 'pump.fun' ? '🎯' : '🌊';
      addLog(`${platformIcon} Detectada: ${buyAmount} SOL en $${token.symbol} (${platform})`);

      const openTradesCount = currentTrades.filter((t: Trade) => t.status === 'open').length;
      const capitalInUse = currentTrades.filter((t: Trade) => t.status === 'open').reduce((sum: number, t: Trade) => sum + t.buyAmount, 0);
      const availableCapital = currentBalance - capitalInUse;
      
      const minEntry = currentConfig.tradeAmount * 0.1;
      
      const canEnter = currentConfig.autoSnipe && 
                       availableCapital >= minEntry &&
                       openTradesCount < currentConfig.maxConcurrentTrades;

      if (canEnter) {
        let snipeAmount: number;
        
        if (availableCapital >= currentConfig.tradeAmount) {
          snipeAmount = currentConfig.tradeAmount;
        } else {
          snipeAmount = availableCapital * 0.95;
        }
        
        if (snipeAmount < minEntry) {
          addLog(`⚠️ Capital insuficiente para $${token.symbol}`);
          return;
        }
        
        // Simular mejor precio de entrada (3-7% mejor que el precio real)
        const ourBuyPrice = realPrice * (0.93 + Math.random() * 0.04);
        
        addLog(`⚡ SNIPE: ${snipeAmount.toFixed(3)} SOL en $${token.symbol}`);
        
        const newTrade: Trade = {
          id: generateId(),
          timestamp: new Date(),
          tokenAddress: token.mint,
          tokenName: token.name,
          tokenSymbol: token.symbol,
          buyAmount: snipeAmount,
          buyPrice: ourBuyPrice,
          status: 'open',
        };
        
        setTrades(prev => [newTrade, ...prev]);
        setSolBalance(prev => prev - snipeAmount);
        setDetectedTxns(prev => prev.map(tx => tx.id === newTx.id ? { ...tx, status: 'sniped' as const, ourBuyPrice } : tx));
        
        // Simular movimiento de precio y venta automática
        setTimeout(() => {
          const rand = Math.random();
          let priceMultiplier: number;
          
          if (rand < 0.3) {
            priceMultiplier = 1.5 + Math.random() * 2.5;
          } else if (rand < 0.5) {
            priceMultiplier = 1.1 + Math.random() * 0.4;
          } else if (rand < 0.7) {
            priceMultiplier = 0.9 + Math.random() * 0.2;
          } else if (rand < 0.9) {
            priceMultiplier = 0.5 + Math.random() * 0.4;
          } else {
            priceMultiplier = 0.1 + Math.random() * 0.4;
          }
          
          const sellPrice = ourBuyPrice * priceMultiplier;
          const profitPercent = (priceMultiplier - 1) * 100;
          const profitSOL = snipeAmount * (priceMultiplier - 1);
          
          let exitReason = '';
          
          if (priceMultiplier >= currentConfig.takeProfitMultiplier) {
            exitReason = `TOMA DE GANANCIA a ${priceMultiplier.toFixed(2)}x`;
          } else if (profitPercent <= -currentConfig.stopLossPercent) {
            exitReason = `STOP LOSS a ${profitPercent.toFixed(1)}%`;
          } else if (Math.abs(profitSOL) >= currentConfig.maxLossPerTrade) {
            exitReason = `PÉRDIDA MÁXIMA: ${profitSOL.toFixed(4)} SOL`;
          } else if (profitPercent >= currentConfig.trailingStopActivation) {
            exitReason = `TRAILING STOP a +${profitPercent.toFixed(1)}%`;
          } else if (profitPercent > 0) {
            const profitTimeMinutes = Math.floor(currentConfig.profitTimeExit / 60);
            exitReason = `SALIDA POR GANANCIA tras ${profitTimeMinutes}m (+${profitPercent.toFixed(1)}%)`;
          } else {
            exitReason = profitPercent >= 0 ? `SALIDA CON GANANCIA +${profitPercent.toFixed(1)}%` : `SALIDA CON PÉRDIDA ${profitPercent.toFixed(1)}%`;
          }
          
          newTrade.sellPrice = sellPrice;
          newTrade.sellAmount = snipeAmount * priceMultiplier;
          newTrade.profit = profitSOL;
          newTrade.profitPercent = profitPercent;
          newTrade.status = 'closed';
          newTrade.txHash = randomAddress();
          
          setSolBalance(prev => prev + newTrade.sellAmount!);
          setTrades(prev => prev.map(t => t.id === newTrade.id ? { ...newTrade } : t));
          setDetectedTxns(prev => prev.map(tx => tx.id === newTx.id ? { 
            ...tx, 
            status: profitSOL >= 0 ? 'sold' as const : 'failed' as const,
            ourSellPrice: sellPrice, 
            profit: profitSOL, 
            profitPercent 
          } : tx));
          
          const emoji = profitSOL >= 0 ? '💰' : '🛑';
          addLog(`${emoji} ${exitReason}: $${token.symbol} | ${profitSOL >= 0 ? '+' : ''}${profitSOL.toFixed(4)} SOL (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(1)}%)`);
        }, Math.random() * 5000 + 1000);
      } else {
        if (openTradesCount >= currentConfig.maxConcurrentTrades) {
          addLog(`⏳ Máx posiciones (${openTradesCount}/${currentConfig.maxConcurrentTrades})`);
        } else if (availableCapital < minEntry) {
          addLog(`⏳ Capital bajo: ${availableCapital.toFixed(4)} SOL`);
        }
      }
    }, Math.random() * 600 + 200);

    return () => clearInterval(interval);
  }, [isRunning, addLog]);

  // Monitor de posiciones abiertas
  useEffect(() => {
    if (!isRunning) return;

    const monitorInterval = setInterval(() => {
      const currentConfig = configRef.current;
      const currentTrades = tradesRef.current;
      const now = Date.now();
      
      currentTrades.forEach(trade => {
        if (trade.status !== 'open') return;
        
        const tradeAge = now - trade.timestamp.getTime();
        const maxAge = currentConfig.timeBasedExit * 1000;
        
        if (tradeAge >= maxAge) {
          const exitMultiplier = 0.8 + Math.random() * 0.7;
          const sellPrice = trade.buyPrice * exitMultiplier;
          const profitPercent = (exitMultiplier - 1) * 100;
          const profitSOL = trade.buyAmount * (exitMultiplier - 1);
          
          const closedTrade: Trade = {
            ...trade,
            sellPrice,
            sellAmount: trade.buyAmount * exitMultiplier,
            profit: profitSOL,
            profitPercent,
            status: 'closed',
            txHash: randomAddress(),
          };
          
          setSolBalance(prev => prev + closedTrade.sellAmount!);
          setTrades(prev => prev.map(t => t.id === trade.id ? closedTrade : t));
          
          const emoji = profitSOL >= 0 ? '💰' : '🛑';
          addLog(`${emoji} CIERRE FORZADO POR TIEMPO: $${trade.tokenSymbol} | ${profitSOL >= 0 ? '+' : ''}${profitSOL.toFixed(4)} SOL (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(1)}%)`);
        }
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
    const newRunning = !isRunning;
    setIsRunning(newRunning);
    
    if (newRunning) {
      addLog('🟢 Bot INICIADO');
      addLog('🔗 Conectando a pump.fun...');
      pumpFunRealService.startPolling(5000);
      addLog('✅ Conectado a pump.fun - Obteniendo tokens');
      addLog('🔗 Conectando a Raydium Launchpad...');
      raydiumService.startPolling(5000);
      addLog('✅ Conectado a Raydium - Obteniendo tokens');
      addLog('🚀 Monitoreando ambas plataformas: pump.fun + Raydium');
    } else {
      addLog('🔴 Bot DETENIDO');
      addLog('🔌 Desconectando de pump.fun...');
      pumpFunRealService.stopPolling();
      addLog('🔌 Desconectando de Raydium...');
      raydiumService.stopPolling();
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
            {(realTokens.length > 0 || raydiumTokens.length > 0) && (
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
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-400">Balance SOL</p>
              <p className="text-sm font-bold text-yellow-400">{solBalance.toFixed(3)} SOL</p>
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
            <Dashboard stats={stats} logs={logs} detectedTxns={detectedTxns} trades={trades} isRunning={isRunning} />
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
            <WalletPanel solBalance={solBalance} config={config} setConfig={setConfig} />
          )}
          {activeTab === 'testing' && (
            <TestingPanel />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
