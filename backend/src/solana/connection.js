/**
 * Módulo de Conexión Solana Centralizado
 * 
 * Gestiona conexiones HTTP y WebSocket a Solana RPC
 * Implementa reconexión automática, health checks y fallback
 */

const { Connection, PublicKey, ComputeBudgetProgram, Transaction } = require('@solana/web3.js');
const { getConfig } = require('../config');

class SolanaConnectionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'SolanaConnectionError';
    this.code = code;
  }
}

class SolanaConnectionManager {
  constructor() {
    this.config = getConfig();
    this.activeRpcUrl = this.config.solanaRpcUrl;
    this.httpConnection = null;
    this.wsConnection = null;
    this.fallbackHttpConnection = null;
    this.fallbackWsConnection = null;
    
    this.status = {
      httpConnected: false,
      wsConnected: false,
      lastHealthCheck: null,
      lastSlot: null,
      lastEventAt: null,
      latencyMs: null,
      errors: [],
      usingFallback: false
    };
    
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    
    this.healthCheckInterval = null;
    this.heartbeatInterval = null;
    this.connectionChangeListeners = new Set();
  }

  async initialize() {
    console.log('[Solana] Inicializando conexiones...');
    
    // Crear conexión HTTP principal
    try {
      this.httpConnection = new Connection(
        this.config.solanaRpcUrl,
        { 
          commitment: this.config.commitmentConfirm,
          wsEndpoint: this.config.solanaWsUrl
        }
      );
      console.log('[Solana] ✅ Conexión HTTP creada');
    } catch (error) {
      throw new SolanaConnectionError(`Error creando conexión HTTP: ${error.message}`, 'HTTP_INIT_FAILED');
    }

    // Crear conexión de respaldo si está configurada
    if (this.config.solanaRpcFallback) {
      try {
        this.fallbackHttpConnection = new Connection(
          this.config.solanaRpcFallback,
          {
            commitment: this.config.commitmentConfirm,
            wsEndpoint: this.config.solanaWsFallback
          }
        );
        console.log('[Solana] ✅ Conexión HTTP de respaldo creada');
      } catch (error) {
        console.warn('[Solana] ⚠️ Error creando conexión de respaldo:', error.message);
      }
    }

    // Validar conexión
    await this.validateConnection();
    
    // Iniciar health checks periódicos
    this.startHealthChecks();
    
    console.log('[Solana] ✅ Conexiones inicializadas');
  }

  async validateConnection() {
    console.log('[Solana] Validando conexión...');
    
    const tests = [
      { name: 'getVersion', fn: () => this.httpConnection.getVersion() },
      { name: 'getSlot', fn: () => this.httpConnection.getSlot() },
      { name: 'getLatestBlockhash', fn: () => this.httpConnection.getLatestBlockhash() }
    ];

    for (const test of tests) {
      try {
        const start = Date.now();
        await test.fn();
        const latency = Date.now() - start;
        console.log(`[Solana] ✅ ${test.name} OK (${latency}ms)`);
        
        if (test.name === 'getSlot') {
          this.status.lastSlot = await this.httpConnection.getSlot();
        }
      } catch (error) {
        console.error(`[Solana] ❌ ${test.name} falló:`, error.message);
        
        // Intentar con fallback si está disponible
        if (this.fallbackHttpConnection) {
          console.log('[Solana] Intentando con RPC de respaldo...');
          try {
            await this.switchToFallback();
            return;
          } catch (fallbackError) {
            throw new SolanaConnectionError(
              `Ambos RPCs fallaron. Principal: ${error.message}, Respaldo: ${fallbackError.message}`,
              'ALL_RPCS_FAILED'
            );
          }
        }
        
        throw new SolanaConnectionError(`Validación falló en ${test.name}: ${error.message}`, 'VALIDATION_FAILED');
      }
    }

    this.status.httpConnected = true;
    this.status.lastHealthCheck = Date.now();
  }

  async switchToFallback() {
    if (!this.fallbackHttpConnection) {
      throw new Error('No hay conexión de respaldo configurada');
    }

    console.log('[Solana] Cambiando a RPC de respaldo...');
    
    // Validar respaldo
    await this.fallbackHttpConnection.getVersion();
    
    // Intercambiar conexiones
    const temp = this.httpConnection;
    this.httpConnection = this.fallbackHttpConnection;
    this.fallbackHttpConnection = temp;
    
    this.status.usingFallback = !this.status.usingFallback;
    this.activeRpcUrl = this.status.usingFallback
      ? this.config.solanaRpcFallback
      : this.config.solanaRpcUrl;
    this.status.httpConnected = true;
    this.status.wsConnected = false;
    this.status.lastHealthCheck = Date.now();
    console.log(`[Solana] ✅ Cambiado a RPC ${this.status.usingFallback ? 'de respaldo' : 'principal'}`);
    for (const listener of this.connectionChangeListeners) {
      try {
        await listener({ usingFallback: this.status.usingFallback });
      } catch (error) {
        console.error('[Solana] Error notificando cambio de RPC:', error.message);
      }
    }
  }

  startHealthChecks() {
    // Health check cada 30 segundos
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('[Solana] Health check falló:', error.message);
        this.status.errors.push({
          timestamp: Date.now(),
          error: error.message,
          code: error.code
        });
        
        // Mantener solo los últimos 10 errores
        if (this.status.errors.length > 10) {
          this.status.errors.shift();
        }
      }
    }, 30000);

    console.log('[Solana] Health checks iniciados (cada 30s)');
  }

  async performHealthCheck() {
    const start = Date.now();
    
    try {
      const [version, slot, blockhash] = await Promise.all([
        this.httpConnection.getVersion(),
        this.httpConnection.getSlot(),
        this.httpConnection.getLatestBlockhash()
      ]);

      const latency = Date.now() - start;
      
      this.status.httpConnected = true;
      this.status.lastHealthCheck = Date.now();
      this.status.lastSlot = slot;
      this.status.latencyMs = latency;
      
      console.log(`[Solana] Health check OK - Slot: ${slot}, Latencia: ${latency}ms`);
      
      return {
        healthy: true,
        version: version['solana-core'],
        slot,
        latency,
        timestamp: Date.now()
      };
    } catch (error) {
      this.status.httpConnected = false;
      if (this.fallbackHttpConnection) {
        try {
          await this.switchToFallback();
          return { healthy: true, usingFallback: this.status.usingFallback };
        } catch (fallbackError) {
          throw new SolanaConnectionError(
            `Health check falló en ambos RPCs. Principal: ${error.message}, Alterno: ${fallbackError.message}`,
            'ALL_RPCS_FAILED'
          );
        }
      }
      throw new SolanaConnectionError(`Health check falló: ${error.message}`, 'HEALTH_CHECK_FAILED');
    }
  }

  getConnection() {
    if (!this.httpConnection) {
      throw new SolanaConnectionError('Conexión no inicializada', 'NOT_INITIALIZED');
    }
    return this.httpConnection;
  }

  async getBalance(publicKey) {
    const connection = this.getConnection();
    return await connection.getBalance(publicKey);
  }

  async getLatestBlockhash() {
    const connection = this.getConnection();
    return await connection.getLatestBlockhash();
  }

  setWebSocketStatus(connected) {
    this.status.wsConnected = Boolean(connected);
    if (connected) {
      this.status.lastEventAt = Date.now();
    }
  }

  onConnectionChange(callback) {
    this.connectionChangeListeners.add(callback);
    return () => this.connectionChangeListeners.delete(callback);
  }

  async getSlot() {
    const connection = this.getConnection();
    return await connection.getSlot();
  }

  async sendTransaction(transaction, signers) {
    const connection = this.getConnection();
    if (transaction instanceof Transaction && this.config.selectedPriorityFee > 0) {
      const hasPriorityInstruction = transaction.instructions.some((instruction) =>
        instruction.programId.equals(ComputeBudgetProgram.programId)
      );
      if (!hasPriorityInstruction) {
        transaction.add(ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: this.config.selectedPriorityFee
        }));
      }
    }
    return await connection.sendTransaction(transaction, signers, {
      skipPreflight: false,
      preflightCommitment: this.config.commitmentConfirm
    });
  }

  async confirmTransaction(signature, commitment) {
    const connection = this.getConnection();
    return await connection.confirmTransaction(signature, commitment || this.config.commitmentConfirm);
  }

  getStatus() {
    return {
      ...this.status,
      usingFallback: this.status.usingFallback,
      rpcUrl: this.activeRpcUrl ? this.activeRpcUrl.substring(0, 50) + '...' : 'No configurado',
      reconnectAttempts: this.reconnectAttempts
    };
  }

  async shutdown() {
    console.log('[Solana] Cerrando conexiones...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.status.wsConnected = false;
    
    console.log('[Solana] ✅ Conexiones cerradas');
  }
}

// Singleton
let connectionManagerInstance = null;

function getConnectionManager() {
  if (!connectionManagerInstance) {
    connectionManagerInstance = new SolanaConnectionManager();
  }
  return connectionManagerInstance;
}

module.exports = { 
  getConnectionManager, 
  SolanaConnectionManager, 
  SolanaConnectionError 
};
