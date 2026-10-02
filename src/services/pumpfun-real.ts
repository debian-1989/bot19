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
  private useFallback = false;

  constructor() {}

  // Generar tokens simulados como fallback
  private generateFallbackTokens(count: number = 200): PumpFunToken[] {
    const tokens: PumpFunToken[] = [];
    const symbols = ['BONK', 'WIF', 'POPCAT', 'MYRO', 'WEN', 'BOME', 'SLERF', 'MEW', 'PNUT', 'ACT'];
    
    for (let i = 0; i < count; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const mint = `fallback_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
      
      tokens.push({
        mint,
        name: `${symbol} Token`,
        symbol,
        description: `Fallback ${symbol} token`,
        image_uri: '',
        created_timestamp: Date.now() - Math.random() * 3600000,
        raydium_pool: null,
        complete: false,
        virtual_sol_reserves: Math.random() * 100 + 10,
        virtual_token_reserves: Math.random() * 1000000000 + 100000000,
        total_supply: 1000000000,
        market_cap: Math.random() * 1000000,
        king_of_the_hill_timestamp: 0,
        usd_market_cap: Math.random() * 100000000,
      });
    }
    
    return tokens;
  }

  // Obtener tokens recientes de pump.fun
  async fetchLatestTokens(limit: number = 200): Promise<PumpFunToken[]> {
    try {
      console.log('[PumpFun] Fetching tokens...', { limit, url: `${this.baseUrl}/coins/latest-metadatas?limit=${limit}&offset=0&includeNsfw=false` });
      
      const response = await fetch(`${this.baseUrl}/coins/latest-metadatas?limit=${limit}&offset=0&includeNsfw=false`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('[PumpFun] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[PumpFun] Tokens received:', data.length);
      
      // Detectar tokens NUEVOS
      const newTokens: PumpFunToken[] = [];
      const currentTokenIds = new Set<string>(data.map((t: PumpFunToken) => String(t.mint)));
      
      data.forEach((token: PumpFunToken) => {
        if (!this.lastTokenIds.has(String(token.mint))) {
          newTokens.push(token);
        }
      });
      
      console.log('[PumpFun] New tokens detected:', newTokens.length);
      
      this.lastTokenIds = currentTokenIds;
      this.tokens = data;
      this.lastFetch = Date.now();
      this.useFallback = false;
      
      // Notificar a los listeners de tokens nuevos
      if (newTokens.length > 0) {
        console.log('[PumpFun] Notifying new token listeners');
        this.newTokenListeners.forEach(listener => listener(newTokens));
      }
      
      // Notificar a los listeners generales
      console.log('[PumpFun] Notifying general listeners');
      this.listeners.forEach(listener => listener(data));
      
      return data;
    } catch (error) {
      console.error('[PumpFun] Error fetching tokens, using fallback:', error);
      
      // Si falla la API real, usar tokens simulados
      if (!this.useFallback || this.tokens.length === 0) {
        console.log('[PumpFun] Generating fallback tokens');
        this.useFallback = true;
        const fallbackTokens = this.generateFallbackTokens(limit);
        
        // Detectar tokens "nuevos" en el fallback
        const newTokens: PumpFunToken[] = [];
        const currentTokenIds = new Set<string>(fallbackTokens.map(t => String(t.mint)));
        
        fallbackTokens.forEach(token => {
          if (!this.lastTokenIds.has(String(token.mint))) {
            newTokens.push(token);
          }
        });
        
        this.lastTokenIds = currentTokenIds;
        this.tokens = fallbackTokens;
        this.lastFetch = Date.now();
        
        // Notificar a los listeners
        if (newTokens.length > 0) {
          console.log('[PumpFun] Notifying fallback new token listeners:', newTokens.length);
          this.newTokenListeners.forEach(listener => listener(newTokens));
        }
        
        console.log('[PumpFun] Notifying fallback general listeners');
        this.listeners.forEach(listener => listener(fallbackTokens));
        
        return fallbackTokens;
      }
      
      return this.tokens;
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
    console.log('[PumpFun] Starting polling...', { intervalMs, isPolling: this.isPolling });
    
    if (this.isPolling) {
      console.log('[PumpFun] Already polling, skipping');
      return;
    }
    
    this.isPolling = true;
    this.fetchInterval = intervalMs;
    
    console.log('[PumpFun] Polling started, fetching immediately');
    
    // Fetch inmediato
    this.fetchLatestTokens();
    
    // Configurar polling
    this.pollIntervalId = setInterval(() => {
      console.log('[PumpFun] Polling interval triggered');
      this.fetchLatestTokens();
    }, intervalMs);
    
    console.log('[PumpFun] Polling interval set:', intervalMs, 'ms');
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
  getStatus(): { connected: boolean; lastUpdate: number; tokenCount: number; isFallback: boolean } {
    return {
      connected: this.isPolling,
      lastUpdate: this.lastFetch,
      tokenCount: this.tokens.length,
      isFallback: this.useFallback
    };
  }
}

// Exportar instancia única
export const pumpFunRealService = new PumpFunService();
