const fs = require('fs');
const path = require('path');

const OBSERVATIONS_FILE = path.join(__dirname, 'quality-observations.jsonl');

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function scoreToken(token, options = {}) {
  const minScore = number(options.minScore, 72);
  const minLiquiditySol = number(options.minLiquiditySol, 3);
  const normalized = token || {};
  const liquiditySol = normalized.virtual_sol_reserves > 1_000_000
    ? number(normalized.virtual_sol_reserves) / 1_000_000_000
    : number(normalized.virtual_sol_reserves);
  const marketCap = number(normalized.usd_market_cap || normalized.market_cap);
  const created = number(normalized.created_timestamp || normalized.createdAt);
  const createdMs = created > 0 && created < 10_000_000_000 ? created * 1000 : created;
  const ageSeconds = createdMs > 0 ? Math.max(0, (Date.now() - createdMs) / 1000) : 0;
  const reasons = [];
  const warnings = [];
  let score = 0;
  let hardReject = false;

  // Las barreras duras no pueden ser anuladas por el score.
  if (!normalized.mint) {
    hardReject = true;
    reasons.push('mint ausente');
  }
  if (liquiditySol < minLiquiditySol) {
    hardReject = true;
    reasons.push(`liquidez insuficiente (${liquiditySol.toFixed(2)} SOL)`);
  } else {
    score += Math.min(30, 30 * Math.min(liquiditySol / Math.max(minLiquiditySol * 4, 1), 1));
    reasons.push(`liquidez válida (${liquiditySol.toFixed(2)} SOL)`);
  }

  if (marketCap <= 0) warnings.push('market cap no disponible');
  else if (marketCap <= 250000) {
    score += 20;
    reasons.push('capitalización dentro del rango operativo');
  } else if (marketCap <= 1000000) {
    score += 10;
    warnings.push('capitalización elevada para entrada temprana');
  } else warnings.push('capitalización fuera del rango preferido');

  if (normalized.complete || normalized.raydium_pool) {
    score += 20;
    reasons.push('token graduado o con pool Raydium');
  } else {
    score += 8;
    warnings.push('sin graduación/pool confirmado');
  }

  if (ageSeconds >= 30 && ageSeconds <= 86400) {
    score += 15;
    reasons.push('edad suficiente para evitar el primer ruido');
  } else if (ageSeconds > 86400) {
    score += 8;
    warnings.push('token con antigüedad elevada');
  } else warnings.push('token demasiado reciente o edad desconocida');

  const hasSupplyData = number(normalized.total_supply) > 0 && number(normalized.virtual_token_reserves) > 0;
  if (hasSupplyData) score += 10;
  else warnings.push('reservas/supply incompletos');

  score = Math.max(0, Math.min(100, Math.round(score)));
  const decision = hardReject ? 'reject' : score >= minScore ? 'enter' : score >= 55 ? 'watch' : 'reject';
  return {
    score,
    decision,
    confidence: Number((Math.min(0.95, 0.35 + score / 160)).toFixed(3)),
    hardReject,
    reasons,
    warnings,
    features: { liquiditySol, marketCap, ageSeconds, graduated: Boolean(normalized.complete || normalized.raydium_pool), hasSupplyData },
    evaluatedAt: Date.now()
  };
}

function annotateToken(token, options) {
  const quality = scoreToken(token, options);
  return { ...token, qualityScore: quality.score, qualityDecision: quality.decision, qualityConfidence: quality.confidence, qualityReasons: quality.reasons, qualityWarnings: quality.warnings };
}

function recordObservation(token, quality, outcome = {}) {
  const record = { timestamp: Date.now(), mint: token?.mint || null, quality, outcome };
  try {
    fs.appendFileSync(OBSERVATIONS_FILE, `${JSON.stringify(record)}\n`, { encoding: 'utf8' });
  } catch (error) {
    console.warn('[QualityFilter] No se pudo registrar observación:', error.message);
  }
}

module.exports = { scoreToken, annotateToken, recordObservation, OBSERVATIONS_FILE };
