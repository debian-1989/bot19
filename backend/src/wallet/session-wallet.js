const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');

const WALLET_DIR = path.resolve(__dirname, '../../../.wallet-sessions');
const CURRENT_FILE = path.join(WALLET_DIR, 'current.json');
const ALGORITHM = 'aes-256-gcm';
const KDF = 'scrypt';

function deriveKey(password, salt) {
  return crypto.scryptSync(password, salt, 32);
}

function encryptSecret(secretKey, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(password, salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(secretKey), cipher.final()]);
  return {
    version: 1,
    algorithm: ALGORITHM,
    kdf: KDF,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

function decryptSecret(payload, password) {
  const key = deriveKey(password, Buffer.from(payload.salt, 'base64'));
  const decipher = crypto.createDecipheriv(payload.algorithm, key, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final()
  ]);
}

class SessionWallet {
  constructor(connectionManager, config) {
    this.connectionManager = connectionManager;
    this.config = config;
    this.keypair = null;
    this.sessionId = null;
    this.createdAt = null;
    this.liveExecutorEnabled = process.env.LIVE_EXECUTOR_ENABLED === 'true';
  }

  start() {
    fs.mkdirSync(WALLET_DIR, { recursive: true, mode: 0o700 });
    const password = process.env.BOT_WALLET_PASSWORD;
    if (!password && this.config.isLiveMode()) {
      throw new Error('BOT_WALLET_PASSWORD es obligatorio para iniciar una wallet en modo real');
    }

    this.keypair = Keypair.generate();
    this.sessionId = `session-${Date.now()}`;
    this.createdAt = new Date().toISOString();

    if (password) {
      const file = path.join(WALLET_DIR, `${this.sessionId}.json`);
      const payload = {
        sessionId: this.sessionId,
        createdAt: this.createdAt,
        publicKey: this.keypair.publicKey.toBase58(),
        encrypted: encryptSecret(this.keypair.secretKey, password)
      };
      fs.writeFileSync(file, JSON.stringify(payload, null, 2), { mode: 0o600 });
      fs.writeFileSync(CURRENT_FILE, JSON.stringify({ sessionId: this.sessionId, file }, null, 2), { mode: 0o600 });
    }

    console.log(`[Wallet] Nueva wallet de sesión: ${this.keypair.publicKey.toBase58()}`);
    if (!password) console.warn('[Wallet] Modo demo: wallet solo en memoria; configura BOT_WALLET_PASSWORD para persistencia cifrada.');
  }

  requireStarted() {
    if (!this.keypair) throw new Error('La wallet de sesión no está inicializada');
  }

  async getBalance() {
    this.requireStarted();
    const lamports = await this.connectionManager.getConnection().getBalance(this.keypair.publicKey, this.config.commitmentConfirm);
    return lamports / 1e9;
  }

  async getStatus() {
    this.requireStarted();
    const balance = await this.getBalance();
    return {
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      address: this.keypair.publicKey.toBase58(),
      balanceSol: balance,
      mode: this.config.tradingMode,
      liveTradingEnabled: this.config.enableLiveTrading,
      liveExecutorEnabled: this.liveExecutorEnabled,
      canTradeLive: this.config.isLiveMode() && this.liveExecutorEnabled && balance > this.config.minWalletBalance
    };
  }

  async withdraw(destination, amountSol, confirmed) {
    this.requireStarted();
    if (!confirmed) throw new Error('El retiro requiere confirmación explícita');
    if (!destination || !PublicKey.isOnCurve(destination)) throw new Error('Dirección Solana destino inválida');
    const amount = Number(amountSol);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Monto de retiro inválido');

    const connection = this.connectionManager.getConnection();
    const balanceLamports = await connection.getBalance(this.keypair.publicKey, this.config.commitmentConfirm);
    const reserveLamports = 10000000;
    const amountLamports = Math.floor(amount * 1e9);
    if (amountLamports + reserveLamports > balanceLamports) {
      throw new Error('Saldo insuficiente; se conserva una reserva para comisiones');
    }

    const transaction = new Transaction().add(SystemProgram.transfer({
      fromPubkey: this.keypair.publicKey,
      toPubkey: new PublicKey(destination),
      lamports: amountLamports
    }));
    const signature = await sendAndConfirmTransaction(connection, transaction, [this.keypair], {
      commitment: this.config.commitmentConfirm,
      preflightCommitment: this.config.commitmentConfirm
    });
    return { signature, destination, amountSol: amount };
  }
}

module.exports = { SessionWallet };
