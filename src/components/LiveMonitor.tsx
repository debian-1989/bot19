import React from 'react';
import { DetectedTransaction } from '../types';

interface LiveMonitorProps {
  detectedTxns: DetectedTransaction[];
  isRunning: boolean;
}

export default function LiveMonitor({ detectedTxns, isRunning }: LiveMonitorProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-400">Transacciones Detectadas</p>
          <p className="text-2xl font-bold text-blue-400">{detectedTxns.length}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-400">Snipes Ejecutados</p>
          <p className="text-2xl font-bold text-yellow-400">
            {detectedTxns.filter(t => t.status === 'sniped').length}
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-400">Vendidos (Ganancia)</p>
          <p className="text-2xl font-bold text-green-400">
            {detectedTxns.filter(t => t.status === 'sold').length}
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-400">Perdidos/Fallidos</p>
          <p className="text-2xl font-bold text-red-400">
            {detectedTxns.filter(t => t.status === 'failed' || t.status === 'missed').length}
          </p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            Feed de Transacciones en Vivo
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {isRunning ? 'Monitoreando tokens reales de pump.fun...' : 'Bot detenido'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-800 bg-gray-800/30">
                <th className="px-4 py-3 text-left">Hora</th>
                <th className="px-4 py-3 text-left">Token</th>
                <th className="px-4 py-3 text-left">Comprador</th>
                <th className="px-4 py-3 text-left">Monto</th>
                <th className="px-4 py-3 text-left">Precio</th>
                <th className="px-4 py-3 text-left">Nuestra Entrada</th>
                <th className="px-4 py-3 text-left">Nuestra Salida</th>
                <th className="px-4 py-3 text-left">G/P</th>
                <th className="px-4 py-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {detectedTxns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <span className="text-5xl mb-3">📡</span>
                      <p className="text-sm">
                        {isRunning ? 'Esperando transacciones reales de pump.fun...' : 'Inicia el bot para comenzar el monitoreo'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                detectedTxns.slice(0, 20).map(tx => (
                  <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {tx.timestamp.toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-semibold text-sm text-white">${tx.tokenSymbol}</p>
                          <p className="text-xs text-gray-500">{tx.tokenName}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          tx.platform === 'pump.fun' ? 'bg-blue-500/20 text-blue-400' : tx.platform === 'bitcoin' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {tx.platform === 'pump.fun' ? '🎯 pump' : tx.platform === 'bitcoin' ? '₿ BTC' : '🌊 ray'}
                          {tx.platform === 'bitcoin' && ` · ${tx.direction === 'short' ? 'SHORT' : 'LONG'}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {tx.buyerAddress.slice(0, 6)}...{tx.buyerAddress.slice(-4)}
                    </td>
                    <td className="px-4 py-3 text-sm text-yellow-400 font-semibold">
                      {tx.buyAmount.toFixed(tx.quoteCurrency === 'USDT' ? 2 : 3)} {tx.quoteCurrency || 'SOL'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {tx.estimatedPrice.toFixed(8)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">
                      {tx.ourBuyPrice ? (
                        <span className="text-green-400">{tx.ourBuyPrice.toFixed(8)}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">
                      {tx.ourSellPrice ? (
                        <span className="text-blue-400">{tx.ourSellPrice.toFixed(8)}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {tx.profitPercent !== undefined ? (
                        <span className={`text-sm font-bold ${tx.profitPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.profitPercent >= 0 ? '+' : ''}{tx.profitPercent.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        tx.status === 'detected' ? 'bg-blue-500/20 text-blue-400' :
                        tx.status === 'sniped' ? 'bg-yellow-500/20 text-yellow-400' :
                        tx.status === 'sold' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
