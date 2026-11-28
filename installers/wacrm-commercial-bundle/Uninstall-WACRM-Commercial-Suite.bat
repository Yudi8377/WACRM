@echo off
title Uninstall WACRM Commercial Suite
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0payload\Uninstall-WACRM-Commercial.ps1"
