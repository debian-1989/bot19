export interface BitcoinMarketToken {
  mint: 'BTCUSDT';
  name: 'Bitcoin';
  symbol: 'BTC';
  price: number;
  bidPrice: number;
  askPrice: number;
  spreadPercent: number;
  liquidity: number;
  dailyVolume: number;
  create_time: number;
}

export interface BitcoinServiceStatus {
  connected: boolean;
  websocketConnected: boolean;
  lastUpdate: number;
  error: string | null;
}

type TokenListener = (token: BitcoinMarketToken) => void;

/** Fuente pública de mercado. No firma ni envía órdenes. */
class BinanceBitcoinService {
  private readonly restBases = ['https://api.binance.com/api/v3', 'https://data-api.binance.vision/api/v3'];
  private token: BitcoinMarketToken = {
    mint: 'BTCUSDT', name: 'Bitcoin', symbol: 'BTC', price: 0,
    bidPrice: 0, askPrice: 0, spreadPercent: 0, liquidity: 0,
    dailyVolume: 0, create_time: Date.now(),
  };
  private listeners: TokenListener[] = [];
  private ws: WebSocket | null = null;
  private pollId: ReturnType<typeof setInterval> | null = null;
  private reconnectId: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private status: BitcoinServiceStatus = { connected: false, websocketConnected: false, lastUpdate: 0, error: null };

  private notify() { this.listeners.forEach(listener => listener(this.token)); }

  private update(patch: Partial<BitcoinMarketToken>) {
    this.token = { ...this.token, ...patch, create_time: this.token.create_time || Date.now() };
    this.status = { ...this.status, connected: this.token.price > 0, lastUpdate: Date.now(), error: null };
    this.notify();
  }

  private async fetchJson(path: string) {
    let lastError: unknown = null;
    for (const base of this.restBases) {
      try {
        const response = await fetch(`${base}${path}`);
        if (response.ok) return response.json();
        lastError = new Error(`Binance HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Binance no disponible');
  }

  private async refreshSnapshot() {
    try {
      const [book, ticker] = await Promise.all([
        this.fetchJson('/depth?symbol=BTCUSDT&limit=20'),
        this.fetchJson('/ticker/24hr?symbol=BTCUSDT'),
      ]);
      const bid = Number(book.bids?.[0]?.[0] || 0);
      const ask = Number(book.asks?.[0]?.[0] || 0);
      const bidLiquidity = (book.bids || []).reduce((sum: number, row: string[]) => sum + Number(row[0]) * Number(row[1]), 0);
      const askLiquidity = (book.asks || []).reduce((sum: number, row: string[]) => sum + Number(row[0]) * Number(row[1]), 0);
      const price = Number(ticker.lastPrice || (bid + ask) / 2 || 0);
      this.update({
        price, bidPrice: bid, askPrice: ask,
        spreadPercent: price > 0 ? ((ask - bid) / price) * 100 : 0,
        liquidity: (bidLiquidity + askLiquidity) / 2,
        dailyVolume: Number(ticker.quoteVolume || 0),
      });
    } catch (error) {
      this.status = { ...this.status, error: error instanceof Error ? error.message : 'Error Binance' };
    }
  }

  private scheduleReconnect() {
    if (this.reconnectId) return;
    const delay = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempt++);
    this.reconnectId = setTimeout(() => { this.reconnectId = null; this.connectWebSocket(); }, delay);
  }

  private connectWebSocket() {
    if (typeof WebSocket === 'undefined') return;
    try {
      this.ws?.close();
      this.ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
      this.ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.status = { ...this.status, websocketConnected: true, error: null };
      };
      this.ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          const price = Number(data.p || 0);
          if (price > 0) this.update({ price });
        } catch { /* Ignorar mensajes mal formados sin detener el feed. */ }
      };
      this.ws.onerror = () => { this.status = { ...this.status, websocketConnected: false, error: 'WebSocket Binance' }; };
      this.ws.onclose = () => {
        this.status = { ...this.status, websocketConnected: false };
        if (this.pollId) this.scheduleReconnect();
      };
    } catch (error) {
      this.status = { ...this.status, websocketConnected: false, error: error instanceof Error ? error.message : 'WebSocket Binance' };
      this.scheduleReconnect();
    }
  }

  startPolling(intervalMs = 5000) {
    if (this.pollId) return;
    this.refreshSnapshot();
    this.connectWebSocket();
    this.pollId = setInterval(() => this.refreshSnapshot(), intervalMs);
  }

  stopPolling() {
    if (this.pollId) clearInterval(this.pollId);
    if (this.reconnectId) clearTimeout(this.reconnectId);
    this.pollId = null; this.reconnectId = null;
    this.ws?.close(); this.ws = null;
    this.status = { ...this.status, connected: false, websocketConnected: false };
  }

  onTokenUpdate(listener: TokenListener) { this.listeners.push(listener); return () => { this.listeners = this.listeners.filter(item => item !== listener); }; }
  getToken() { return this.token; }
  getStatus() { return { ...this.status }; }
}

export const binanceBitcoinService = new BinanceBitcoinService();
