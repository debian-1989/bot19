/**
 * Detector On-Chain de Pump.fun
 * 
 * Se suscribe al programa Pump.fun via WebSocket
 * Detecta creación de nuevos tokens en tiempo real
 * Parsea eventos y los publica internamente
 */

const { PublicKey } = require('@solana/web3.js');
const { getConnectionManager } = require('../solana/connection');
const { getConfig } = require('../config');

class PumpFunDetector {
  constructor() {
    this.config = getConfig();
    this.connectionManager = getConnectionManager();
    
    this.subscriptionId = null;
    this.isListening = false;
    this.lastProcessedSlot = null;
    
    // Deduplicación
    this.processedSignatures = new Set();
    this.processedMints = new Set();
    this.maxSignatureHistory = 10000;
    
    // Métricas
    this.metrics = {
      eventsReceived: 0,
      eventsProcessed: 0,
      eventsDuplicated: 0,
      eventsFailed: 0,
      lastEventAt: null,
      lastSlot: null
    };
    
    // Listeners de eventos
    this.eventListeners = [];
    
    // Programa Pump.fun
    this.pumpProgramId = new PublicKey(this.config.pumpProgramId);
  }

  async start() {
    console.log('[PumpFun] Iniciando detector on-chain...');
    
    try {
      const connection = this.connectionManager.getConnection();
      
      // Suscribir a logs del programa Pump.fun
      this.subscriptionId = connection.onLogs(
        this.pumpProgramId,
        async (logs, context) => {
          await this.handleLogs(logs, context);
        },
        this.config.commitmentProcessed
      );
      
      this.isListening = true;
      this.connectionManager.setWebSocketStatus(true);
      console.log('[PumpFun] ✅ Suscrito a logs del programa Pump.fun');
      console.log(`[PumpFun] Subscription ID: ${this.subscriptionId}`);
      
    } catch (error) {
      console.error('[PumpFun] ❌ Error iniciando detector:', error.message);
      throw error;
    }
  }

  async handleLogs(logs, context) {
    this.metrics.eventsReceived++;
    
    try {
      // Extraer información del log
      const { signature, err, logs: logMessages } = logs;
      const slot = context.slot;
      
      // Actualizar métricas
      this.metrics.lastSlot = slot;
      this.metrics.lastEventAt = Date.now();
      this.lastProcessedSlot = slot;
      this.connectionManager.status.lastEventAt = this.metrics.lastEventAt;
      
      // Ignorar transacciones fallidas
      if (err) {
        console.log(`[PumpFun] Transacción fallida ignorada: ${signature}`);
        return;
      }
      
      // Deduplicación por signature
      if (this.processedSignatures.has(signature)) {
        this.metrics.eventsDuplicated++;
        return;
      }
      
      // Parsear logs para detectar creación de tokens
      const tokenEvent = await this.parseTokenCreation(logMessages, signature, slot);
      
      if (tokenEvent) {
        // Deduplicación por mint
        if (this.processedMints.has(tokenEvent.mint)) {
          this.metrics.eventsDuplicated++;
          return;
        }
        
        // Marcar como procesado
        this.processedSignatures.add(signature);
        this.processedMints.add(tokenEvent.mint);
        
        // Limpiar historial si es muy grande
        if (this.processedSignatures.size > this.maxSignatureHistory) {
          const signaturesArray = Array.from(this.processedSignatures);
          this.processedSignatures = new Set(signaturesArray.slice(-this.maxSignatureHistory / 2));
        }
        
        this.metrics.eventsProcessed++;
        this.lastProcessedSlot = slot;
        
        console.log(`[PumpFun] 🆕 Nuevo token detectado: ${tokenEvent.symbol} (${tokenEvent.mint})`);
        console.log(`[PumpFun]    Signature: ${signature}`);
        console.log(`[PumpFun]    Slot: ${slot}`);
        
        // Notificar a listeners
        this.notifyListeners(tokenEvent);
      }
      
    } catch (error) {
      this.metrics.eventsFailed++;
      console.error('[PumpFun] Error procesando logs:', error.message);
    }
  }

  async parseTokenCreation(logMessages, signature, slot) {
    try {
      // Solo aceptar instrucciones explícitas de creación de Pump.fun.
      // Initialize/Create de otros programas produce falsos positivos.
      const hasPumpCreateInstruction = logMessages.some((log) =>
        /Program log:\s+Instruction:\s+(Create|create_v2)\b/.test(log) ||
        /Instruction:\s+(Create|create_v2)\b/.test(log)
      );

      if (!hasPumpCreateInstruction) {
        return null;
      }

      // El mint no se obtiene de la primera cadena base58 de los logs.
      // Se consulta la transacción y se validan únicamente mints SPL.
      const connection = this.connectionManager.getConnection();
      const transaction = await connection.getParsedTransaction(signature, {
        commitment: this.config.commitmentConfirm,
        maxSupportedTransactionVersion: 0
      });
      const postTokenBalances = transaction?.meta?.postTokenBalances || [];
      const candidateMints = [...new Set(postTokenBalances.map((balance) => balance.mint).filter(Boolean))];
      const mint = await this.findValidMint(candidateMints);

      if (!mint) {
        return null;
      }

      const accountKeys = transaction?.transaction?.message?.accountKeys || [];
      const creatorKey = accountKeys.find((key) => key.signer);
      const creator = creatorKey?.pubkey?.toString() || null;
      const logText = logMessages.join(' ');
      const nameMatch = logText.match(/name[:\s]+([^\s,]+)/i);
      const symbolMatch = logText.match(/symbol[:\s]+([^\s,]+)/i);

      // Crear evento normalizado
      return {
        id: `${signature}-${mint}`,
        platform: 'pumpfun',
        mint: mint,
        creator: creator,
        signature: signature,
        slot: slot,
        createdAt: Date.now(),
        name: nameMatch ? nameMatch[1] : `Token_${mint.substring(0, 8)}`,
        symbol: symbolMatch ? symbolMatch[1] : mint.substring(0, 6).toUpperCase(),
        raw: {
          logs: logMessages,
          candidateMints
        }
      };
      
    } catch (error) {
      console.error('[PumpFun] Error parseando token creation:', error.message);
      return null;
    }
  }

  async findValidMint(candidateMints) {
    const excludedMints = new Set([
      'So11111111111111111111111111111111111111112',
      '11111111111111111111111111111111'
    ]);
    const tokenProgramOwners = new Set([
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
    ]);

    for (const mint of candidateMints) {
      if (excludedMints.has(mint)) continue;
      try {
        const info = await this.connectionManager.getConnection().getParsedAccountInfo(
          new PublicKey(mint),
          this.config.commitmentConfirm
        );
        if (info.value && tokenProgramOwners.has(info.value.owner.toString())) {
          return mint;
        }
      } catch (error) {
        console.warn(`[PumpFun] No se pudo validar mint ${mint}: ${error.message}`);
      }
    }

    return null;
  }

  onNewToken(callback) {
    this.eventListeners.push(callback);
    
    // Retornar función para desuscribirse
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== callback);
    };
  }

  notifyListeners(event) {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[PumpFun] Error en listener:', error.message);
      }
    });
  }

  async stop() {
    console.log('[PumpFun] Deteniendo detector...');
    
    if (this.subscriptionId !== null) {
      try {
        const connection = this.connectionManager.getConnection();
        await connection.removeOnLogsListener(this.subscriptionId);
        console.log('[PumpFun] ✅ Suscripción removida');
      } catch (error) {
        console.error('[PumpFun] Error removiendo suscripción:', error.message);
      }
    }
    
    this.isListening = false;
    this.connectionManager.setWebSocketStatus(false);
    this.subscriptionId = null;
  }

  getStatus() {
    return {
      isListening: this.isListening,
      subscriptionId: this.subscriptionId,
      lastProcessedSlot: this.lastProcessedSlot,
      metrics: this.metrics,
      pumpProgramId: this.config.pumpProgramId,
      processedSignatures: this.processedSignatures.size,
      processedMints: this.processedMints.size
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      isListening: this.isListening,
      lastProcessedSlot: this.lastProcessedSlot
    };
  }
}

// Singleton
let detectorInstance = null;

function getPumpFunDetector() {
  if (!detectorInstance) {
    detectorInstance = new PumpFunDetector();
  }
  return detectorInstance;
}

module.exports = { 
  getPumpFunDetector, 
  PumpFunDetector 
};
