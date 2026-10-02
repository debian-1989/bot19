# 🚀 Guía de Instalación Completa

## ⚠️ Error: "vite: not found"

Este error significa que las dependencias no están instaladas. Sigue estos pasos:

## 📦 Paso 1: Instalar Dependencias del Frontend

En la **carpeta raíz** del proyecto (donde está el `package.json` principal):

```bash
npm install
```

Esto instalará todas las dependencias necesarias incluyendo:
- Vite (servidor de desarrollo)
- React
- Tailwind CSS
- TypeScript
- Y todas las demás librerías

**Tiempo estimado**: 1-3 minutos

## 🎯 Paso 2: Verificar Instalación

Después de instalar, deberías ver:

```bash
added XXX packages in XXs
```

## ▶️ Paso 3: Iniciar el Frontend

Ahora sí puedes ejecutar:

```bash
npm run dev
```

Deberías ver:

```
  VITE v6.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

## 🔧 Paso 4: Instalar el Backend (Recomendado)

Para máxima velocidad y confiabilidad, instala el backend:

```bash
cd backend
npm install
npm start
```

El backend estará en: http://localhost:3001

## 🎮 Paso 5: Abrir el Bot

Abre tu navegador en: **http://localhost:5173**

## 🐛 Solución de Problemas

### Error: "npm: command not found"
- Instala Node.js desde: https://nodejs.org/
- Descarga la versión LTS (recomendada)

### Error: "EACCES: permission denied"
**Linux/Mac:**
```bash
sudo npm install
```

**Windows:**
- Ejecuta la terminal como administrador

### Error: "npm ERR! code ERESOLVE"
```bash
npm install --legacy-peer-deps
```

### Error: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### El puerto 5173 está ocupado
```bash
npm run dev -- --port 3000
```

## 📋 Comandos Útiles

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Construir para producción
npm run build

# Verificar tipos TypeScript
npm run typecheck

# Limpiar e reinstalar
rm -rf node_modules package-lock.json
npm install
```

## ✅ Verificación Final

1. ✅ `npm install` completado sin errores
2. ✅ `npm run dev` inicia el servidor
3. ✅ http://localhost:5173 abre la aplicación
4. ✅ Backend corriendo en http://localhost:3001 (si lo instalaste)

## 🎯 Resumen Rápido

```bash
# 1. Instalar frontend
npm install

# 2. Iniciar frontend
npm run dev

# 3. (Opcional) Instalar backend
cd backend
npm install
npm start
```

---

**¿Sigues teniendo problemas?** Revisa los logs completos del error y verifica que Node.js esté instalado correctamente.
