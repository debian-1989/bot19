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
  private baseUrl = 'https://api-v3.raydium.io';
  private tokens: RaydiumToken[] = [];
  private pools: RaydiumPool[] = [];
  private lastFetch = 0;
  private fetchInterval = 5000;
  private isPolling = false;
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: ((tokens: RaydiumToken[]) => void)[] = [];

  constructor() {}

  // Obtener pools nuevos de Raydium (incluye Launchpad)
  async fetchNewPools(limit: number = 50): Promise<RaydiumPool[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/pools/info/list?poolType=all&poolSortField=default&sortType=desc&pageSize=${limit}&page=1`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        this.pools = data.data.data || [];
        this.lastFetch = Date.now();
        
        // Convertir pools a tokens para compatibilidad
        const newTokens = this.convertPoolsToTokens(this.pools);
        this.tokens = newTokens;
        
        // Notificar a los listeners
        this.listeners.forEach(listener => listener(newTokens));
        
        return this.pools;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching pools from Raydium:', error);
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
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.fetchInterval = intervalMs;
    
    // Fetch inmediato
    this.fetchNewPools();
    
    // Configurar polling
    this.pollIntervalId = setInterval(() => {
      this.fetchNewPools();
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
  getStatus(): { connected: boolean; lastUpdate: number; tokenCount: number } {
    return {
      connected: this.isPolling,
      lastUpdate: this.lastFetch,
      tokenCount: this.tokens.length
    };
  }
}

// Exportar instancia única
export const raydiumService = new RaydiumService();
