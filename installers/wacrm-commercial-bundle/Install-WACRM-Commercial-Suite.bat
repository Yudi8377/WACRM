@echo off
title WACRM Commercial Suite v5.3.1 - Go-Commercial Offline Installer
echo ====================================================================
echo   WACRM COMMERCIAL SUITE v5.3.1 - GO-COMMERCIAL OFFLINE INSTALLER
echo   Client App + Publisher HQ + Auto-Fix Izin Kamera/Mikrofon/USB
echo ====================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0payload\Setup-WACRM-Commercial.ps1"
if errorlevel 1 (
  echo.
  echo [!] Terjadi kendala saat instalasi. Pastikan dijalankan di Windows 10/11.
  pause
)
