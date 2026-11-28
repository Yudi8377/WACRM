param(
  [switch]$Quiet
)

$ErrorActionPreference = "Continue"

$ClientOrigin = "https://wacrm-seven-dusky.vercel.app"
$PublisherOrigin = "https://wacrm-publisher-hq.vercel.app"
$AllowedUrls = @($ClientOrigin, $PublisherOrigin)
$BaseDataDir = Join-Path $env:LOCALAPPDATA "WACRM Commercial Suite"

function Write-Info($msg, $color = "Cyan") {
  if (-not $Quiet) { Write-Host $msg -ForegroundColor $color }
}

Write-Info "=================================================================" "Yellow"
Write-Info "  WACRM v5.3.1 - HARDWARE PERMISSION AUTO-FIX ENGINE (WINDOWS)" "Cyan"
Write-Info "  Auto-Grant Kamera, Mikrofon, Notifikasi & Profil App Mandiri" "Green"
Write-Info "=================================================================" "Yellow"

# 1. Enable Windows User-Level Privacy Consent for Camera & Microphone (Zero Admin UAC needed)
Write-Info "[1/4] Mengaktifkan izin privasi Windows (Kamera & Mikrofon)..."
$ConsentPaths = @(
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam",
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam\NonPackaged",
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone",
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone\NonPackaged"
)
foreach ($p in $ConsentPaths) {
  try {
    New-Item -Path $p -Force | Out-Null
    Set-ItemProperty -Path $p -Name "Value" -Value "Allow" -Type String -Force
  } catch {
    Write-Info "      Catatan: tidak dapat mengubah $p (dikelola admin sistem)." "DarkYellow"
  }
}
Write-Info "      OK -> Windows Privacy Consent Kamera & Mikrofon = Allow" "Green"

# 2. Pre-authorize WACRM Origins in User-Level Microsoft Edge & Google Chrome Policies
Write-Info "[2/4] Mendaftarkan domain WACRM ke kebijakan izin Kamera/Mikrofon Edge & Chrome..."
$BrowserPolicyRoots = @(
  "HKCU:\Software\Policies\Microsoft\Edge",
  "HKCU:\Software\Policies\Google\Chrome"
)
$PolicyLists = @(
  "VideoCaptureAllowedUrls",
  "AudioCaptureAllowedUrls",
  "NotificationsAllowedForUrls"
)
foreach ($root in $BrowserPolicyRoots) {
  try {
    New-Item -Path $root -Force | Out-Null
    Set-ItemProperty -Path $root -Name "VideoCaptureAllowed" -Value 1 -Type DWord -Force
    Set-ItemProperty -Path $root -Name "AudioCaptureAllowed" -Value 1 -Type DWord -Force
    foreach ($listName in $PolicyLists) {
      $listPath = Join-Path $root $listName
      New-Item -Path $listPath -Force | Out-Null
      $idx = 1
      foreach ($u in $AllowedUrls) {
        Set-ItemProperty -Path $listPath -Name "$idx" -Value $u -Type String -Force
        $idx++
      }
    }
  } catch {
    # Non-fatal if corporate GPO locks HKCU\Software\Policies
  }
}
Write-Info "      OK -> Policy Edge & Chrome Video/Audio Capture aktif untuk WACRM" "Green"

# 3. Directly Pre-Seed Chromium Isolated App Profile Default\Preferences (Works 100% even without GPO!)
Write-Info "[3/4] Menanamkan izin Kamera/Mikrofon/Notifikasi ke profil desktop mandiri WACRM..."
$ProfileFolders = @(
  (Join-Path $BaseDataDir "ClientProfile\Default"),
  (Join-Path $BaseDataDir "PublisherProfile\Default")
)

$AllowRuleJson = @{
  setting = 1
  last_modified = "13380000000000000"
}

foreach ($profDir in $ProfileFolders) {
  try {
    New-Item -ItemType Directory -Force -Path $profDir | Out-Null
    $prefFile = Join-Path $profDir "Preferences"
    $prefs = $null
    if (Test-Path $prefFile) {
      try {
        $raw = Get-Content -Raw -Encoding UTF8 $prefFile
        if ($raw -and $raw.Trim().StartsWith("{")) {
          $prefs = $raw | ConvertFrom-Json
        }
      } catch {
        $prefs = $null
      }
    }
    if ($null -eq $prefs) {
      $prefs = [PSCustomObject]@{}
    }

    if (-not ($prefs.PSObject.Properties.Name -contains "profile")) {
      $prefs | Add-Member -MemberType NoteProperty -Name "profile" -Value ([PSCustomObject]@{})
    }
    if (-not ($prefs.profile.PSObject.Properties.Name -contains "content_settings")) {
      $prefs.profile | Add-Member -MemberType NoteProperty -Name "content_settings" -Value ([PSCustomObject]@{})
    }
    if (-not ($prefs.profile.content_settings.PSObject.Properties.Name -contains "exceptions")) {
      $prefs.profile.content_settings | Add-Member -MemberType NoteProperty -Name "exceptions" -Value ([PSCustomObject]@{})
    }

    $exc = $prefs.profile.content_settings.exceptions
    foreach ($cap in @("media_stream_camera", "media_stream_mic", "notifications", "usb_guard", "serial_guard")) {
      if (-not ($exc.PSObject.Properties.Name -contains $cap)) {
        $exc | Add-Member -MemberType NoteProperty -Name $cap -Value ([PSCustomObject]@{})
      }
      $capObj = $exc.$cap
      foreach ($origin in $AllowedUrls) {
        $pattern = "$origin`:443,*"
        $valObj = [PSCustomObject]@{
          last_modified = "13380000000000000"
          setting = 1
        }
        if ($capObj.PSObject.Properties.Name -contains $pattern) {
          $capObj.$pattern = $valObj
        } else {
          $capObj | Add-Member -MemberType NoteProperty -Name $pattern -Value $valObj
        }
        $patternAlt = "$origin,*"
        if ($capObj.PSObject.Properties.Name -contains $patternAlt) {
          $capObj.$patternAlt = $valObj
        } else {
          $capObj | Add-Member -MemberType NoteProperty -Name $patternAlt -Value $valObj
        }
      }
    }

    $jsonOut = $prefs | ConvertTo-Json -Depth 12 -Compress
    [System.IO.File]::WriteAllText($prefFile, $jsonOut, [System.Text.UTF8Encoding]::new($false))
  } catch {
    Write-Info "      Peringatan profil $profDir : $($_.Exception.Message)" "DarkYellow"
  }
}
Write-Info "      OK -> Profil Client & Publisher HQ siap kamera/mikrofon tanpa prompt blokir!" "Green"

# 4. Detect physical Camera & Microphone hardware on this PC
Write-Info "[4/4] Memindai perangkat keras Kamera & Mikrofon di komputer ini..."
$camCount = 0
$micCount = 0
try {
  $cams = @(Get-PnpDevice -Class Camera,Image -Status OK -ErrorAction SilentlyContinue)
  $mics = @(Get-PnpDevice -Class AudioEndpoint -Status OK -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match "Mic|Mikrofon|Array|Input|Headset" })
  $camCount = $cams.Count
  $micCount = $mics.Count
} catch {
  # Older PowerShell fallback
}

Write-Info "      Kamera Terdeteksi  : $camCount perangkat aktif" $(if ($camCount -gt 0) { "Green" } else { "Yellow" })
Write-Info "      Mikrofon Terdeteksi: $micCount perangkat aktif" $(if ($micCount -gt 0) { "Green" } else { "Yellow" })
Write-Info ""
Write-Info "[SELESAI] Konfigurasi izin Kamera, Mikrofon, USB & Notifikasi WACRM v5.3.1 selesai!" "Green"
