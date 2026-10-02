// Servicio real de conexión a Raydium
export interface RaydiumToken {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  tags: string[];
  daily_volume: number;
  daily_volume_usd: number;
  price: number;
  liquidity: number;
  liquidity_usd: number;
  market_cap: number;
  market_cap_usd: number;
  create_time: number;
}

export interface RaydiumPool {
  id: string;
  mintA: {
    symbol: string;
    mint: string;
    decimals: number;
  };
  mintB: {
    symbol: string;
    mint: string;
    decimals: number;
  };
  price: number;
  liquidity: number;
  volume24h: number;
  fee24h: number;
  apr24h: number;
  type: string;
  status: string;
}

class RaydiumService {
  private baseUrl = 'http://localhost:3001/api/raydium';
  private tokens: RaydiumToken[] = [];
  private pools: RaydiumPool[] = [];
  private lastFetch = 0;
  private fetchInterval = 5000;
  private isPolling = false;
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: ((tokens: RaydiumToken[]) => void)[] = [];
  
  // Sistema de reconexión
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelay = 1000;
  private maxRetryDelay = 30000;
  private consecutiveErrors = 0;
  private lastError: string | null = null;
  private isConnected = false;

  constructor() {}

  // Obtener pools nuevos de Raydium
  async fetchNewPools(limit: number = 50): Promise<RaydiumPool[]> {
    try {
      const fetchUrl = `${this.baseUrl}/pools?pageSize=${limit}&page=1`;
      
      console.log('[Raydium] Fetching pools from backend...', { 
        limit,
        fetchUrl: fetchUrl,
        retryCount: this.retryCount,
        isConnected: this.isConnected
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(fetchUrl, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('[Raydium] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.success) {
        throw new Error(`Backend error: ${responseData.error}`);
      }
      
      const data = responseData.data;
      
      // Resetear contadores de error si fue exitoso
      this.consecutiveErrors = 0;
      this.retryCount = 0;
      this.retryDelay = 1000;
      this.isConnected = true;
      this.lastError = null;
      
      console.log('[Raydium] Pools received:', data.data?.length || 0);
      
      this.pools = data.data || [];
      this.lastFetch = Date.now();
      
      // Convertir pools a tokens para compatibilidad
      const newTokens = this.convertPoolsToTokens(this.pools);
      this.tokens = newTokens;
      
      // Notificar a los listeners
      console.log('[Raydium] Notifying listeners');
      this.listeners.forEach(listener => listener(newTokens));
      
      return this.pools;
    } catch (error) {
      this.consecutiveErrors++;
      this.isConnected = false;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.lastError = errorMessage;
      
      console.error(`[Raydium] Error fetching pools (attempt ${this.consecutiveErrors}):`, errorMessage);
      
      // Implementar retry con backoff exponencial
      if (this.consecutiveErrors <= this.maxRetries) {
        console.log(`[Raydium] Retrying in ${this.retryDelay}ms... (attempt ${this.consecutiveErrors}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        this.retryDelay = Math.min(this.retryDelay * 2, this.maxRetryDelay);
        
        return this.fetchNewPools(limit);
      }
      
      console.error('[Raydium] Max retries reached, connection failed');
      throw error;
    }
  }

  // Convertir pools a formato de tokens
  private convertPoolsToTokens(pools: RaydiumPool[]): RaydiumToken[] {
    return pools
      .filter(pool => pool.mintA.symbol !== 'SOL' && pool.mintB.symbol === 'SOL')
      .map(pool => ({
        id: pool.id,
        mint: pool.mintA.mint,
        symbol: pool.mintA.symbol,
        name: pool.mintA.symbol,
        decimals: pool.mintA.decimals,
        logoURI: '',
        tags: [],
        daily_volume: pool.volume24h,
        daily_volume_usd: pool.volume24h * pool.price,
        price: pool.price,
        liquidity: pool.liquidity,
        liquidity_usd: pool.liquidity * pool.price,
        market_cap: pool.liquidity * pool.price * 10,
        market_cap_usd: pool.liquidity * pool.price * 10,
        create_time: Date.now() - Math.random() * 86400000,
      }));
  }

  // Obtener información de un token específico
  async fetchTokenInfo(mint: string): Promise<RaydiumToken | null> {
    try {
      const fetchUrl = `${this.baseUrl}/pool/${mint}`;
      
      console.log('[Raydium] Fetching token info:', mint);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(fetchUrl, {
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
      
      const data = responseData.data;
      
      if (data && data.data && data.data.length > 0) {
        const pool = data.data[0];
        return {
          id: pool.id,
          mint: mint,
          symbol: pool.mintA.symbol,
          name: pool.mintA.symbol,
          decimals: pool.mintA.decimals,
          logoURI: '',
          tags: [],
          daily_volume: pool.volume24h,
          daily_volume_usd: pool.volume24h * pool.price,
          price: pool.price,
          liquidity: pool.liquidity,
          liquidity_usd: pool.liquidity * pool.price,
          market_cap: pool.liquidity * pool.price * 10,
          market_cap_usd: pool.liquidity * pool.price * 10,
          create_time: Date.now(),
        };
      }
      
      return null;
    } catch (error) {
      console.error('[Raydium] Error fetching token info:', error);
      throw error;
    }
  }

  // Iniciar polling automático
  startPolling(intervalMs: number = 5000) {
    console.log('[Raydium] Starting polling...', { intervalMs, isPolling: this.isPolling });
    
    if (this.isPolling) {
      console.log('[Raydium] Already polling, skipping');
      return;
    }
    
    this.isPolling = true;
    this.fetchInterval = intervalMs;
    
    console.log('[Raydium] Polling started, fetching immediately');
    
    this.fetchNewPools();
    
    this.pollIntervalId = setInterval(() => {
      console.log('[Raydium] Polling interval triggered');
      this.fetchNewPools();
    }, intervalMs);
    
    console.log('[Raydium] Polling interval set:', intervalMs, 'ms');
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
  onTokensUpdate(callback: (tokens: RaydiumToken[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Obtener tokens actualmente cargados
  getTokens(): RaydiumToken[] {
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
    console.log('[Raydium] Resetting connection state');
    this.consecutiveErrors = 0;
    this.retryCount = 0;
    this.retryDelay = 1000;
    this.isConnected = false;
    this.lastError = null;
  }

  // Forzar reconexión
  async forceReconnect() {
    console.log('[Raydium] Forcing reconnection...');
    this.resetConnection();
    return this.fetchNewPools();
  }
}

// Exportar instancia única
export const raydiumService = new RaydiumService();
