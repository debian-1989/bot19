#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   🔍 Diagnóstico Rápido del Backend                       ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Verificar que el backend esté corriendo
echo "📡 Verificando backend..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend está corriendo"
else
    echo "❌ Backend NO está corriendo"
    echo ""
    echo "💡 Solución:"
    echo "   cd backend"
    echo "   npm start"
    exit 1
fi

echo ""
echo "🔍 Ejecutando diagnóstico completo..."
echo ""

# Diagnóstico completo
curl -s http://localhost:3001/api/diagnose | jq -r '
  "📊 Resultados del Diagnóstico:",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "🎯 Pump.fun:    \(.results.pumpfun.status | ascii_upcase) \(.results.pumpfun.demo | if . then \"(DEMO)\" else \"\" end)",
  "🌊 Raydium:     \(.results.raydium.status | ascii_upcase) \(.results.raydium.demo | if . then \"(DEMO)\" else \"\" end)",
  "⚡ Solana:      \(.results.solana.status | ascii_upcase) \(.results.solana.demo | if . then \"(DEMO)\" else \"\" end)",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "✅ OK: \(.summary.total_ok)  ❌ Error: \(.summary.total_error)  🎭 Demo: \(.summary.total_demo)"
' 2>/dev/null || echo "❌ Error al ejecutar diagnóstico"

echo ""
echo "🧪 Probando endpoints individuales..."
echo ""

# Probar Pump.fun
echo "🎯 Probando Pump.fun..."
PUMPFUN_RESULT=$(curl -s http://localhost:3001/api/pumpfun/tokens?limit=1)
if echo "$PUMPFUN_RESULT" | grep -q '"success":true'; then
    COUNT=$(echo "$PUMPFUN_RESULT" | jq -r '.count // .data | length' 2>/dev/null || echo "?")
    echo "   ✅ Pump.fun funciona - $COUNT tokens recibidos"
else
    echo "   ❌ Pump.fun falló"
fi

# Probar Raydium
echo "🌊 Probando Raydium..."
RAYDIUM_RESULT=$(curl -s http://localhost:3001/api/raydium/pools?pageSize=1)
if echo "$RAYDIUM_RESULT" | grep -q '"success":true'; then
    echo "   ✅ Raydium funciona"
else
    echo "   ❌ Raydium falló"
fi

# Probar Solana
echo "⚡ Probando Solana..."
SOLANA_RESULT=$(curl -s http://localhost:3001/api/solana/version)
if echo "$SOLANA_RESULT" | grep -q '"success":true'; then
    RPC=$(echo "$SOLANA_RESULT" | jq -r '.rpc // "desconocido"' 2>/dev/null || echo "desconocido")
    echo "   ✅ Solana funciona - RPC: $RPC"
else
    echo "   ❌ Solana falló"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar modo demo
HEALTH=$(curl -s http://localhost:3001/api/health)
DEMO_COUNT=$(echo "$HEALTH" | jq '[.connections | to_entries[] | select(.value.demo_mode == true)] | length' 2>/dev/null || echo "0")

if [ "$DEMO_COUNT" -gt 0 ]; then
    echo "⚠️  ATENCIÓN: $DEMO_COUNT servicio(s) están en MODO DEMO"
    echo ""
    echo "📝 Esto significa que las APIs reales no están disponibles."
    echo "   El bot está usando datos simulados para funcionar."
    echo ""
    echo "💡 Posibles causas:"
    echo "   1. Las APIs de Pump.fun/Raydium están caídas"
    echo "   2. Los proxies CORS públicos están bloqueados"
    echo "   3. Problemas de red o firewall"
    echo "   4. Rate limiting de las APIs"
    echo ""
    echo "✅ El bot funcionará con datos demo hasta que las APIs vuelvan"
else
    echo "✅ ¡Todas las conexiones están funcionando correctamente!"
    echo ""
    echo "🎉 El bot está listo para operar con datos reales"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Para más información:"
echo "   - Logs del backend: Terminal donde corre 'npm start'"
echo "   - Panel de conexiones: http://localhost:5173 → 🔌 Estado de Conexiones"
echo "   - Documentación: SISTEMA_FALLBACK.md"
echo ""
