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
  qualityScore?: number;
  qualityDecision?: 'enter' | 'watch' | 'reject';
  qualityConfidence?: number;
  qualityReasons?: string[];
  qualityWarnings?: string[];
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
  private baseUrl = 'http://localhost:3001/api/pumpfun';
  private tokens: PumpFunToken[] = [];
  private lastFetch = 0;
  private fetchInterval = 1000; // 1 segundo
  private isPolling = false;
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: ((tokens: PumpFunToken[]) => void)[] = [];
  private newTokenListeners: ((newTokens: PumpFunToken[]) => void)[] = [];
  private lastTokenIds: Set<string> = new Set();
  
  // Sistema de reconexión
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelay = 1000;
  private maxRetryDelay = 30000;
  private consecutiveErrors = 0;
  private lastError: string | null = null;
  private isConnected = false;
  private fetchInProgress = false;

  constructor() {}

  // Obtener tokens recientes de pump.fun
  async fetchLatestTokens(limit: number = 200): Promise<PumpFunToken[]> {
    try {
      const fetchUrl = `${this.baseUrl}/tokens?limit=${limit}&offset=0`;
      
      console.log('[PumpFun] Fetching tokens from backend...', { 
        limit, 
        fetchUrl: fetchUrl,
        retryCount: this.retryCount,
        isConnected: this.isConnected
      });
      
      // Crear un AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('[PumpFun] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.success) {
        throw new Error(`Backend error: ${responseData.error}`);
      }
      
      const data = responseData.data;
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
      
      // Resetear contadores de error si fue exitoso
      this.consecutiveErrors = 0;
      this.retryCount = 0;
      this.retryDelay = 1000;
      this.isConnected = true;
      this.lastError = null;
      
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
      this.consecutiveErrors++;
      this.isConnected = false;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.lastError = errorMessage;
      
      console.error(`[PumpFun] Error fetching tokens (attempt ${this.consecutiveErrors}):`, errorMessage);
      
      // Implementar retry con backoff exponencial
      if (this.consecutiveErrors <= this.maxRetries) {
        console.log(`[PumpFun] Retrying in ${this.retryDelay}ms... (attempt ${this.consecutiveErrors}/${this.maxRetries})`);
        
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        // Aumentar delay para el próximo retry (backoff exponencial)
        this.retryDelay = Math.min(this.retryDelay * 2, this.maxRetryDelay);
        
        // Reintentar
        return this.fetchLatestTokens(limit);
      }
      
      // Si después de todos los retries sigue fallando, lanzar error
      console.error('[PumpFun] Max retries reached, connection failed');
      throw error;
    }
  }

  // Obtener trades de un token específico
  async fetchTokenTrades(mint: string, limit: number = 20): Promise<PumpFunTrade[]> {
    try {
      const fetchUrl = `${this.baseUrl}/token/${mint}/trades?limit=${limit}`;
      
      console.log('[PumpFun] Fetching trades for token:', mint);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.success) {
        throw new Error(`Backend error: ${responseData.error}`);
      }
      
      return responseData.data;
    } catch (error) {
      console.error('[PumpFun] Error fetching trades:', error);
      throw error;
    }
  }

  // Calcular precio actual de un token
  calculateTokenPrice(token: PumpFunToken): number {
    if (token.virtual_token_reserves === 0) return 0;
    return token.virtual_sol_reserves / token.virtual_token_reserves;
  }

  // Iniciar polling automático
  private async fetchIfIdle() {
    if (this.fetchInProgress) return;
    this.fetchInProgress = true;
    try {
      await this.fetchLatestTokens(500);
    } catch (error) {
      console.error('[PumpFun] Polling cycle failed:', error);
    } finally {
      this.fetchInProgress = false;
    }
  }

  startPolling(intervalMs: number = 1000) {
    console.log('[PumpFun] Starting polling...', { intervalMs, isPolling: this.isPolling });
    
    if (this.isPolling) {
      console.log('[PumpFun] Already polling, skipping');
      return;
    }
    
    this.isPolling = true;
    this.fetchInterval = intervalMs;
    
    console.log('[PumpFun] Polling started, fetching immediately');
    
    // Fetch inmediato
    void this.fetchIfIdle();
    
    // Configurar polling
    this.pollIntervalId = setInterval(() => {
      console.log('[PumpFun] Polling interval triggered');
      void this.fetchIfIdle();
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
  getStatus(): { connected: boolean; lastUpdate: number; tokenCount: number; isConnected: boolean; consecutiveErrors: number; lastError: string | null } {
    return {
      connected: this.isPolling,
      lastUpdate: this.lastFetch,
      tokenCount: this.tokens.length,
      isConnected: this.isConnected,
      consecutiveErrors: this.consecutiveErrors,
      lastError: this.lastError
    };
  }

  // Resetear estado de conexión
  resetConnection() {
    console.log('[PumpFun] Resetting connection state');
    this.consecutiveErrors = 0;
    this.retryCount = 0;
    this.retryDelay = 1000;
    this.isConnected = false;
    this.lastError = null;
  }

  // Forzar reconexión
  async forceReconnect() {
    console.log('[PumpFun] Forcing reconnection...');
    this.resetConnection();
    return this.fetchLatestTokens();
  }
}

// Exportar instancia única
export const pumpFunRealService = new PumpFunService();
