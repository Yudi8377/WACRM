@echo off
title Compile Single-File Setup EXE - WACRM Publisher HQ v5.3
echo ====================================================================
echo   Membangun Single-File Offline Setup EXE (Windows IExpress)
echo ====================================================================
cd /d "%~dp0"
iexpress /N "%~dp0payload\WACRM-Publisher-HQ.sed"
if exist "%~dp0WACRM-Publisher-HQ-v5.3-Setup.exe" (
  echo.
  echo [OK] Berhasil dikompilasi: %~dp0WACRM-Publisher-HQ-v5.3-Setup.exe
) else (
  echo [!] Gagal membuat Setup EXE.
)
pause
