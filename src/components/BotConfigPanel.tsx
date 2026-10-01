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
