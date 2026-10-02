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
    // Buscar patrones de creación de token en los logs
    // Esto es un parser básico - en producción necesitarías el IDL completo
    
    try {
      // Buscar instrucciones de creación
      const createInstructions = logMessages.filter(log => 
        log.includes('Create') || 
        log.includes('Initialize') ||
        log.includes('create_v2')
      );
      
      if (createInstructions.length === 0) {
        return null;
      }
      
      // Extraer información del log
      // Nota: Este es un parser simplificado. En producción necesitarías:
      // 1. El IDL completo del programa Pump.fun
      // 2. Parsing binario de los datos de la instrucción
      // 3. Extracción de cuentas involucradas
      
      // Por ahora, extraemos información básica de los logs
      let mint = null;
      let creator = null;
      let name = null;
      let symbol = null;
      
      // Buscar addresses en los logs (formato base58)
      const addressPattern = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
      const addresses = logMessages.join(' ').match(addressPattern) || [];
      
      if (addresses.length > 0) {
        mint = addresses[0]; // Primer address suele ser el mint
      }
      
      if (addresses.length > 1) {
        creator = addresses[1]; // Segundo address suele ser el creador
      }
      
      // Buscar nombre y símbolo en los logs (si están presentes)
      const nameMatch = logMessages.join(' ').match(/name[:\s]+([^\s,]+)/i);
      const symbolMatch = logMessages.join(' ').match(/symbol[:\s]+([^\s,]+)/i);
      
      if (nameMatch) name = nameMatch[1];
      if (symbolMatch) symbol = symbolMatch[1];
      
      if (!mint) {
        return null;
      }
      
      // Crear evento normalizado
      return {
        id: `${signature}-${mint}`,
        platform: 'pumpfun',
        mint: mint,
        creator: creator,
        signature: signature,
        slot: slot,
        createdAt: Date.now(),
        name: name || `Token_${mint.substring(0, 8)}`,
        symbol: symbol || mint.substring(0, 6).toUpperCase(),
        raw: {
          logs: logMessages,
          addresses: addresses
        }
      };
      
    } catch (error) {
      console.error('[PumpFun] Error parseando token creation:', error.message);
      return null;
    }
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
