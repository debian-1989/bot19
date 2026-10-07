import { BinanceCandleInterval } from '../types';

export interface BitcoinMarketToken {
  mint: string;
  name: string;
  symbol: string;
  price: number;
  bidPrice: number;
  askPrice: number;
  spreadPercent: number;
  liquidity: number;
  dailyVolume: number;
  priceChangePercent: number;
  trendDirection: 'long' | 'short' | 'neutral';
  trendStrength: number;
  emaFast: number;
  emaSlow: number;
  rsi: number;
  trendReady: boolean;
  atrPercent: number;
  create_time: number;
}
export interface BitcoinServiceStatus {
  connected: boolean;
  websocketConnected: boolean;
  restConnected: boolean;
  lastUpdate: number;
  lastRestUpdate: number;
  requestCount: number;
  latencyMs: number | null;
  endpoint: string;
  error: string | null;
  symbols: string[];
}
type TokenListener = (token: BitcoinMarketToken) => void;
type TokensListener = (tokens: BitcoinMarketToken[]) => void;
type StatusListener = (status: BitcoinServiceStatus) => void;

const DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT'];
const cleanSymbol = (symbol: string) => symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Fuente pública Binance Spot. No firma ni envía órdenes. */
class BinanceMultiAssetService {
  private readonly restBases = ['https://api.binance.com/api/v3', 'https://data-api.binance.vision/api/v3'];
  private tokens = new Map<string, BitcoinMarketToken>();
  private selectedSymbols = DEFAULT_SYMBOLS;
  private candleInterval: BinanceCandleInterval = '1m';
  private listeners: TokenListener[] = [];
  private tokensListeners: TokensListener[] = [];
  private statusListeners: StatusListener[] = [];
  private ws: WebSocket | null = null;
  private pollId: ReturnType<typeof setInterval> | null = null;
  private reconnectId: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private status: BitcoinServiceStatus = { connected: false, websocketConnected: false, restConnected: false, lastUpdate: 0, lastRestUpdate: 0, requestCount: 0, latencyMs: null, endpoint: 'wss://stream.binance.com:9443', error: null, symbols: DEFAULT_SYMBOLS };

  private blank(symbol: string): BitcoinMarketToken {
    const base = symbol.replace(/USDT$/, '');
    return { mint: symbol, name: base, symbol: base, price: 0, bidPrice: 0, askPrice: 0, spreadPercent: 0, liquidity: 0, dailyVolume: 0, priceChangePercent: 0, trendDirection: 'neutral', trendStrength: 0, emaFast: 0, emaSlow: 0, rsi: 50, trendReady: false, atrPercent: 0, create_time: Date.now() };
  }
  private notify(symbol?: string) { const token = symbol ? this.tokens.get(symbol) : undefined; if (token) this.listeners.forEach(listener => listener(token)); this.tokensListeners.forEach(listener => listener(this.getTokens())); this.statusListeners.forEach(listener => listener(this.getStatus())); }
  private setStatus(patch: Partial<BitcoinServiceStatus>) { this.status = { ...this.status, ...patch }; this.statusListeners.forEach(listener => listener(this.getStatus())); }
  private async fetchJson(path: string) { let lastError: unknown = null; for (const base of this.restBases) { const started = performance.now(); try { const response = await fetch(`${base}${path}`); if (response.ok) { this.setStatus({ restConnected: true, lastRestUpdate: Date.now(), latencyMs: Math.round(performance.now() - started), endpoint: base }); return response.json(); } lastError = new Error(`Binance HTTP ${response.status}`); } catch (error) { lastError = error; } } this.setStatus({ restConnected: false, error: lastError instanceof Error ? lastError.message : 'Binance REST no disponible' }); throw lastError instanceof Error ? lastError : new Error('Binance no disponible'); }
  private ema(closes: number[], period: number) { if (closes.length < period) return 0; const multiplier = 2 / (period + 1); let value = closes.slice(0, period).reduce((sum, price) => sum + price, 0) / period; for (const price of closes.slice(period)) value = (price - value) * multiplier + value; return value; }
  private calculateTrend(closes: number[]): Pick<BitcoinMarketToken, 'trendDirection' | 'trendStrength' | 'emaFast' | 'emaSlow' | 'rsi' | 'trendReady'> { if (closes.length < 30) return { trendDirection: 'neutral', trendStrength: 0, emaFast: 0, emaSlow: 0, rsi: 50, trendReady: false }; const fast = this.ema(closes, 9); const slow = this.ema(closes, 21); const changes = closes.slice(1).map((price, index) => price - closes[index]); const gains = changes.slice(-14).filter(change => change > 0).reduce((sum, change) => sum + change, 0) / 14; const losses = changes.slice(-14).filter(change => change < 0).reduce((sum, change) => sum - change, 0) / 14; const rsi = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses)); const strength = slow > 0 ? Math.abs((fast - slow) / slow) * 100 : 0; const trendDirection = strength >= 0.03 && fast > slow && rsi >= 50 && rsi <= 75 ? 'long' : strength >= 0.03 && fast < slow && rsi >= 25 && rsi <= 50 ? 'short' : 'neutral'; return { trendDirection, trendStrength: strength, emaFast: fast, emaSlow: slow, rsi, trendReady: true }; }
  private atr(closes: number[], period = 14) { if (closes.length < period + 1) return 0; const returns = closes.slice(1).map((price, index) => Math.abs((price - closes[index]) / closes[index]) * 100); return returns.slice(-period).reduce((sum, value) => sum + value, 0) / period; }
  private async refreshSymbol(symbol: string) { const [book, ticker, klines] = await Promise.all([this.fetchJson(`/depth?symbol=${symbol}&limit=20`), this.fetchJson(`/ticker/24hr?symbol=${symbol}`), this.fetchJson(`/klines?symbol=${symbol}&interval=${this.candleInterval}&limit=100`)]); const bid = Number(book.bids?.[0]?.[0] || 0); const ask = Number(book.asks?.[0]?.[0] || 0); const bidLiquidity = (book.bids || []).reduce((sum: number, row: string[]) => sum + Number(row[0]) * Number(row[1]), 0); const askLiquidity = (book.asks || []).reduce((sum: number, row: string[]) => sum + Number(row[0]) * Number(row[1]), 0); const price = Number(ticker.lastPrice || (bid + ask) / 2 || 0); const closes = (klines || []).map((candle: unknown[]) => Number(candle[4])).filter((value: number) => value > 0); const base = symbol.replace(/USDT$/, ''); const next: BitcoinMarketToken = { ...(this.tokens.get(symbol) || this.blank(symbol)), mint: symbol, name: base, symbol: base, price, bidPrice: bid, askPrice: ask, spreadPercent: price > 0 ? ((ask - bid) / price) * 100 : 0, liquidity: (bidLiquidity + askLiquidity) / 2, dailyVolume: Number(ticker.quoteVolume || 0), priceChangePercent: Number(ticker.priceChangePercent || 0), ...this.calculateTrend(closes), atrPercent: this.atr(closes) }; this.tokens.set(symbol, next); this.status.requestCount += 3; this.status.lastUpdate = Date.now(); this.status.lastRestUpdate = Date.now(); this.status.connected = this.status.websocketConnected || this.status.restConnected; this.notify(symbol); }
  private connectWebSocket() { if (typeof WebSocket === 'undefined') { this.setStatus({ error: 'WebSocket no disponible en este navegador' }); return; } try { this.ws?.close(); const streams = this.selectedSymbols.flatMap(symbol => [`${symbol.toLowerCase()}@trade`, `${symbol.toLowerCase()}@depth20@100ms`]).join('/'); this.ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`); this.ws.onopen = () => { this.reconnectAttempt = 0; this.setStatus({ websocketConnected: true, connected: true, endpoint: 'wss://stream.binance.com:9443', error: null }); }; this.ws.onmessage = event => { try { const envelope = JSON.parse(event.data); const data = envelope.data || envelope; const symbol = String(data.s || '').toUpperCase(); const token = this.tokens.get(symbol); if (!token) return; if (data.e === 'trade') { const price = Number(data.p || 0); if (price > 0) { this.tokens.set(symbol, { ...token, price }); this.notify(symbol); } } else if (data.e === 'depthUpdate' || data.lastUpdateId) { const bid = Number(data.bids?.[0]?.[0] || data.b?.[0]?.[0] || 0); const ask = Number(data.asks?.[0]?.[0] || data.a?.[0]?.[0] || 0); if (bid > 0 && ask > 0) { this.tokens.set(symbol, { ...token, bidPrice: bid, askPrice: ask, spreadPercent: token.price > 0 ? ((ask - bid) / token.price) * 100 : 0 }); this.notify(symbol); } } } catch { /* ignorar mensaje aislado */ } }; this.ws.onerror = () => this.setStatus({ websocketConnected: false, connected: this.status.restConnected, error: 'WebSocket Binance' }); this.ws.onclose = () => { this.setStatus({ websocketConnected: false, connected: this.status.restConnected }); if (this.pollId) this.scheduleReconnect(); }; } catch (error) { this.setStatus({ websocketConnected: false, error: error instanceof Error ? error.message : 'WebSocket Binance' }); this.scheduleReconnect(); } }
  private scheduleReconnect() { if (this.reconnectId) return; const delay = Math.min(30000, 1000 * 2 ** this.reconnectAttempt++); this.reconnectId = setTimeout(() => { this.reconnectId = null; this.connectWebSocket(); }, delay); }
  getTokens() { return this.selectedSymbols.map(symbol => this.tokens.get(symbol) || this.blank(symbol)); }
  getToken() { return this.getTokens()[0]; }
  startPolling(intervalMs = 10000, symbols = DEFAULT_SYMBOLS, candleInterval: BinanceCandleInterval = '1m') { if (this.pollId) return; this.candleInterval = candleInterval; this.selectedSymbols = Array.from(new Set(symbols.map(cleanSymbol).filter(Boolean))).slice(0, 20); if (!this.selectedSymbols.length) this.selectedSymbols = DEFAULT_SYMBOLS; this.setStatus({ symbols: this.selectedSymbols }); const refresh = () => Promise.allSettled(this.selectedSymbols.map(symbol => this.refreshSymbol(symbol))); void refresh(); this.connectWebSocket(); this.pollId = setInterval(refresh, intervalMs); }
  stopPolling() { if (this.pollId) clearInterval(this.pollId); if (this.reconnectId) clearTimeout(this.reconnectId); this.pollId = null; this.reconnectId = null; this.ws?.close(); this.ws = null; this.setStatus({ connected: false, websocketConnected: false, restConnected: false }); }
  onTokenUpdate(listener: TokenListener) { this.listeners.push(listener); return () => { this.listeners = this.listeners.filter(item => item !== listener); }; }
  onTokensUpdate(listener: TokensListener) { this.tokensListeners.push(listener); listener(this.getTokens()); return () => { this.tokensListeners = this.tokensListeners.filter(item => item !== listener); }; }
  onStatusUpdate(listener: StatusListener) { this.statusListeners.push(listener); listener(this.getStatus()); return () => { this.statusListeners = this.statusListeners.filter(item => item !== listener); }; }
  getStatus() { return { ...this.status, symbols: [...this.status.symbols] }; }
}
export const binanceBitcoinService = new BinanceMultiAssetService();
