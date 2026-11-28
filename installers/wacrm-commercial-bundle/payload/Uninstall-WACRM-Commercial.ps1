$ErrorActionPreference = "SilentlyContinue"

$InstallDir = Join-Path $env:LOCALAPPDATA "WACRM Commercial Suite"
$StartMenuDir = Join-Path ([Environment]::GetFolderPath("Programs")) "WACRM Commercial Suite"
$DesktopDir = [Environment]::GetFolderPath("Desktop")
$RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\WACRMCommercialSuite"

Remove-Item -Force (Join-Path $DesktopDir "WACRM Commercial OS v5.3.lnk")
Remove-Item -Force (Join-Path $DesktopDir "WACRM Publisher HQ v5.3.lnk")
Remove-Item -Recurse -Force $StartMenuDir
Remove-Item -Recurse -Force $RegPath
Remove-Item -Recurse -Force $InstallDir

Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show(
  "WACRM Commercial Suite berhasil dihapus dari Windows. Data cloud Anda di server tetap aman.",
  "WACRM Commercial Suite - Uninstall Selesai",
  [System.Windows.Forms.MessageBoxButtons]::OK,
  [System.Windows.Forms.MessageBoxIcon]::Information
) | Out-Null
