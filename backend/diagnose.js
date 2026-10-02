#!/usr/bin/env node

/**
 * Script de Diagnóstico Completo del Bot
 * 
 * Verifica todas las conexiones y componentes del sistema
 * Uso: node diagnose.js
 */

require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(status, message) {
  const color = status === 'OK' ? colors.green :
                status === 'FAIL' ? colors.red :
                status === 'WARN' ? colors.yellow :
                colors.blue;
  
  const icon = status === 'OK' ? '✅' :
               status === 'FAIL' ? '❌' :
               status === 'WARN' ? '⚠️' : 'ℹ️';
  
  console.log(`${color}[${icon}] ${message}${colors.reset}`);
}

async function diagnose() {
  console.log('\n' + colors.cyan + '╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   🔍 Diagnóstico Completo del PumpFun Sniper Bot          ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝' + colors.reset + '\n');

  const results = {
    config: {},
    rpc: {},
    wallet: {},
    trading: {},
    detectors: {}
  };

  // ============================================
  // 1. CONFIGURACIÓN
  // ============================================
  console.log(colors.cyan + '📋 CONFIGURACIÓN' + colors.reset);
  
  try {
    const config = require('./src/config').getConfig();
    log('OK', 'Configuración cargada correctamente');
    results.config.loaded = true;
    results.config.tradingMode = config.tradingMode;
    results.config.enableLiveTrading = config.enableLiveTrading;
    
    log('OK', `Modo de trading: ${config.tradingMode}`);
    log(config.enableLiveTrading ? 'WARN' : 'OK', 
        `Live trading: ${config.enableLiveTrading ? 'HABILITADO (PELIGRO)' : 'DESACTIVADO (SEGURO)'}`);
    
    if (!config.solanaRpcUrl) {
      log('FAIL', 'SOLANA_RPC_URL no configurada');
      results.config.rpcConfigured = false;
    } else {
      log('OK', 'SOLANA_RPC_URL configurada');
      results.config.rpcConfigured = true;
    }
    
    if (config.walletPrivateKey) {
      log('WARN', 'WALLET_PRIVATE_KEY configurada (solo para live trading)');
      results.config.walletConfigured = true;
    } else {
      log('OK', 'WALLET_PRIVATE_KEY no configurada (correcto para paper mode)');
      results.config.walletConfigured = false;
    }
    
  } catch (error) {
    log('FAIL', `Error cargando configuración: ${error.message}`);
    results.config.loaded = false;
    console.log('\n' + colors.red + '❌ No se puede continuar sin configuración válida' + colors.reset);
    console.log('Copia backend/.env.example a backend/.env y completa los valores\n');
    process.exit(1);
  }

  console.log('');

  // ============================================
  // 2. RPC HTTP
  // ============================================
  console.log(colors.cyan + '🌐 RPC HTTP' + colors.reset);
  
  const config = require('./src/config').getConfig();
  let connection;
  
  try {
    connection = new Connection(config.solanaRpcUrl, config.commitmentConfirm);
    log('OK', 'Conexión HTTP creada');
    results.rpc.httpCreated = true;
  } catch (error) {
    log('FAIL', `Error creando conexión HTTP: ${error.message}`);
    results.rpc.httpCreated = false;
    return printSummary(results);
  }

  // Test getVersion
  try {
    const start = Date.now();
    const version = await connection.getVersion();
    const latency = Date.now() - start;
    log('OK', `getVersion: ${version['solana-core']} (${latency}ms)`);
    results.rpc.getVersion = true;
    results.rpc.latency = latency;
  } catch (error) {
    log('FAIL', `getVersion falló: ${error.message}`);
    results.rpc.getVersion = false;
  }

  // Test getSlot
  try {
    const slot = await connection.getSlot();
    log('OK', `getSlot: ${slot}`);
    results.rpc.getSlot = true;
    results.rpc.currentSlot = slot;
  } catch (error) {
    log('FAIL', `getSlot falló: ${error.message}`);
    results.rpc.getSlot = false;
  }

  // Test getLatestBlockhash
  try {
    const blockhash = await connection.getLatestBlockhash();
    log('OK', `getLatestBlockhash: ${blockhash.blockhash.substring(0, 20)}...`);
    results.rpc.getBlockhash = true;
  } catch (error) {
    log('FAIL', `getLatestBlockhash falló: ${error.message}`);
    results.rpc.getBlockhash = false;
  }

  console.log('');

  // ============================================
  // 3. WALLET
  // ============================================
  console.log(colors.cyan + '💰 WALLET' + colors.reset);
  
  if (config.walletPrivateKey) {
    try {
      // Importar bs58 dinámicamente
      let bs58;
      try {
        bs58 = require('bs58');
      } catch (e) {
        log('WARN', 'bs58 no instalado. Instala con: npm install bs58');
        results.wallet.decoded = false;
      }
      
      if (bs58) {
        const { Keypair } = require('@solana/web3.js');
        const secretKey = bs58.decode(config.walletPrivateKey);
        const keypair = Keypair.fromSecretKey(secretKey);
        const publicKey = keypair.publicKey;
        
        log('OK', `Wallet pública: ${publicKey.toString().substring(0, 20)}...`);
        results.wallet.publicKey = publicKey.toString();
        results.wallet.decoded = true;
        
        // Test getBalance
        try {
          const balance = await connection.getBalance(publicKey);
          const solBalance = balance / 1e9;
          log('OK', `Balance: ${solBalance.toFixed(4)} SOL`);
          results.wallet.balance = solBalance;
          
          if (solBalance < config.minWalletBalance) {
            log('WARN', `Balance bajo (< ${config.minWalletBalance} SOL)`);
          }
        } catch (error) {
          log('FAIL', `getBalance falló: ${error.message}`);
          results.wallet.balanceCheck = false;
        }
      }
    } catch (error) {
      log('FAIL', `Error decodifying wallet: ${error.message}`);
      results.wallet.decoded = false;
    }
  } else {
    log('OK', 'Wallet no configurada (correcto para paper mode)');
    results.wallet.configured = false;
  }

  console.log('');

  // ============================================
  // 4. MODO DE TRADING
  // ============================================
  console.log(colors.cyan + '🎯 MODO DE TRADING' + colors.reset);
  
  log('OK', `Modo: ${config.tradingMode.toUpperCase()}`);
  results.trading.mode = config.tradingMode;
  
  if (config.tradingMode === 'paper') {
    log('OK', 'Paper trading: NO se firmarán ni enviarán transacciones');
    results.trading.safe = true;
  } else if (config.tradingMode === 'live') {
    if (config.enableLiveTrading) {
      log('WARN', 'Live trading: SE FIRMARÁN Y ENVIARÁN transacciones REALES');
      log('WARN', 'Asegúrate de tener una wallet dedicada con fondos limitados');
      results.trading.safe = false;
    } else {
      log('OK', 'Live trading deshabilitado (ENABLE_LIVE_TRADING=false)');
      results.trading.safe = true;
    }
  }

  console.log('');

  // ============================================
  // 5. DETECTORES
  // ============================================
  console.log(colors.cyan + '🔍 DETECTORES' + colors.reset);
  
  log('OK', `Pump.fun Program ID: ${config.pumpProgramId}`);
  results.detectors.pumpProgramId = config.pumpProgramId;
  
  // Verificar que el programa existe
  try {
    const programInfo = await connection.getAccountInfo(new PublicKey(config.pumpProgramId));
    if (programInfo) {
      log('OK', 'Programa Pump.fun existe en la blockchain');
      results.detectors.pumpProgramExists = true;
    } else {
      log('WARN', 'Programa Pump.fun no encontrado (puede ser un problema de RPC)');
      results.detectors.pumpProgramExists = false;
    }
  } catch (error) {
    log('FAIL', `Error verificando programa Pump.fun: ${error.message}`);
    results.detectors.pumpProgramExists = false;
  }

  console.log('');

  // ============================================
  // RESUMEN
  // ============================================
  printSummary(results);
}

function printSummary(results) {
  console.log(colors.cyan + '╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   📊 RESUMEN DEL DIAGNÓSTICO                              ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝' + colors.reset + '\n');

  const checks = [
    { name: 'Configuración cargada', pass: results.config.loaded },
    { name: 'RPC HTTP conectado', pass: results.rpc.httpCreated },
    { name: 'RPC getVersion', pass: results.rpc.getVersion },
    { name: 'RPC getSlot', pass: results.rpc.getSlot },
    { name: 'RPC getLatestBlockhash', pass: results.rpc.getBlockhash },
    { name: 'Modo de trading seguro', pass: results.trading.safe !== false },
    { name: 'Programa Pump.fun accesible', pass: results.detectors.pumpProgramExists !== false }
  ];

  const passed = checks.filter(c => c.pass).length;
  const total = checks.length;

  checks.forEach(check => {
    log(check.pass ? 'OK' : 'FAIL', check.name);
  });

  console.log('');
  
  if (passed === total) {
    log('OK', `Todos los checks pasaron (${passed}/${total})`);
    console.log('\n' + colors.green + '✅ El bot está listo para iniciar' + colors.reset + '\n');
  } else {
    log('FAIL', `${total - passed} check(s) fallaron (${passed}/${total})`);
    console.log('\n' + colors.red + '❌ Corrige los errores antes de iniciar el bot' + colors.reset + '\n');
  }

  // Información adicional
  if (results.rpc.latency) {
    console.log(colors.blue + `📡 Latencia RPC: ${results.rpc.latency}ms` + colors.reset);
  }
  
  if (results.rpc.currentSlot) {
    console.log(colors.blue + `🔢 Slot actual: ${results.rpc.currentSlot}` + colors.reset);
  }
  
  if (results.wallet.balance !== undefined) {
    console.log(colors.blue + `💰 Balance wallet: ${results.wallet.balance.toFixed(4)} SOL` + colors.reset);
  }

  console.log('');
}

// Ejecutar diagnóstico
diagnose().catch(error => {
  console.error(colors.red + '\n❌ Error fatal en diagnóstico:', error.message + colors.reset);
  process.exit(1);
});
