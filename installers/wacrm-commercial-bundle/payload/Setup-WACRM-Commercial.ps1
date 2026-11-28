param(
  [switch]$Silent
)

$ErrorActionPreference = "Stop"

$SuiteName = "WACRM Commercial Suite"
$AppVersion = "5.3.1"
$Publisher = "PT WACRM Digital Nusantara"
$ClientUrl = "https://wacrm-seven-dusky.vercel.app"
$PublisherUrl = "https://wacrm-publisher-hq.vercel.app"

$PayloadDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallDir = Join-Path $env:LOCALAPPDATA "WACRM Commercial Suite"
$StartMenuDir = Join-Path ([Environment]::GetFolderPath("Programs")) "WACRM Commercial Suite"
$DesktopDir = [Environment]::GetFolderPath("Desktop")

Write-Host "=================================================================" -ForegroundColor Yellow
Write-Host "  GO-COMMERCIAL OFFLINE INSTALLER - $SuiteName v$AppVersion" -ForegroundColor Cyan
Write-Host "  Instalasi 100% Offline | Auto-Fix Izin Kamera/Mikrofon/USB" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Yellow
Write-Host ""

# 1. Prepare directories & copy offline payload
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $StartMenuDir | Out-Null

Copy-Item -Force (Join-Path $PayloadDir "wacrm-commercial.ico") (Join-Path $InstallDir "wacrm-commercial.ico")
Copy-Item -Force (Join-Path $PayloadDir "WacrmCommercialLauncher.cs") (Join-Path $InstallDir "WacrmCommercialLauncher.cs")
Copy-Item -Force (Join-Path $PayloadDir "Fix-WACRM-Hardware-Permissions.ps1") (Join-Path $InstallDir "Fix-WACRM-Hardware-Permissions.ps1")
Copy-Item -Force (Join-Path $PayloadDir "Uninstall-WACRM-Commercial.ps1") (Join-Path $InstallDir "Uninstall-WACRM-Commercial.ps1")

$IconPath = Join-Path $InstallDir "wacrm-commercial.ico"
$LauncherExe = Join-Path $InstallDir "WACRM-Suite-Launcher.exe"

# 2. Run Automatic Hardware Permission Pre-Authorization Engine (Camera, Mic, Notifications, Edge/Chrome Policies & Profiles)
Write-Host "[1/5] Menjalankan Auto-Fix Izin Kamera, Mikrofon & Notifikasi..." -ForegroundColor Cyan
& (Join-Path $InstallDir "Fix-WACRM-Hardware-Permissions.ps1")

# 3. Compile Native Windows Desktop Launcher (.exe) 100% OFFLINE via Windows built-in .NET csc.exe
Write-Host "[2/5] Mengompilasi aplikasi desktop native Windows (.exe) secara offline..." -ForegroundColor Cyan
$CscCandidates = @(
  "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
  "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
$CscExe = $CscCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

$CompiledExe = $false
if ($CscExe) {
  & $CscExe /nologo /target:winexe /optimize+ `
    "/out:$LauncherExe" `
    "/win32icon:$IconPath" `
    /r:System.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll `
    (Join-Path $InstallDir "WacrmCommercialLauncher.cs")
  if ($LASTEXITCODE -eq 0 -and (Test-Path $LauncherExe)) {
    $CompiledExe = $true
    Write-Host "      OK -> $LauncherExe" -ForegroundColor Green
  }
}

$TargetPath = if ($CompiledExe) { $LauncherExe } else { "msedge.exe" }
$ClientArgs = if ($CompiledExe) { "--client" } else { "--app=$ClientUrl" }
$PublisherArgs = if ($CompiledExe) { "--publisher" } else { "--app=$PublisherUrl" }

# 4. Create Desktop & Start Menu Shortcuts (Client App + Publisher HQ + Permission Doctor + Uninstaller)
Write-Host "[3/5] Membuat shortcut Desktop & Start Menu..." -ForegroundColor Cyan
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

New-ShortcutFile (Join-Path $DesktopDir "WACRM Commercial OS v5.3.lnk") $TargetPath $ClientArgs $IconPath "Buka WACRM Commercial OS v$AppVersion (POS, QR FIFO, ERP, AI)"
New-ShortcutFile (Join-Path $DesktopDir "WACRM Publisher HQ v5.3.lnk") $TargetPath $PublisherArgs $IconPath "Buka WACRM Publisher HQ v$AppVersion (Super Admin EMS)"

New-ShortcutFile (Join-Path $StartMenuDir "WACRM Commercial OS v5.3.lnk") $TargetPath $ClientArgs $IconPath "Buka Aplikasi Klien WACRM v$AppVersion"
New-ShortcutFile (Join-Path $StartMenuDir "WACRM Publisher HQ v5.3.lnk") $TargetPath $PublisherArgs $IconPath "Buka WACRM Publisher HQ v$AppVersion"
if ($CompiledExe) {
  New-ShortcutFile (Join-Path $StartMenuDir "WACRM Perbaiki Izin Kamera & Mikrofon.lnk") $LauncherExe "--doctor" $IconPath "Diagnostik & perbaikan 1-klik izin Kamera, Mikrofon & Notifikasi"
}
New-ShortcutFile (Join-Path $StartMenuDir "Uninstall WACRM Commercial Suite.lnk") "powershell.exe" "-NoProfile -ExecutionPolicy Bypass -File `"$InstallDir\Uninstall-WACRM-Commercial.ps1`"" $IconPath "Hapus instalasi WACRM Commercial Suite"

# 5. Register in Windows Settings -> Apps & Features (HKCU - No UAC needed)
Write-Host "[4/5] Mendaftarkan ke Windows Apps & Features..." -ForegroundColor Cyan
$RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\WACRMCommercialSuite"
New-Item -Path $RegPath -Force | Out-Null
Set-ItemProperty -Path $RegPath -Name "DisplayName" -Value "$SuiteName v$AppVersion"
Set-ItemProperty -Path $RegPath -Name "DisplayVersion" -Value $AppVersion
Set-ItemProperty -Path $RegPath -Name "Publisher" -Value $Publisher
Set-ItemProperty -Path $RegPath -Name "InstallLocation" -Value $InstallDir
Set-ItemProperty -Path $RegPath -Name "DisplayIcon" -Value $IconPath
Set-ItemProperty -Path $RegPath -Name "URLInfoAbout" -Value $ClientUrl
Set-ItemProperty -Path $RegPath -Name "UninstallString" -Value "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$InstallDir\Uninstall-WACRM-Commercial.ps1`""
Set-ItemProperty -Path $RegPath -Name "NoModify" -Value 1 -Type DWord
Set-ItemProperty -Path $RegPath -Name "NoRepair" -Value 1 -Type DWord

Write-Host "[5/5] INSTALASI OFFLINE + AUTO-FIX IZIN HARDWARE SELESAI 100%!" -ForegroundColor Green
Write-Host "  - Client App   : $ClientUrl" -ForegroundColor Cyan
Write-Host "  - Publisher HQ : $PublisherUrl" -ForegroundColor Cyan
Write-Host ""

if (-not $Silent) {
  Add-Type -AssemblyName System.Windows.Forms
  $openNow = [System.Windows.Forms.MessageBox]::Show(
    "Instalasi $SuiteName v$AppVersion selesai!`n`n" +
    "Izin Kamera, Mikrofon & Notifikasi Windows + profil aplikasi sudah diaktifkan otomatis.`n" +
    "Shortcut Desktop sudah tersedia untuk WACRM Client App & WACRM Publisher HQ.`n`n" +
    "Buka WACRM Commercial OS sekarang?",
    "WACRM Commercial Suite - Instalasi Berhasil",
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Information
  )
  if ($openNow -eq [System.Windows.Forms.DialogResult]::Yes) {
    if ($CompiledExe) {
      Start-Process -FilePath $LauncherExe -ArgumentList "--client"
    } else {
      Start-Process -FilePath $ClientUrl
    }
  }
}
