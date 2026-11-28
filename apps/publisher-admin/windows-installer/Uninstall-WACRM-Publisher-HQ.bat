@echo off
title Uninstall WACRM Publisher HQ
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0payload\Uninstall-WACRM-Publisher-HQ.ps1"
