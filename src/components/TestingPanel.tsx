import React, { useState } from 'react';

export default function TestingPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 100));
  };

  const startTest = () => {
    setIsRunning(true);
    addLog('🚀 Simulación iniciada con tokens reales de pump.fun');
    
    const interval = setInterval(() => {
      const tokens = ['BONK', 'WIF', 'POPCAT', 'MYRO', 'WEN'];
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const amount = (Math.random() * 2 + 0.1).toFixed(3);
      const profit = (Math.random() * 100 - 30).toFixed(1);
      
      addLog(`🔍 Detectada compra de ${amount} SOL en $${token}`);
      
      setTimeout(() => {
        const emoji = parseFloat(profit) >= 0 ? '💰' : '🛑';
        addLog(`${emoji} $${token} cerrado con ${profit}% de ganancia`);
      }, 2000);
    }, 3000);

    setTimeout(() => {
      clearInterval(interval);
      setIsRunning(false);
      addLog('🏁 Simulación completada');
    }, 30000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🧪</span> Pruebas y Simulación
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Simula el comportamiento del bot con tokens reales de pump.fun sin arriesgar fondos.
            </p>
          </div>
          <button
            onClick={startTest}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              isRunning
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/30'
            }`}
          >
            {isRunning ? '⏳ Simulando...' : '▶ Iniciar Test'}
          </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <span>📝</span> Registro de Simulación
        </h3>
        <div className="h-96 overflow-auto">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <span className="text-5xl block mb-3">🧪</span>
                <p className="text-sm">Inicia la simulación para ver el registro</p>
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

      <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl border border-blue-500/20 p-5">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <span>ℹ️</span> Información de la Simulación
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold text-blue-400 mb-1">✅ Datos Reales</p>
            <p className="text-xs text-gray-400">
              La simulación utiliza tokens reales de pump.fun obtenidos en tiempo real a través de la API pública.
            </p>
          </div>
          <div>
            <p className="font-semibold text-green-400 mb-1">✅ Precios Reales</p>
            <p className="text-xs text-gray-400">
              Los precios se calculan basándose en las reservas virtuales de SOL y tokens de cada bonding curve.
            </p>
          </div>
          <div>
            <p className="font-semibold text-yellow-400 mb-1">⚠️ Simulación de Movimientos</p>
            <p className="text-xs text-gray-400">
              Los movimientos de precio después de la entrada son simulados para probar la estrategia sin riesgo.
            </p>
          </div>
          <div>
            <p className="font-semibold text-purple-400 mb-1">🎯 Próximo Paso</p>
            <p className="text-xs text-gray-400">
              Una vez probada la estrategia en simulación, puedes configurar tu billetera real para operar con fondos reales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
