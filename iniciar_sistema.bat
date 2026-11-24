@echo off
chcp 65001 > nul
title SIGEC PMTO - Gestão de Contratos e Vigências
color 0B

echo ======================================================================
echo           POLÍCIA MILITAR DO ESTADO DO TOCANTINS - PMTO
echo     SIGEC PMTO - Sistema de Gestão de Contratos e Vigências
echo ======================================================================
echo.
echo [*] Verificando ambiente Node.js...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js não foi encontrado no PATH.
    echo Por favor instale o Node.js em https://nodejs.org/ para continuar.
    pause
    exit /b 1
)

echo [OK] Node.js detectado!
echo.
echo [*] Iniciando servidor do SIGEC PMTO...
echo [*] Acesse pelo navegador: http://localhost:3000
echo.

cd /d "%~dp0"

start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

node server.js

pause
