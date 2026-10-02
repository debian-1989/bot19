import React, { useState, useEffect } from 'react';
import { pumpFunRealService } from '../services/pumpfun-real';
import { raydiumService } from '../services/raydium';

interface ConnectionStatus {
  pumpfun: {
    connected: boolean;
    mode: 'real' | 'fallback' | 'disconnected';
    tokenCount: number;
    lastUpdate: number;
    error?: string;
    polling: boolean;
  };
  raydium: {
    connected: boolean;
    mode: 'real' | 'fallback' | 'disconnected';
    tokenCount: number;
    lastUpdate: number;
    error?: string;
    polling: boolean;
  };
  solana: {
    connected: boolean;
    rpcEndpoint: string;
    latency?: number;
    error?: string;
  };
}

export default function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    pumpfun: {
      connected: false,
      mode: 'disconnected',
      tokenCount: 0,
      lastUpdate: 0,
      polling: false,
    },
    raydium: {
      connected: false,
      mode: 'disconnected',
      tokenCount: 0,
      lastUpdate: 0,
      polling: false,
    },
    solana: {
      connected: false,
      rpcEndpoint: 'https://api.mainnet-beta.solana.com',
    },
  });

  const [testing, setTesting] = useState(false);

  // Actualizar estado cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      const pumpStatus = pumpFunRealService.getStatus();
      const rayStatus = raydiumService.getStatus();

      setStatus(prev => ({
        ...prev,
        pumpfun: {
          ...prev.pumpfun,
          connected: pumpStatus.connected,
          tokenCount: pumpStatus.tokenCount,
          lastUpdate: pumpStatus.lastUpdate,
          polling: pumpStatus.connected,
          mode: pumpStatus.tokenCount > 0 ? (pumpStatus.isFallback ? 'fallback' : 'real') : 'disconnected',
        },
        raydium: {
          ...prev.raydium,
          connected: rayStatus.connected,
          tokenCount: rayStatus.tokenCount,
          lastUpdate: rayStatus.lastUpdate,
          polling: rayStatus.connected,
          mode: rayStatus.tokenCount > 0 ? (rayStatus.isFallback ? 'fallback' : 'real') : 'disconnected',
        },
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Probar conexión a Solana RPC
  const testSolanaConnection = async () => {
    try {
      const start = Date.now();
      
      // Usar un método RPC que siempre funcione
      const response = await fetch(status.solana.rpcEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getVersion',
        }),
      });
      
      const latency = Date.now() - start;
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Solana RPC] Connected:', data);
        
        setStatus(prev => ({
          ...prev,
          solana: {
            ...prev.solana,
            connected: true,
            latency,
            error: undefined,
          },
        }));
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('[Solana RPC] Error:', error);
      setStatus(prev => ({
        ...prev,
        solana: {
          ...prev.solana,
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    }
  };

  // Probar conexión a pump.fun
  const testPumpFunConnection = async () => {
    try {
      const tokens = await pumpFunRealService.fetchLatestTokens(10);
      setStatus(prev => ({
        ...prev,
        pumpfun: {
          ...prev.pumpfun,
          connected: tokens.length > 0,
          mode: pumpFunRealService.getStatus().isFallback ? 'fallback' : 'real',
          error: undefined,
        },
      }));
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        pumpfun: {
          ...prev.pumpfun,
          connected: false,
          mode: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    }
  };

  // Probar conexión a Raydium
  const testRaydiumConnection = async () => {
    try {
      const pools = await raydiumService.fetchNewPools(10);
      setStatus(prev => ({
        ...prev,
        raydium: {
          ...prev.raydium,
          connected: pools.length > 0,
          mode: raydiumService.getStatus().isFallback ? 'fallback' : 'real',
          error: undefined,
        },
      }));
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        raydium: {
          ...prev.raydium,
          connected: false,
          mode: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    }
  };

  // Probar todas las conexiones
  const testAllConnections = async () => {
    setTesting(true);
    await Promise.all([
      testSolanaConnection(),
      testPumpFunConnection(),
      testRaydiumConnection(),
    ]);
    setTesting(false);
  };

  const formatTime = (timestamp: number) => {
    if (timestamp === 0) return 'Nunca';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `Hace ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `Hace ${hours}h`;
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'real': return 'text-green-400 bg-green-500/20';
      case 'fallback': return 'text-yellow-400 bg-yellow-500/20';
      case 'disconnected': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🔌</span> Estado de Conexiones
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Diagnóstico en tiempo real de todas las APIs y nodos
            </p>
          </div>
          <button
            onClick={testAllConnections}
            disabled={testing}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              testing
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/30'
            }`}
          >
            {testing ? '🔄 Probando...' : '🔍 Probar Todas'}
          </button>
        </div>
      </div>

      {/* Connection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pump.fun */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span>🎯</span> Pump.fun
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getModeColor(status.pumpfun.mode)}`}>
              {status.pumpfun.mode === 'real' ? '✅ REAL' : status.pumpfun.mode === 'fallback' ? '⚠️ FALLBACK' : '❌ OFF'}
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Estado:</span>
              <span className={status.pumpfun.connected ? 'text-green-400' : 'text-red-400'}>
                {status.pumpfun.connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Modo:</span>
              <span className="text-gray-300">{status.pumpfun.mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tokens:</span>
              <span className="text-white font-semibold">{status.pumpfun.tokenCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Polling:</span>
              <span className={status.pumpfun.polling ? 'text-green-400' : 'text-gray-500'}>
                {status.pumpfun.polling ? 'Activo (1s)' : 'Inactivo'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Última actualización:</span>
              <span className="text-gray-300">{formatTime(status.pumpfun.lastUpdate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Proxy CORS:</span>
              <span className="text-blue-400">Activo</span>
            </div>
            {status.pumpfun.error && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                Error: {status.pumpfun.error}
              </div>
            )}
          </div>

          <button
            onClick={testPumpFunConnection}
            className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Probar Conexión
          </button>
        </div>

        {/* Raydium */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span>🌊</span> Raydium
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getModeColor(status.raydium.mode)}`}>
              {status.raydium.mode === 'real' ? '✅ REAL' : status.raydium.mode === 'fallback' ? '⚠️ FALLBACK' : '❌ OFF'}
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Estado:</span>
              <span className={status.raydium.connected ? 'text-green-400' : 'text-red-400'}>
                {status.raydium.connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Modo:</span>
              <span className="text-gray-300">{status.raydium.mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tokens:</span>
              <span className="text-white font-semibold">{status.raydium.tokenCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Polling:</span>
              <span className={status.raydium.polling ? 'text-green-400' : 'text-gray-500'}>
                {status.raydium.polling ? 'Activo (5s)' : 'Inactivo'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Última actualización:</span>
              <span className="text-gray-300">{formatTime(status.raydium.lastUpdate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Proxy CORS:</span>
              <span className="text-blue-400">Activo</span>
            </div>
            {status.raydium.error && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                Error: {status.raydium.error}
              </div>
            )}
          </div>

          <button
            onClick={testRaydiumConnection}
            className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Probar Conexión
          </button>
        </div>

        {/* Solana RPC */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span>⚡</span> Solana RPC
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              status.solana.connected ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'
            }`}>
              {status.solana.connected ? '✅ ONLINE' : '❌ OFFLINE'}
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Estado:</span>
              <span className={status.solana.connected ? 'text-green-400' : 'text-red-400'}>
                {status.solana.connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Latencia:</span>
              <span className={status.solana.latency && status.solana.latency < 500 ? 'text-green-400' : 'text-yellow-400'}>
                {status.solana.latency ? `${status.solana.latency}ms` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">RPC:</span>
              <span className="text-gray-300 text-xs truncate max-w-[150px]">
                {status.solana.rpcEndpoint.replace('https://', '')}
              </span>
            </div>
            {status.solana.error && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                Error: {status.solana.error}
              </div>
            )}
          </div>

          <button
            onClick={testSolanaConnection}
            className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Probar Conexión
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <span>📊</span> Resumen del Sistema
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-2">Conexiones Activas:</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status.pumpfun.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-300">Pump.fun: {status.pumpfun.connected ? 'OK' : 'FALLA'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status.raydium.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-300">Raydium: {status.raydium.connected ? 'OK' : 'FALLA'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status.solana.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-300">Solana RPC: {status.solana.connected ? 'OK' : 'FALLA'}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-2">Total de Tokens Detectados:</p>
            <p className="text-2xl font-bold text-white">
              {status.pumpfun.tokenCount + status.raydium.tokenCount}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Pump.fun: {status.pumpfun.tokenCount} | Raydium: {status.raydium.tokenCount}
            </p>
          </div>
        </div>

        {/* Status Message */}
        <div className={`mt-4 p-3 rounded-lg border ${
          status.pumpfun.connected && status.raydium.connected && status.solana.connected
            ? 'bg-green-500/10 border-green-500/20'
            : status.pumpfun.mode === 'fallback' || status.raydium.mode === 'fallback'
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-red-500/10 border-red-500/20'
        }`}>
          <p className={`text-sm font-semibold ${
            status.pumpfun.connected && status.raydium.connected && status.solana.connected
              ? 'text-green-400'
              : status.pumpfun.mode === 'fallback' || status.raydium.mode === 'fallback'
              ? 'text-yellow-400'
              : 'text-red-400'
          }`}>
            {status.pumpfun.connected && status.raydium.connected && status.solana.connected
              ? '✅ Sistema completamente operativo - Todas las APIs funcionando'
              : status.pumpfun.mode === 'fallback' || status.raydium.mode === 'fallback'
              ? '⚠️ Sistema operativo con fallback - APIs reales bloqueadas por CORS, usando tokens simulados'
              : '❌ Sistema con problemas - Verifica las conexiones'}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl border border-blue-500/20 p-5">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <span>ℹ️</span> Información sobre las Conexiones
        </h4>
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            <span className="font-semibold text-green-400">✅ REAL:</span> Conectado a la API real y recibiendo datos en vivo
          </p>
          <p>
            <span className="font-semibold text-yellow-400">⚠️ FALLBACK:</span> API real bloqueada por CORS, usando tokens simulados para demostración
          </p>
          <p>
            <span className="font-semibold text-red-400">❌ OFF:</span> Sin conexión o no inicializado
          </p>
          <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300 font-semibold mb-1">🔒 Proxy CORS Activo</p>
            <p className="text-xs text-gray-400">
              El bot usa un proxy CORS (<code className="bg-gray-800 px-1 rounded">api.allorigins.win</code>) para evitar bloqueos del navegador. 
              Esto permite acceder a las APIs de pump.fun y Raydium directamente desde el frontend.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              <strong>Para producción:</strong> Se recomienda usar tu propio servidor proxy o backend para mayor confiabilidad y velocidad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
