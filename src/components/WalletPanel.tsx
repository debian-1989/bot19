import React, { useEffect, useState } from 'react';
import { BotConfig } from '../types';

interface WalletPanelProps {
  solBalance: number;
  config: BotConfig;
  setConfig: (config: BotConfig) => void;
}

interface WalletStatus {
  address: string;
  balanceSol: number;
  sessionId: string;
  mode: string;
  liveExecutorEnabled: boolean;
  canTradeLive: boolean;
}

export default function WalletPanel({ solBalance, config, setConfig }: WalletPanelProps) {
  const [wallet, setWallet] = useState<WalletStatus | null>(null);
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadWallet = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/wallet/status');
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'No se pudo consultar la wallet');
      setWallet(payload.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo consultar la wallet');
    }
  };

  useEffect(() => {
    void loadWallet();
    const interval = setInterval(() => void loadWallet(), 15000);
    return () => clearInterval(interval);
  }, []);

  const withdraw = async () => {
    if (!destination || !amount) return setMessage('Indica dirección destino y monto.');
    const confirmed = window.confirm(`Confirma retirar ${amount} SOL a ${destination}. Esta acción se transmitirá a Solana.`);
    if (!confirmed) return;
    setLoading(true);
    setMessage('Procesando retiro...');
    try {
      const response = await fetch('http://localhost:3001/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, amountSol: Number(amount), confirmed: true }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Retiro rechazado');
      setMessage(`Retiro enviado. Firma: ${payload.data.signature}`);
      setAmount('');
      await loadWallet();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Retiro rechazado');
    } finally {
      setLoading(false);
    }
  };

  const displayedBalance = wallet?.balanceSol ?? solBalance;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 rounded-xl border border-green-500/20 p-6">
          <p className="text-xs text-gray-400 mb-1">Balance de la wallet del bot</p>
          <p className="text-3xl font-bold text-white">{displayedBalance.toFixed(4)} SOL</p>
          <p className="text-sm text-gray-400 mt-1">Saldo consultado en Solana</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <p className="text-xs text-gray-400 mb-1">Modo actual</p>
          <p className={`text-3xl font-bold ${config.executionMode === 'real' ? 'text-red-400' : 'text-blue-400'}`}>
            {config.executionMode === 'real' ? 'REAL' : 'DEMO'}
          </p>
          <p className="text-sm text-gray-400 mt-1">Demo no firma transacciones</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <p className="text-xs text-gray-400 mb-1">Estado de trading live</p>
          <p className="text-xl font-bold text-yellow-400">{wallet?.canTradeLive ? 'HABILITADO' : 'BLOQUEADO'}</p>
          <p className="text-sm text-gray-400 mt-1">Se requiere ejecutor live y saldo</p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="font-semibold text-white mb-4">🔐 Wallet propia de la sesión</h3>
        <p className="text-xs text-gray-400 mb-2">Envía SOL únicamente a esta dirección cuando quieras operar en modo real:</p>
        <div className="bg-gray-800 rounded-lg p-3 break-all font-mono text-sm text-green-300">
          {wallet?.address || 'Inicializando wallet...'}
        </div>
        <p className="text-xs text-yellow-400 mt-3">
          La wallet cambia al iniciar una nueva sesión. Retira los fondos antes de cerrar el bot.
        </p>
        <p className="text-xs text-gray-500 mt-2">Sesión: {wallet?.sessionId || '—'}</p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="font-semibold text-white mb-4">↗ Retirar fondos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Dirección Solana destino" className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white font-mono" />
          <input type="number" min="0" step="0.001" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Monto SOL" className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white" />
        </div>
        <button type="button" disabled={loading || config.executionMode !== 'real'} onClick={withdraw} className="mt-4 px-5 py-2.5 rounded-lg bg-orange-600 text-white font-bold disabled:opacity-50">
          {loading ? 'Procesando...' : config.executionMode === 'real' ? 'Retirar con confirmación' : 'Cambia a REAL para retirar'}
        </button>
        {message && <p className="mt-3 text-sm text-yellow-300 break-all">{message}</p>}
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
        <p className="text-xs text-red-400">
          La clave privada nunca se muestra ni se guarda en el navegador. El modo real permanecerá bloqueado hasta que exista un ejecutor de swaps live habilitado explícitamente en el backend.
        </p>
      </div>
    </div>
  );
}
