param(
  [switch]$Silent
)

$ErrorActionPreference = "Stop"

$AppName = "WACRM Publisher HQ"
$AppVersion = "5.3.0"
$Publisher = "PT WACRM Digital Nusantara"
$PublisherUrl = "https://wacrm-publisher-hq.vercel.app"
$ClientUrl = "https://wacrm-seven-dusky.vercel.app"

$PayloadDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallDir = Join-Path $env:LOCALAPPDATA "WACRM Publisher HQ"
$StartMenuDir = Join-Path ([Environment]::GetFolderPath("Programs")) "WACRM Publisher HQ"
$DesktopDir = [Environment]::GetFolderPath("Desktop")

Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "  OFFLINE INSTALLER - $AppName v$AppVersion" -ForegroundColor Cyan
Write-Host "  Instalasi 100% Offline | Operasi Desktop Terhubung Online" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host ""

# 1. Create installation directory
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $StartMenuDir | Out-Null

# 2. Copy offline assets (icon + uninstaller + launcher source)
Copy-Item -Force (Join-Path $PayloadDir "wacrm-publisher.ico") (Join-Path $InstallDir "wacrm-publisher.ico")
Copy-Item -Force (Join-Path $PayloadDir "Uninstall-WACRM-Publisher-HQ.ps1") (Join-Path $InstallDir "Uninstall-WACRM-Publisher-HQ.ps1")
Copy-Item -Force (Join-Path $PayloadDir "WacrmPublisherLauncher.cs") (Join-Path $InstallDir "WacrmPublisherLauncher.cs")

$IconPath = Join-Path $InstallDir "wacrm-publisher.ico"
$ExePath = Join-Path $InstallDir "WACRM-Publisher-HQ.exe"

# 3. Compile native Windows Desktop .EXE Launcher 100% OFFLINE using built-in Windows .NET csc.exe
$CscCandidates = @(
  "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
  "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
$CscExe = $CscCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

$CompiledNativeExe = $false
if ($CscExe) {
  Write-Host "[1/4] Mengompilasi launcher desktop native Windows (.exe) secara offline..." -ForegroundColor Cyan
  $cscArgs = @(
    "/nologo",
    "/target:winexe",
    "/optimize+",
    "/out:$ExePath",
    "/win32icon:$IconPath",
    "/r:System.dll",
    "/r:System.Windows.Forms.dll",
    "/r:System.Drawing.dll",
    (Join-Path $InstallDir "WacrmPublisherLauncher.cs")
  )
  & $CscExe @cscArgs
  if ($LASTEXITCODE -eq 0 -and (Test-Path $ExePath)) {
    $CompiledNativeExe = $true
    Write-Host "      OK -> $ExePath" -ForegroundColor Green
  }
}

# Fallback launcher script if .NET Framework 4 is unavailable
$FallbackVbs = Join-Path $InstallDir "Launch-WACRM-Publisher-HQ.vbs"
@"
Set sh = CreateObject("WScript.Shell")
sh.Run "msedge.exe --app=$PublisherUrl", 1, False
"@ | Set-Content -Encoding ASCII $FallbackVbs

$TargetPath = if ($CompiledNativeExe) { $ExePath } else { "wscript.exe" }
$TargetArgs = if ($CompiledNativeExe) { "" } else { "`"$FallbackVbs`"" }
$ClientArgs = if ($CompiledNativeExe) { "--client" } else { "`"$ClientUrl`"" }

# 4. Create Desktop & Start Menu Shortcuts
Write-Host "[2/4] Membuat shortcut Desktop & Start Menu..." -ForegroundColor Cyan
$WshShell = New-Object -ComObject WScript.Shell

function New-ShortcutFile($LinkPath, $Target, $Arguments, $Icon, $Description) {
  $sc = $WshShell.CreateShortcut($LinkPath)
  $sc.TargetPath = $Target
  if ($Arguments) { $sc.Arguments = $Arguments }
  $sc.WorkingDirectory = $InstallDir
  $sc.IconLocation = $Icon
  $sc.Description = $Description
  $sc.Save()
}

New-ShortcutFile `
  (Join-Path $DesktopDir "WACRM Publisher HQ.lnk") `
  $TargetPath $TargetArgs $IconPath `
  "Buka WACRM Publisher HQ v$AppVersion (Super Admin EMS - Operasi Online)"

New-ShortcutFile `
  (Join-Path $StartMenuDir "WACRM Publisher HQ.lnk") `
  $TargetPath $TargetArgs $IconPath `
  "Buka WACRM Publisher HQ v$AppVersion (Operasi Online)"

if ($CompiledNativeExe) {
  New-ShortcutFile `
    (Join-Path $StartMenuDir "WACRM Client App v5.3.lnk") `
    $ExePath "--client" $IconPath `
    "Buka Aplikasi Klien WACRM v5.3 ($ClientUrl)"
}

New-ShortcutFile `
  (Join-Path $StartMenuDir "Uninstall WACRM Publisher HQ.lnk") `
  "powershell.exe" "-ExecutionPolicy Bypass -File `"$InstallDir\Uninstall-WACRM-Publisher-HQ.ps1`"" $IconPath `
  "Hapus instalasi WACRM Publisher HQ"

# 5. Register in Windows Settings -> Apps / Control Panel (Current User - No Admin UAC needed)
Write-Host "[3/4] Mendaftarkan aplikasi ke Windows Apps & Features..." -ForegroundColor Cyan
$RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\WACRMPublisherHQ"
New-Item -Path $RegPath -Force | Out-Null
Set-ItemProperty -Path $RegPath -Name "DisplayName" -Value "$AppName v$AppVersion"
Set-ItemProperty -Path $RegPath -Name "DisplayVersion" -Value $AppVersion
Set-ItemProperty -Path $RegPath -Name "Publisher" -Value $Publisher
Set-ItemProperty -Path $RegPath -Name "InstallLocation" -Value $InstallDir
Set-ItemProperty -Path $RegPath -Name "DisplayIcon" -Value $IconPath
Set-ItemProperty -Path $RegPath -Name "URLInfoAbout" -Value $PublisherUrl
Set-ItemProperty -Path $RegPath -Name "UninstallString" -Value "powershell.exe -ExecutionPolicy Bypass -File `"$InstallDir\Uninstall-WACRM-Publisher-HQ.ps1`""
Set-ItemProperty -Path $RegPath -Name "NoModify" -Value 1 -Type DWord
Set-ItemProperty -Path $RegPath -Name "NoRepair" -Value 1 -Type DWord

Write-Host "[4/4] Instalasi OFFLINE selesai 100%!" -ForegroundColor Green
Write-Host ""
Write-Host "  Lokasi Instalasi : $InstallDir" -ForegroundColor White
Write-Host "  Server Online HQ : $PublisherUrl" -ForegroundColor Cyan
Write-Host "  Aplikasi Klien   : $ClientUrl" -ForegroundColor Cyan
Write-Host ""

if (-not $Silent) {
  Add-Type -AssemblyName System.Windows.Forms
  $openNow = [System.Windows.Forms.MessageBox]::Show(
    "Instalasi WACRM Publisher HQ v$AppVersion selesai!`n`nShortcut sudah dibuat di Desktop & Start Menu.`nApakah Anda ingin membuka WACRM Publisher HQ sekarang (membutuhkan koneksi internet aktif)?",
    "WACRM Publisher HQ — Instalasi Berhasil",
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Information
  )
  if ($openNow -eq [System.Windows.Forms.DialogResult]::Yes) {
    if ($CompiledNativeExe) {
      Start-Process -FilePath $ExePath
    } else {
      Start-Process -FilePath $PublisherUrl
    }
  }
}
