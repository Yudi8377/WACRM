@echo off
title Compile Single-File Setup EXE - WACRM Commercial Suite v5.3.1
cd /d "%~dp0"
iexpress /N "%~dp0payload\WACRM-Commercial-Suite.sed"
if exist "%~dp0WACRM-Commercial-Suite-v5.3.1-Setup.exe" (
  echo [OK] Single-file Setup EXE berhasil dibuat: %~dp0WACRM-Commercial-Suite-v5.3.1-Setup.exe
) else (
  echo [!] Gagal membuat Setup EXE.
)
pause
