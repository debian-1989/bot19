import React from 'react';
import { BotConfig } from '../types';

interface WalletPanelProps {
  solBalance: number;
  config: BotConfig;
  setConfig: (config: BotConfig) => void;
}

export default function WalletPanel({ solBalance, config, setConfig }: WalletPanelProps) {
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

          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-xs text-red-400">
              ⚠️ <strong>Seguridad:</strong> La clave privada nunca se solicita ni se almacena en el navegador.
              La firma debe realizarse exclusivamente en el backend con una wallet dedicada y fondos limitados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
