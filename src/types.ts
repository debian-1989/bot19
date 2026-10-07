export interface BotConfig {
  executionMode: 'demo' | 'real';
  entryPlatform: 'both' | 'solana' | 'pump.fun' | 'raydium' | 'bitcoin' | 'all';
  graduatedOnly: boolean;
  rpcEndpoint: string;
  walletAddress: string;
  tradeAmount: number;
  maxConcurrentTrades: number;
  takeProfitMultiplier: number;
  stopLossPercent: number;
  trailingStopPercent: number;
  trailingStopActivation: number;
  timeBasedExit: number;
  maxLossPerTrade: number;
  profitTimeExit: number;
  minDetectedBuySize: number;
  maxDetectedBuySize: number;
  slippage: number;
  priorityFee: number;
  autoSnipe: boolean;
  minLiquidity: number;
  maxMarketCap: number;
  maxEntryImpactPercent: number;
  aiQualityFilterEnabled: boolean;
  aiMinQualityScore: number;
  minTokenAgeSeconds: number;
  minRaydiumVolume: number;
  gasStrategy: 'standard' | 'fast' | 'instant';
  jitoBundle: boolean;
  bitcoinTradeAmountUsd: number;
  maxBitcoinSpreadPercent: number;
  bitcoinFeeRate: number;
  bitcoinTradingDirection: 'both' | 'long' | 'short';
  bitcoinTrendFilter: boolean;
  bitcoinRiskEngine: boolean;
  bitcoinStopLossPercent: number;
  bitcoinTakeProfitPercent: number;
  bitcoinBreakEvenTriggerPercent: number;
  bitcoinTrailingAtrMultiplier: number;
  bitcoinExitOnTrendFlip: boolean;
  aiTradingEnabled: boolean;
  aiPairs: string[];
  aiEntryPrices: Record<string, number>;
  aiEntryTolerancePercent: number;
  aiStopLossPercent: number;
  aiTakeProfitPercent: number;
  aiMaxPositionsPerPair: number;
}

export interface DetectedTransaction {
  id: string;
  timestamp: Date;
  buyerAddress: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  buyAmount: number;
  estimatedPrice: number;
  status: 'detected' | 'sniped' | 'sold' | 'missed' | 'failed';
  ourBuyPrice?: number;
  ourSellPrice?: number;
  profit?: number;
  profitPercent?: number;
  platform: 'pump.fun' | 'raydium' | 'bitcoin';
  quoteCurrency?: 'SOL' | 'USDT';
  direction?: 'long' | 'short';
}

export interface Trade {
  id: string;
  timestamp: Date;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  platform?: 'pump.fun' | 'raydium' | 'bitcoin';
  quoteCurrency?: 'SOL' | 'USDT';
  direction?: 'long' | 'short';
  riskStopPrice?: number;
  riskTargetPrice?: number;
  exitReason?: string;
  buyAmount: number;
  buyPrice: number;
  tokenAmount?: number;
  lastMarketPrice?: number;
  entryFee?: number;
  sellAmount?: number;
  sellPrice?: number;
  exitFee?: number;
  profit?: number;
  profitPercent?: number;
  status: 'open' | 'closed' | 'failed';
  txHash?: string;
}

export interface BotStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  winRate: number;
  avgProfitPerTrade: number;
  bestTrade: number;
  worstTrade: number;
  totalVolume: number;
  activeSince: Date;
}

export type TabType = 'dashboard' | 'monitor' | 'config' | 'history' | 'wallet' | 'testing' | 'connections';
