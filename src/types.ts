export interface BotConfig {
  executionMode: 'demo' | 'real';
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
  minTokenAgeSeconds: number;
  minRaydiumVolume: number;
  gasStrategy: 'standard' | 'fast' | 'instant';
  jitoBundle: boolean;
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
  platform: 'pump.fun' | 'raydium';
}

export interface Trade {
  id: string;
  timestamp: Date;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  platform?: 'pump.fun' | 'raydium';
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
