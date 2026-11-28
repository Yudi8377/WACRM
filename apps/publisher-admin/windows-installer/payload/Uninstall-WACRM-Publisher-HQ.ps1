$ErrorActionPreference = "SilentlyContinue"

$InstallDir = Join-Path $env:LOCALAPPDATA "WACRM Publisher HQ"
$StartMenuDir = Join-Path ([Environment]::GetFolderPath("Programs")) "WACRM Publisher HQ"
$DesktopLink = Join-Path ([Environment]::GetFolderPath("Desktop")) "WACRM Publisher HQ.lnk"
$RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\WACRMPublisherHQ"

Write-Host "Menghapus WACRM Publisher HQ dari Windows..." -ForegroundColor Yellow

if (Test-Path $DesktopLink) { Remove-Item -Force $DesktopLink }
if (Test-Path $StartMenuDir) { Remove-Item -Recurse -Force $StartMenuDir }
if (Test-Path $RegPath) { Remove-Item -Recurse -Force $RegPath }
if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }

Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show(
  "WACRM Publisher HQ berhasil dihapus dari komputer Anda. Data online di server tetap aman.",
  "WACRM Publisher HQ — Uninstall Selesai",
  [System.Windows.Forms.MessageBoxButtons]::OK,
  [System.Windows.Forms.MessageBoxIcon]::Information
) | Out-Null
