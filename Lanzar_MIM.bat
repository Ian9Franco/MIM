@echo off
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

title Minecraft Intelligent Manager - Launcher
echo ===================================================
echo   Iniciando Minecraft Intelligent Manager (MIM)
echo ===================================================
echo.

:: LIMPIEZA: Matar procesos previos que puedan estar bloqueando el puerto 3000
echo [*] Limpiando procesos previos...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq MIM-Frontend" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %%a >nul 2>&1

echo.
echo Directorio: %PROJECT_DIR%
echo.

if not exist "node_modules" (
    echo [ERROR] No se encontro la carpeta node_modules.
    pause
    exit
)

:: Inicia Tauri (Tauri ya se encarga de abrir Next.js segun tauri.conf.json)
echo Lanzando interfaz...
npx tauri dev
