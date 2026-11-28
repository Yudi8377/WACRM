@echo off
title WACRM v5.3.1 - Perbaiki Izin Kamera & Mikrofon (1-Klik)
echo ====================================================================
echo   WACRM v5.3.1 - AUTO-FIX IZIN KAMERA, MIKROFON & NOTIFIKASI
echo ====================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0payload\Fix-WACRM-Hardware-Permissions.ps1"
echo.
echo Tutup semua jendela WACRM / Chrome / Edge lalu buka ulang WACRM.
pause
