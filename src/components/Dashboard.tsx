import React from 'react';
import { BotStats, DetectedTransaction, Trade } from '../types';

interface DashboardProps {
  stats: BotStats;
  logs: string[];
  detectedTxns: DetectedTransaction[];
  trades: Trade[];
  isRunning: boolean;
}

export default function Dashboard({ stats, logs, detectedTxns, trades, isRunning }: DashboardProps) {
  const openTrades = trades.filter(t => t.status === 'open');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total de Operaciones" value={stats.totalTrades.toString()} icon="📈" color="blue" />
        <StatCard title="Tasa de Éxito" value={`${stats.winRate.toFixed(1)}%`} icon="🎯" color="green" />
        <StatCard title="Ganancia Total" value={`${stats.totalProfit.toFixed(4)} SOL`} icon="💰" color={stats.totalProfit >= 0 ? 'green' : 'red'} />
        <StatCard title="Ganancia Promedio/Operación" value={`${stats.avgProfitPerTrade.toFixed(4)} SOL`} icon="📊" color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Mejor Operación" value={`${stats.bestTrade.toFixed(1)}%`} icon="🏆" color="yellow" />
        <StatCard title="Peor Operación" value={`${stats.worstTrade.toFixed(1)}%`} icon="📉" color="red" />
        <StatCard title="Volumen Total" value={`${stats.totalVolume.toFixed(3)} SOL`} icon="🔄" color="cyan" />
      </div>

      {isRunning && (
        <div className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl border border-purple-500/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-white">Conectado a Pump.fun</p>
                <p className="text-xs text-gray-400">
                  Monitoreando tokens reales en tiempo real • 
                  <span className="text-purple-400 ml-1">pump.fun</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Tokens detectados</p>
              <p className="text-lg font-bold text-purple-400">{detectedTxns.length}</p>
            </div>
          </div>
        </div>
      )}

      {isRunning && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span>💼</span> Gestión de Capital en Tiempo Real
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Balance Total</p>
              <p className="text-xl font-bold text-white">1.00 SOL</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Capital Disponible</p>
              <p className="text-xl font-bold text-green-400">
                {(1.00 - trades.filter(t => t.status === 'open').reduce((sum, t) => sum + t.buyAmount, 0)).toFixed(3)} SOL
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">En Posiciones</p>
              <p className="text-xl font-bold text-yellow-400">
                {trades.filter(t => t.status === 'open').reduce((sum, t) => sum + t.buyAmount, 0).toFixed(3)} SOL
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Trades Posibles</p>
              <p className="text-xl font-bold text-blue-400">
                {Math.floor((1.00 - trades.filter(t => t.status === 'open').reduce((sum, t) => sum + t.buyAmount, 0)) / 0.1)}
              </p>
              <p className="text-xs text-gray-500">a 0.1 SOL c/u</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span>📋</span> Registro de Actividad
            </h3>
            <span className="text-xs text-gray-400">{logs.length} entradas</span>
          </div>
          <div className="p-4 h-80 overflow-auto">
            {!isRunning && logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p className="text-4xl mb-2">🤖</p>
                  <p className="text-sm">Inicia el bot para ver actividad</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className="text-xs font-mono text-gray-300 py-1 px-2 rounded hover:bg-gray-800/50">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span>🔥</span> Posiciones Abiertas
            </h3>
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">
              {openTrades.length} activas
            </span>
          </div>
          <div className="p-4 h-80 overflow-auto">
            {openTrades.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p className="text-4xl mb-2">💤</p>
                  <p className="text-sm">Sin posiciones abiertas</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {openTrades.map(trade => (
                  <div key={trade.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-white">${trade.tokenSymbol}</p>
                        <p className="text-xs text-gray-400">{trade.tokenName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-yellow-400">{trade.buyAmount.toFixed(3)} SOL</p>
                        <p className="text-xs text-gray-400">@ {trade.buyPrice.toFixed(8)}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                        <div className="bg-yellow-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                      </div>
                      <span className="text-xs text-yellow-400">Esperando...</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span>🔍</span> Detecciones Recientes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-800">
                <th className="px-4 py-3 text-left">Token</th>
                <th className="px-4 py-3 text-left">Monto Compra</th>
                <th className="px-4 py-3 text-left">Comprador</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Hora</th>
              </tr>
            </thead>
            <tbody>
              {detectedTxns.slice(0, 8).map(tx => (
                <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm text-white">${tx.tokenSymbol}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-yellow-400">{tx.buyAmount.toFixed(3)} SOL</td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{tx.buyerAddress.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {tx.timestamp.toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    green: 'from-green-500/10 to-green-600/5 border-green-500/20',
    red: 'from-red-500/10 to-red-600/5 border-red-500/20',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
    yellow: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20',
    cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl border p-5`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-xs text-gray-400 mb-1">{title}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    detected: 'bg-blue-500/20 text-blue-400',
    sniped: 'bg-yellow-500/20 text-yellow-400',
    sold: 'bg-green-500/20 text-green-400',
    missed: 'bg-gray-500/20 text-gray-400',
    failed: 'bg-red-500/20 text-red-400',
  };

  const labels: Record<string, string> = {
    detected: 'DETECTADO',
    sniped: 'SNIPE',
    sold: 'VENDIDO',
    missed: 'PERDIDO',
    failed: 'FALLIDO',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.detected}`}>
      {labels[status] || status.toUpperCase()}
    </span>
  );
}
