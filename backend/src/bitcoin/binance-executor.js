const crypto = require('crypto');

/**
 * Ejecutor Spot de Binance preparado para el futuro.
 * No se usa en paper mode y rechaza cualquier orden si no se habilitan
 * explícitamente TRADING_MODE=live, ENABLE_LIVE_TRADING=true y
 * BINANCE_LIVE_TRADING_ENABLED=true.
 */
class BinanceExecutor {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.BINANCE_API_BASE_URL || 'https://api.binance.com';
    this.apiKey = config.apiKey || process.env.BINANCE_API_KEY;
    this.apiSecret = config.apiSecret || process.env.BINANCE_API_SECRET;
    this.liveEnabled = process.env.TRADING_MODE === 'live'
      && process.env.ENABLE_LIVE_TRADING === 'true'
      && process.env.BINANCE_LIVE_TRADING_ENABLED === 'true';
  }

  assertEnabled() {
    if (!this.liveEnabled) {
      throw new Error('Binance live executor bloqueado: requiere TRADING_MODE=live, ENABLE_LIVE_TRADING=true y BINANCE_LIVE_TRADING_ENABLED=true');
    }
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Faltan BINANCE_API_KEY y BINANCE_API_SECRET en el backend');
    }
  }

  async signedRequest(method, path, params = {}) {
    this.assertEnabled();
    const query = new URLSearchParams({ ...params, timestamp: String(Date.now()), recvWindow: '5000' });
    const signature = crypto.createHmac('sha256', this.apiSecret).update(query.toString()).digest('hex');
    const url = `${this.baseUrl}${path}?${query.toString()}&signature=${signature}`;
    const response = await fetch(url, {
      method,
      headers: { 'X-MBX-APIKEY': this.apiKey, 'Content-Type': 'application/json' },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Binance ${response.status}: ${body.msg || 'error de orden'}`);
    return body;
  }

  async marketOrder({ symbol = 'BTCUSDT', side, quoteOrderQty, quantity, newClientOrderId }) {
    if (!['BUY', 'SELL'].includes(side)) throw new Error('side debe ser BUY o SELL');
    if (!quoteOrderQty && !quantity) throw new Error('Debe especificarse quoteOrderQty o quantity');
    const params = { symbol, side, type: 'MARKET', newOrderRespType: 'FULL' };
    if (quoteOrderQty) params.quoteOrderQty = String(quoteOrderQty);
    if (quantity) params.quantity = String(quantity);
    if (newClientOrderId) params.newClientOrderId = newClientOrderId;
    return this.signedRequest('POST', '/api/v3/order', params);
  }
}

module.exports = { BinanceExecutor };
