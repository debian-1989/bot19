import React, { useState } from 'react';
import { BotConfig } from '../types';

interface BotConfigPanelProps {
  config: BotConfig;
  setConfig: (config: BotConfig) => void;
  isRunning: boolean;
}

export default function BotConfigPanel({ config, setConfig, isRunning }: BotConfigPanelProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const updateConfig = (key: keyof BotConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      localStorage.setItem('botConfig', JSON.stringify(config));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {isRunning && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-yellow-400">El bot está ejecutándose actualmente</p>
            <p className="text-xs text-yellow-400/70">Detén el bot antes de cambiar parámetros críticos</p>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="font-semibold text-white mb-4">⚙️ Configuración del Bot</h3>

        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Modo de ejecución</p>
              <p className="text-xs text-yellow-300/80 mt-1">
                Demo simula operaciones. Real queda bloqueado hasta habilitar un ejecutor live auditado.
              </p>
            </div>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => updateConfig('executionMode', config.executionMode === 'demo' ? 'real' : 'demo')}
              className={`min-w-28 px-4 py-2 rounded-lg text-sm font-bold ${
                config.executionMode === 'real' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {config.executionMode === 'real' ? '🔴 REAL' : '🔵 DEMO'}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">💰 Monto por Operación (SOL)</label>
            <input
              type="number"
              step="0.01"
              value={config.tradeAmount}
              onChange={e => updateConfig('tradeAmount', parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">₿ Monto por Operación Bitcoin (USDT)</label>
            <input type="number" min="1" step="1" value={config.bitcoinTradeAmountUsd}
              onChange={e => updateConfig('bitcoinTradeAmountUsd', Math.max(1, Number.parseFloat(e.target.value) || 1))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none" />
            <p className="text-xs text-gray-500 mt-1">Saldo Demo inicial separado: 1,000 USDT.</p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">🎯 Plataforma de entrada</label>
            <select
              value={config.entryPlatform}
              disabled={isRunning}
              onChange={e => updateConfig('entryPlatform', e.target.value as BotConfig['entryPlatform'])}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none disabled:opacity-50"
            >
              <option value="both">Solana: Pump.fun + Raydium</option>
              <option value="all">Todas: Solana + Bitcoin</option>
              <option value="solana">Solo red Solana</option>
              <option value="pump.fun">Solo Pump.fun</option>
              <option value="raydium">Solo Raydium</option>
              <option value="bitcoin">Solo Bitcoin (BTC/USDT)</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-3 text-sm text-gray-300 pb-2">
              <input
                type="checkbox"
                checked={config.graduatedOnly}
                disabled={isRunning}
                onChange={e => updateConfig('graduatedOnly', e.target.checked)}
                className="h-4 w-4 accent-green-500"
              />
              Solo tokens graduados de Pump.fun
            </label>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">🔄 Máx. Operaciones Simultáneas</label>
            <input
              type="number"
              step="1"
              value={config.maxConcurrentTrades}
              onChange={e => updateConfig('maxConcurrentTrades', parseInt(e.target.value) || 1)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">💵 Compra Mínima a Detectar (SOL)</label>
            <input
              type="number"
              step="0.01"
              value={config.minDetectedBuySize}
              onChange={e => updateConfig('minDetectedBuySize', parseFloat(e.target.value) || 0.01)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">💎 Compra Máxima a Detectar (SOL)</label>
            <input
              type="number"
              step="0.1"
              value={config.maxDetectedBuySize}
              onChange={e => updateConfig('maxDetectedBuySize', parseFloat(e.target.value) || 5)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">🎯 Take Profit (multiplicador)</label>
            <input
              type="number"
              step="0.1"
              value={config.takeProfitMultiplier}
              onChange={e => updateConfig('takeProfitMultiplier', parseFloat(e.target.value) || 2)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">🛑 Stop Loss (%)</label>
            <input
              type="number"
              step="1"
              value={config.stopLossPercent}
              onChange={e => updateConfig('stopLossPercent', parseInt(e.target.value) || 30)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">📉 Slippage máximo (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={config.slippage}
              onChange={e => {
                const value = Number.parseFloat(e.target.value);
                updateConfig('slippage', Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Variación máxima que aceptarías entre el precio observado y el precio de ejecución.
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">⚡ Prioridad de transacción</label>
            <select
              value={config.gasStrategy}
              disabled={isRunning}
              onChange={e => {
                const strategy = e.target.value as BotConfig['gasStrategy'];
                const priorityFee = strategy === 'standard' ? 5000 : strategy === 'fast' ? 50000 : 250000;
                setConfig({ ...config, gasStrategy: strategy, priorityFee });
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none disabled:opacity-50"
            >
              <option value="standard">Normal — 5,000 micro-lamports</option>
              <option value="fast">Rápido — 50,000 micro-lamports</option>
              <option value="instant">Prioritario — 250,000 micro-lamports</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Una tasa mayor puede ayudar a entrar antes, pero aumenta la comisión. Se aplicará al ejecutor live cuando esté habilitado.
            </p>
          </div>

          <div className="md:col-span-2 border-t border-gray-800 pt-4 mt-2">
            <p className="text-sm font-semibold text-white mb-3">🧪 Filtros de calidad de entrada</p>
            <p className="text-xs text-gray-500 mb-3">
              El bot rechazará candidatos que no superen estos mínimos. Reducir operaciones puede mejorar la calidad de la muestra.
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">💧 Liquidez mínima (SOL)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={config.minLiquidity}
              onChange={e => updateConfig('minLiquidity', Math.max(0, Number.parseFloat(e.target.value) || 0))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">📉 Impacto máximo de entrada (%)</label>
            <input
              type="number"
              min="0.1"
              max="50"
              step="0.1"
              value={config.maxEntryImpactPercent}
              onChange={e => updateConfig('maxEntryImpactPercent', Math.max(0.1, Number.parseFloat(e.target.value) || 0.1))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">🕒 Antigüedad mínima del token (segundos)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={config.minTokenAgeSeconds}
              onChange={e => updateConfig('minTokenAgeSeconds', Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">📊 Volumen mínimo Raydium (SOL/24h)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={config.minRaydiumVolume}
              onChange={e => updateConfig('minRaydiumVolume', Math.max(0, Number.parseFloat(e.target.value) || 0))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">₿ Spread máximo BTC (%)</label>
            <input type="number" min="0.01" step="0.01" value={config.maxBitcoinSpreadPercent}
              onChange={e => updateConfig('maxBitcoinSpreadPercent', Math.max(0.01, Number.parseFloat(e.target.value) || 0.01))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none" />
            <p className="text-xs text-gray-500 mt-1">Se calcula con el libro de órdenes público de Binance.</p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">₿ Comisión paper Binance (%)</label>
            <input type="number" min="0" max="5" step="0.01" value={config.bitcoinFeeRate * 100}
              onChange={e => updateConfig('bitcoinFeeRate', Math.max(0, Number.parseFloat(e.target.value) || 0) / 100)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">🏷️ Capitalización máxima estimada (USD)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={config.maxMarketCap}
              onChange={e => updateConfig('maxMarketCap', Math.max(0, Number.parseFloat(e.target.value) || 0))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">⏱️ Tiempo Máximo de Posición (segundos)</label>
            <input
              type="number"
              step="30"
              value={config.timeBasedExit}
              onChange={e => updateConfig('timeBasedExit', parseInt(e.target.value) || 300)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">⏱️ Salida por Ganancia (segundos)</label>
            <input
              type="number"
              step="30"
              value={config.profitTimeExit}
              onChange={e => updateConfig('profitTimeExit', parseInt(e.target.value) || 180)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">Auto-Snipe:</label>
            <button
              onClick={() => updateConfig('autoSnipe', !config.autoSnipe)}
              className={`w-14 h-7 rounded-full transition-all ${config.autoSnipe ? 'bg-green-500' : 'bg-gray-600'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${config.autoSnipe ? 'translate-x-7' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`px-6 py-3 rounded-lg font-bold transition-colors ${
              saveStatus === 'saved' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {saveStatus === 'saving' ? '⏳ Guardando...' : saveStatus === 'saved' ? '✅ Guardado' : '💾 Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
