// Servicio real de conexión a Pump.fun
export interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  created_timestamp: number;
  raydium_pool: string | null;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  total_supply: number;
  market_cap: number;
  king_of_the_hill_timestamp: number;
  usd_market_cap: number;
}

export interface PumpFunTrade {
  signature: string;
  sol_amount: number;
  token_amount: number;
  is_buy: boolean;
  user: string;
  timestamp: number;
  tx_hash: string;
}

class PumpFunService {
  private baseUrl = 'https://frontend-api-v2.pump.fun';
  private tokens: PumpFunToken[] = [];
  private lastFetch = 0;
  private fetchInterval = 1000; // 1 segundo (antes 5 segundos)
  private isPolling = false;
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: ((tokens: PumpFunToken[]) => void)[] = [];
  private newTokenListeners: ((newTokens: PumpFunToken[]) => void)[] = [];
  private lastTokenIds: Set<string> = new Set();

  constructor() {}

  // Obtener tokens recientes de pump.fun
  async fetchLatestTokens(limit: number = 200): Promise<PumpFunToken[]> {
    try {
      const response = await fetch(`${this.baseUrl}/coins/latest-metadatas?limit=${limit}&offset=0&includeNsfw=false`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Detectar tokens NUEVOS
      const newTokens: PumpFunToken[] = [];
      const currentTokenIds = new Set<string>(data.map((t: PumpFunToken) => String(t.mint)));
      
      data.forEach((token: PumpFunToken) => {
        if (!this.lastTokenIds.has(String(token.mint))) {
          newTokens.push(token);
        }
      });
      
      this.lastTokenIds = currentTokenIds;
      this.tokens = data;
      this.lastFetch = Date.now();
      
      // Notificar a los listeners de tokens nuevos
      if (newTokens.length > 0) {
        this.newTokenListeners.forEach(listener => listener(newTokens));
      }
      
      // Notificar a los listeners generales
      this.listeners.forEach(listener => listener(data));
      
      return data;
    } catch (error) {
      console.error('Error fetching tokens from pump.fun:', error);
      return this.tokens; // Retornar tokens anteriores si hay error
    }
  }

  // Obtener trades recientes de un token específico
  async fetchTokenTrades(mint: string, limit: number = 20): Promise<PumpFunTrade[]> {
    try {
      const response = await fetch(`${this.baseUrl}/coins/${mint}/trades?limit=${limit}&offset=0`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching trades for ${mint}:`, error);
      return [];
    }
  }

  // Obtener información detallada de un token
  async fetchTokenInfo(mint: string): Promise<PumpFunToken | null> {
    try {
      const response = await fetch(`${this.baseUrl}/coins/${mint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching token info for ${mint}:`, error);
      return null;
    }
  }

  // Calcular precio actual de un token
  calculateTokenPrice(token: PumpFunToken): number {
    if (token.virtual_token_reserves === 0) return 0;
    return token.virtual_sol_reserves / token.virtual_token_reserves;
  }

  // Iniciar polling automático
  startPolling(intervalMs: number = 5000) {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.fetchInterval = intervalMs;
    
    // Fetch inmediato
    this.fetchLatestTokens();
    
    // Configurar polling
    this.pollIntervalId = setInterval(() => {
      this.fetchLatestTokens();
    }, intervalMs);
  }

  // Detener polling
  stopPolling() {
    this.isPolling = false;
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  // Suscribirse a actualizaciones de tokens
  onTokensUpdate(callback: (tokens: PumpFunToken[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Suscribirse específicamente a tokens NUEVOS
  onNewTokens(callback: (newTokens: PumpFunToken[]) => void) {
    this.newTokenListeners.push(callback);
    return () => {
      this.newTokenListeners = this.newTokenListeners.filter(l => l !== callback);
    };
  }

  // Obtener tokens actualmente cargados
  getTokens(): PumpFunToken[] {
    return this.tokens;
  }

  // Obtener estado de conexión
  getStatus(): { connected: boolean; lastUpdate: number; tokenCount: number } {
    return {
      connected: this.isPolling,
      lastUpdate: this.lastFetch,
      tokenCount: this.tokens.length
    };
  }
}

// Exportar instancia única
export const pumpFunRealService = new PumpFunService();
