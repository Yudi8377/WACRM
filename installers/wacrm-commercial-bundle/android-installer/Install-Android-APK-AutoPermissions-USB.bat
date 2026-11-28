@echo off
title WACRM v5.3.1 - Android USB Offline Installer + Auto-Grant Semua Izin
echo =========================================================================
echo   WACRM v5.3.1 ANDROID APK INSTALLER + AUTO-GRANT IZIN KAMERA/MIKROFON
echo   Memasang APK & langsung menyalakan izin Kamera, Mikrofon, Bluetooth,
echo   Notifikasi & Galeri di Android tanpa perlu mencari menu pengaturan!
echo =========================================================================
echo.

set APK_FILE=%~dp0wacrm-android.apk
if not exist "%APK_FILE%" (
  echo [!] File wacrm-android.apk belum ada di folder android-installer\.
  echo     Unduh APK v5.3.1 dari:
  echo     https://wacrm-seven-dusky.vercel.app/android
  echo     atau GitHub Actions Artifact "wacrm-android-release-apk",
  echo     lalu simpan sebagai: %APK_FILE%
  echo.
  pause
  exit /b 1
)

where adb >nul 2>nul
if errorlevel 1 (
  echo [!] ADB (Android Platform Tools) tidak ditemukan di PATH Windows.
  echo     Opsi lebih mudah: salin file wacrm-android.apk ke HP Android lalu tap
  echo     untuk install langsung. APK v5.3.1 sudah otomatis meminta izin
  echo     Kamera, Mikrofon & Notifikasi saat pertama kali dibuka!
  echo.
  pause
  exit /b 1
)

echo [1/3] Memeriksa HP Android yang tersambung via kabel USB...
adb devices
echo.
echo [2/3] Memasang WACRM Android APK v5.3.1 secara offline...
adb install -r "%APK_FILE%"
if errorlevel 1 (
  echo [!] Instalasi APK gagal. Pastikan USB Debugging aktif di HP Android.
  pause
  exit /b 1
)

echo [3/3] Mengaktifkan otomatis SEMUA izin OS Android (Kamera, Mikrofon, Notifikasi, Bluetooth)...
adb shell pm grant com.wacrm.android android.permission.CAMERA 2>nul
adb shell pm grant com.wacrm.android android.permission.RECORD_AUDIO 2>nul
adb shell pm grant com.wacrm.android android.permission.POST_NOTIFICATIONS 2>nul
adb shell pm grant com.wacrm.android android.permission.READ_MEDIA_IMAGES 2>nul
adb shell pm grant com.wacrm.android android.permission.READ_EXTERNAL_STORAGE 2>nul
adb shell pm grant com.wacrm.android android.permission.BLUETOOTH_CONNECT 2>nul
adb shell pm grant com.wacrm.android android.permission.BLUETOOTH_SCAN 2>nul

echo.
echo [OK] SELESAI! WACRM Android v5.3.1 terpasang dengan izin Kamera & Mikrofon AKTIF!
echo Membuka WACRM di HP Android Anda...
adb shell monkey -p com.wacrm.android -c android.intent.category.LAUNCHER 1 >nul 2>nul
pause
