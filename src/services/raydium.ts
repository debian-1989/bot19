// Servicio real de conexión a Raydium Launchpad
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
  private useFallback = false;
  
  // Sistema de reconexión
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelay = 1000; // 1 segundo inicial
  private maxRetryDelay = 30000; // 30 segundos máximo
  private consecutiveErrors = 0;
  private lastError: string | null = null;
  private isConnected = false;

  constructor() {}

  // Generar tokens simulados como fallback
  private generateFallbackTokens(count: number = 200): RaydiumToken[] {
    const tokens: RaydiumToken[] = [];
    const symbols = ['RAY', 'ORCA', 'MNGO', 'STEP', 'SRM', 'COPE', 'OXY', 'MAPS', 'MER', 'FRKT'];
    
    for (let i = 0; i < count; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const mint = `raydium_fallback_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
      
      tokens.push({
        id: mint,
        mint,
        symbol,
        name: `${symbol} Raydium Token`,
        decimals: 9,
        logoURI: '',
        tags: [],
        daily_volume: Math.random() * 1000000,
        daily_volume_usd: Math.random() * 100000000,
        price: Math.random() * 10,
        liquidity: Math.random() * 100000,
        liquidity_usd: Math.random() * 10000000,
        market_cap: Math.random() * 10000000,
        market_cap_usd: Math.random() * 1000000000,
        create_time: Date.now() - Math.random() * 3600000,
      });
    }
    
    return tokens;
  }

  // Obtener pools nuevos de Raydium (incluye Launchpad) con reconexión automática
  async fetchNewPools(limit: number = 50): Promise<RaydiumPool[]> {
    try {
      const fetchUrl = `${this.baseUrl}/pools?pageSize=${limit}&page=1`;
      
      console.log('[Raydium] Fetching pools from backend...', { 
        limit,
        fetchUrl: fetchUrl,
        retryCount: this.retryCount,
        isConnected: this.isConnected
      });
      
      // Crear un AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
      
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
      
      if (data.success && data.data) {
        console.log('[Raydium] Pools received:', data.data.data?.length || 0);
        this.pools = data.data.data || [];
        this.lastFetch = Date.now();
        this.useFallback = false;
        
        // Convertir pools a tokens para compatibilidad
        const newTokens = this.convertPoolsToTokens(this.pools);
        this.tokens = newTokens;
        
        // Notificar a los listeners
        console.log('[Raydium] Notifying listeners');
        this.listeners.forEach(listener => listener(newTokens));
        
        return this.pools;
      }
      
      return [];
    } catch (error) {
      this.consecutiveErrors++;
      this.isConnected = false;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.lastError = errorMessage;
      
      console.error(`[Raydium] Error fetching pools (attempt ${this.consecutiveErrors}):`, errorMessage);
      
      // Implementar retry con backoff exponencial
      if (this.consecutiveErrors <= this.maxRetries) {
        console.log(`[Raydium] Retrying in ${this.retryDelay}ms... (attempt ${this.consecutiveErrors}/${this.maxRetries})`);
        
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        // Aumentar delay para el próximo retry (backoff exponencial)
        this.retryDelay = Math.min(this.retryDelay * 2, this.maxRetryDelay);
        
        // Reintentar
        return this.fetchNewPools(limit);
      }
      
      // Si después de todos los retries sigue fallando, usar fallback
      console.error('[Raydium] Max retries reached, using fallback');
      
      // Si falla la API real, usar tokens simulados
      if (!this.useFallback || this.tokens.length === 0) {
        console.log('[Raydium] Generating fallback tokens');
        this.useFallback = true;
        const fallbackTokens = this.generateFallbackTokens(limit);
        this.tokens = fallbackTokens;
        this.lastFetch = Date.now();
        
        // Notificar a los listeners
        console.log('[Raydium] Notifying fallback listeners');
        this.listeners.forEach(listener => listener(fallbackTokens));
        
        return [];
      }
      
      return [];
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
      const response = await fetch(
        `${this.baseUrl}/pools/info/mint?mint1=${mint}&poolType=all&poolSortField=liquidity&sortType=desc&pageSize=5&page=1`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.data && data.data.data.length > 0) {
        const pool = data.data.data[0];
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
      console.error(`Error fetching token info for ${mint}:`, error);
      return null;
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
    
    // Fetch inmediato
    this.fetchNewPools();
    
    // Configurar polling
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
  getStatus(): { connected: boolean; lastUpdate: number; tokenCount: number; isFallback: boolean; isConnected: boolean; consecutiveErrors: number; lastError: string | null } {
    return {
      connected: this.isPolling,
      lastUpdate: this.lastFetch,
      tokenCount: this.tokens.length,
      isFallback: this.useFallback,
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
