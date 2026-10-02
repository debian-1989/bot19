import React from 'react';
import { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isRunning: boolean;
}

const menuItems: { id: TabType; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Panel Principal', icon: '📊' },
  { id: 'monitor', label: 'Monitor en Vivo', icon: '📡' },
  { id: 'testing', label: 'Pruebas y Simulación', icon: '🧪' },
  { id: 'connections', label: 'Estado de Conexiones', icon: '🔌' },
  { id: 'config', label: 'Configuración', icon: '⚙️' },
  { id: 'history', label: 'Historial de Operaciones', icon: '📜' },
  { id: 'wallet', label: 'Billetera', icon: '💰' },
];

export default function Sidebar({ activeTab, setActiveTab, isRunning }: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-xl font-bold shadow-lg shadow-green-500/30">
            ⚡
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Sniper Bot</h2>
            <p className="text-xs text-gray-400">Edición PumpFun</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === item.id
                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">{isRunning ? 'Bot Activo' : 'Bot Inactivo'}</span>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Red: Solana Mainnet</p>
            <p>Plataforma: Pump.fun</p>
            <p>Estrategia: Front-Run Sniper</p>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-600 text-center">
          <p>⚠️ Úsalo bajo tu propio riesgo</p>
          <p>No es consejo financiero</p>
        </div>
      </div>
    </aside>
  );
}
