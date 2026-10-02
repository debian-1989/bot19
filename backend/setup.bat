@echo off
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║   🚀 PumpFun Sniper Bot - Instalación del Backend        ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Verificar si Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: Node.js no está instalado
    echo 📥 Descarga Node.js desde: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detectado
node --version
echo.

REM Verificar si npm está instalado
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: npm no está instalado
    pause
    exit /b 1
)

echo ✅ npm detectado
npm --version
echo.

REM Instalar dependencias
echo 📦 Instalando dependencias...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error al instalar dependencias
    pause
    exit /b 1
)

echo.
echo ✅ Dependencias instaladas correctamente
echo.

REM Crear archivo .env si no existe
if not exist .env (
    echo 📝 Creando archivo .env...
    copy .env.example .env >nul
    echo ✅ Archivo .env creado
    echo.
)

echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║   ✅ Instalación completada exitosamente!                ║
echo ║                                                           ║
echo ║   Para iniciar el backend:                               ║
echo ║   npm start                                              ║
echo ║                                                           ║
echo ║   El servidor estará en: http://localhost:3001           ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
pause
