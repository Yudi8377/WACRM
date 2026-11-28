@echo off
title WACRM Publisher HQ v5.3 - Offline Windows Installer
echo ====================================================================
echo   WACRM PUBLISHER HQ v5.3 - OFFLINE WINDOWS INSTALLER
echo   Instalasi 100%% Offline (Tanpa Internet) - Operasi Terhubung Online
echo ====================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0payload\Setup-WACRM-Publisher-HQ.ps1"
if errorlevel 1 (
  echo.
  echo [!] Terjadi kendala saat instalasi. Pastikan dijalankan di Windows 10/11.
  pause
)
