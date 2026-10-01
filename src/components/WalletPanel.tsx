import React, { useState } from 'react';
import { BotConfig } from '../types';

interface WalletPanelProps {
  solBalance: number;
  config: BotConfig;
  setConfig: (config: BotConfig) => void;
}

export default function WalletPanel({ solBalance, config, setConfig }: WalletPanelProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 rounded-xl border border-green-500/20 p-6">
          <p className="text-xs text-gray-400 mb-1">Balance Total</p>
          <p className="text-3xl font-bold text-white">{solBalance.toFixed(3)} SOL</p>
          <p className="text-sm text-gray-400 mt-1">≈ ${(solBalance * 178).toFixed(2)} USD</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <p className="text-xs text-gray-400 mb-1">Disponible para Trading</p>
          <p className="text-3xl font-bold text-yellow-400">{(solBalance * 0.8).toFixed(3)} SOL</p>
          <p className="text-sm text-gray-400 mt-1">80% del balance asignado</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <p className="text-xs text-gray-400 mb-1">Reservado (Operaciones Abiertas)</p>
          <p className="text-3xl font-bold text-blue-400">{(solBalance * 0.2).toFixed(3)} SOL</p>
          <p className="text-sm text-gray-400 mt-1">20% de reserva</p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="font-semibold text-white mb-4">🔐 Conexión de Billetera</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Dirección de Billetera</label>
            <input
              type="text"
              value={config.walletAddress}
              onChange={e => setConfig({ ...config, walletAddress: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:border-green-500 focus:outline-none"
              placeholder="Ingresa tu dirección de billetera Solana"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Clave Privada</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={config.privateKey}
                onChange={e => setConfig({ ...config, privateKey: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 pr-12 text-sm text-white font-mono focus:border-green-500 focus:outline-none"
                placeholder="Ingresa la clave privada"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-red-400/70 mt-1">⚠️ Nunca compartas tu clave privada. Se almacena solo localmente.</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-xs text-red-400">
              ⚠️ <strong>Advertencia de Seguridad:</strong> Tu clave privada se almacena localmente en tu navegador. 
              Nunca la compartas. Considera usar una billetera dedicada para el trading del bot con fondos limitados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
