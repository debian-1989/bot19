import React from 'react';
import { Trade } from '../types';

interface TradeHistoryProps {
  trades: Trade[];
}

export default function TradeHistory({ trades }: TradeHistoryProps) {
  const closedTrades = trades.filter(t => t.status === 'closed');
  const solClosed = closedTrades.filter(t => t.quoteCurrency !== 'USDT');
  const btcClosed = closedTrades.filter(t => t.quoteCurrency === 'USDT');
  const solProfit = solClosed.reduce((sum, t) => sum + (t.profit || 0), 0);
  const btcProfit = btcClosed.reduce((sum, t) => sum + (t.profit || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-400">Total de Operaciones</p>
          <p className="text-2xl font-bold text-white">{trades.length}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-400">Posiciones Abiertas</p>
          <p className="text-2xl font-bold text-yellow-400">{trades.filter(t => t.status === 'open').length}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-400">Operaciones Cerradas</p>
          <p className="text-2xl font-bold text-blue-400">{closedTrades.length}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-400">G/P Realizado</p>
          <p className={`text-2xl font-bold ${solProfit + btcProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <span>{solProfit >= 0 ? '+' : ''}{solProfit.toFixed(4)} SOL</span>
            <small className="block text-xs text-orange-300 mt-1">{btcProfit >= 0 ? '+' : ''}{btcProfit.toFixed(2)} USDT</small>
          </p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-800 bg-gray-800/30">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Hora</th>
                <th className="px-4 py-3 text-left">Token</th>
                <th className="px-4 py-3 text-left">Compra</th>
                <th className="px-4 py-3 text-left">Venta</th>
                <th className="px-4 py-3 text-left">G/P</th>
                <th className="px-4 py-3 text-left">G/P %</th>
                <th className="px-4 py-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <span className="text-5xl mb-3">📜</span>
                      <p className="text-sm">Sin operaciones aún</p>
                    </div>
                  </td>
                </tr>
              ) : (
                trades.slice(0, 50).map((trade, idx) => (
                  <tr key={trade.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-xs text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {trade.timestamp.toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-sm text-white">${trade.tokenSymbol}</p>
                      <p className="text-xs text-gray-500">{trade.tokenName}</p>
                      {trade.platform === 'bitcoin' && <span className={`text-[10px] font-bold ${trade.direction === 'short' ? 'text-red-300' : 'text-green-300'}`}>{trade.direction === 'short' ? 'SHORT SIMULADO' : 'LONG'}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-semibold ${trade.quoteCurrency === 'USDT' ? 'text-orange-300' : 'text-yellow-400'}`}>{trade.buyAmount.toFixed(trade.quoteCurrency === 'USDT' ? 2 : 3)} {trade.quoteCurrency || 'SOL'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {trade.sellAmount ? (
                        <p className="text-sm text-blue-400 font-semibold">{trade.sellAmount.toFixed(trade.quoteCurrency === 'USDT' ? 2 : 4)} {trade.quoteCurrency || 'SOL'}</p>
                      ) : (
                        <span className="text-xs text-gray-600">Pendiente...</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {trade.profit !== undefined ? (
                        <span className={`text-sm font-bold ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(trade.quoteCurrency === 'USDT' ? 2 : 4)} {trade.quoteCurrency || 'SOL'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {trade.profitPercent !== undefined ? (
                        <span className={`text-sm font-bold ${trade.profitPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.profitPercent >= 0 ? '+' : ''}{trade.profitPercent.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        trade.status === 'open' ? 'bg-yellow-500/20 text-yellow-400' :
                        trade.status === 'closed' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.status === 'open' ? 'ABIERTA' : trade.status === 'closed' ? 'CERRADA' : 'FALLIDA'}
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
