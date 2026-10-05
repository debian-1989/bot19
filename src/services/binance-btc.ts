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
  restConnected: boolean;
  lastUpdate: number;
  lastRestUpdate: number;
  requestCount: number;
  latencyMs: number | null;
  endpoint: string;
  error: string | null;
}

type TokenListener = (token: BitcoinMarketToken) => void;
type StatusListener = (status: BitcoinServiceStatus) => void;

/** Fuente pública de mercado. No firma ni envía órdenes. */
class BinanceBitcoinService {
  private readonly restBases = ['https://api.binance.com/api/v3', 'https://data-api.binance.vision/api/v3'];
  private readonly streamUrl = 'wss://stream.binance.com:9443/stream?streams=btcusdt@trade/btcusdt@depth20@100ms';
  private token: BitcoinMarketToken = {
    mint: 'BTCUSDT', name: 'Bitcoin', symbol: 'BTC', price: 0,
    bidPrice: 0, askPrice: 0, spreadPercent: 0, liquidity: 0,
    dailyVolume: 0, create_time: Date.now(),
  };
  private listeners: TokenListener[] = [];
  private statusListeners: StatusListener[] = [];
  private ws: WebSocket | null = null;
  private pollId: ReturnType<typeof setInterval> | null = null;
  private reconnectId: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private status: BitcoinServiceStatus = {
    connected: false, websocketConnected: false, restConnected: false,
    lastUpdate: 0, lastRestUpdate: 0, requestCount: 0, latencyMs: null,
    endpoint: 'wss://stream.binance.com:9443', error: null,
  };

  private notify() {
    this.listeners.forEach(listener => listener(this.token));
    this.statusListeners.forEach(listener => listener(this.getStatus()));
  }

  private setStatus(patch: Partial<BitcoinServiceStatus>) {
    this.status = { ...this.status, ...patch };
    this.statusListeners.forEach(listener => listener(this.getStatus()));
  }

  private update(patch: Partial<BitcoinMarketToken>) {
    this.token = { ...this.token, ...patch, create_time: this.token.create_time || Date.now() };
    this.status = { ...this.status, connected: this.status.websocketConnected || this.status.restConnected, lastUpdate: Date.now(), error: null };
    this.notify();
  }

  private async fetchJson(path: string) {
    let lastError: unknown = null;
    for (const base of this.restBases) {
      const started = performance.now();
      try {
        const response = await fetch(`${base}${path}`);
        if (response.ok) {
          this.setStatus({ restConnected: true, lastRestUpdate: Date.now(), latencyMs: Math.round(performance.now() - started), endpoint: base });
          return response.json();
        }
        lastError = new Error(`Binance HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      }
    }
    this.setStatus({ restConnected: false, error: lastError instanceof Error ? lastError.message : 'Binance REST no disponible' });
    throw lastError instanceof Error ? lastError : new Error('Binance no disponible');
  }

  private async refreshSnapshot() {
    const started = performance.now();
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
      this.setStatus({ requestCount: this.status.requestCount + 2, latencyMs: Math.round(performance.now() - started) });
      this.update({
        price, bidPrice: bid, askPrice: ask,
        spreadPercent: price > 0 ? ((ask - bid) / price) * 100 : 0,
        liquidity: (bidLiquidity + askLiquidity) / 2,
        dailyVolume: Number(ticker.quoteVolume || 0),
      });
    } catch (error) {
      this.setStatus({ error: error instanceof Error ? error.message : 'Error Binance REST' });
    }
  }

  private applyDepth(data: { bids?: string[][]; asks?: string[][] }) {
    const bid = Number(data.bids?.[0]?.[0] || 0);
    const ask = Number(data.asks?.[0]?.[0] || 0);
    const bidLiquidity = (data.bids || []).reduce((sum, row) => sum + Number(row[0]) * Number(row[1]), 0);
    const askLiquidity = (data.asks || []).reduce((sum, row) => sum + Number(row[0]) * Number(row[1]), 0);
    const price = this.token.price || (bid + ask) / 2;
    if (bid > 0 && ask > 0) {
      this.update({ bidPrice: bid, askPrice: ask, spreadPercent: price > 0 ? ((ask - bid) / price) * 100 : 0, liquidity: (bidLiquidity + askLiquidity) / 2 });
    }
  }

  private scheduleReconnect() {
    if (this.reconnectId) return;
    const delay = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempt++);
    this.reconnectId = setTimeout(() => { this.reconnectId = null; this.connectWebSocket(); }, delay);
  }

  private connectWebSocket() {
    if (typeof WebSocket === 'undefined') {
      this.setStatus({ error: 'WebSocket no disponible en este navegador' });
      return;
    }
    try {
      this.ws?.close();
      this.ws = new WebSocket(this.streamUrl);
      this.ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.setStatus({ websocketConnected: true, connected: true, endpoint: this.streamUrl, error: null });
      };
      this.ws.onmessage = event => {
        try {
          const envelope = JSON.parse(event.data);
          const data = envelope.data || envelope;
          if (data.e === 'trade') {
            const price = Number(data.p || 0);
            if (price > 0) this.update({ price });
          } else if (data.e === 'depthUpdate' || data.lastUpdateId) {
            this.applyDepth({ bids: data.bids || data.b, asks: data.asks || data.a });
          }
        } catch { /* Ignorar mensajes mal formados sin detener el feed. */ }
      };
      this.ws.onerror = () => this.setStatus({ websocketConnected: false, connected: this.status.restConnected, error: 'WebSocket Binance' });
      this.ws.onclose = () => {
        this.setStatus({ websocketConnected: false, connected: this.status.restConnected });
        if (this.pollId) this.scheduleReconnect();
      };
    } catch (error) {
      this.setStatus({ websocketConnected: false, error: error instanceof Error ? error.message : 'WebSocket Binance' });
      this.scheduleReconnect();
    }
  }

  startPolling(intervalMs = 10_000) {
    if (this.pollId) return;
    void this.refreshSnapshot();
    this.connectWebSocket();
    this.pollId = setInterval(() => void this.refreshSnapshot(), intervalMs);
  }

  stopPolling() {
    if (this.pollId) clearInterval(this.pollId);
    if (this.reconnectId) clearTimeout(this.reconnectId);
    this.pollId = null; this.reconnectId = null;
    this.ws?.close(); this.ws = null;
    this.setStatus({ connected: false, websocketConnected: false, restConnected: false });
  }

  onTokenUpdate(listener: TokenListener) { this.listeners.push(listener); return () => { this.listeners = this.listeners.filter(item => item !== listener); }; }
  onStatusUpdate(listener: StatusListener) { this.statusListeners.push(listener); listener(this.getStatus()); return () => { this.statusListeners = this.statusListeners.filter(item => item !== listener); }; }
  getToken() { return this.token; }
  getStatus() { return { ...this.status }; }
}

export const binanceBitcoinService = new BinanceBitcoinService();
