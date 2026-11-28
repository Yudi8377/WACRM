===========================================================================
  PANDUAN INSTALASI ANDROID WACRM v5.3.1 (AUTO-IZIN KAMERA & MIKROFON)
===========================================================================

KENAPA SEBELUMNYA MENU IZIN KAMERA/MIKROFON TIDAK ADA DI PENGATURAN HP?
Karena instalasi "Tambahkan ke Layar Utama" dari Chrome adalah PWA WebAPK
yang izinnya ikut Google Chrome (bukan di Pengaturan Aplikasi WACRM).

SOLUSI PERMANEN DENGAN NATIVE APK WACRM v5.3.1 (com.wacrm.android):
1. Unduh APK Android v5.3.1 terbaru dari:
   - Halaman Installer Resmi : https://wacrm-seven-dusky.vercel.app/android
   - GitHub Actions Artifact : https://github.com/Yudi8377/WACRM/actions
2. Tap file wacrm-android.apk di HP Android -> Instal.
3. Saat pertama kali dibuka, WACRM v5.3.1 OTOMATIS menampilkan jendela
   "Setup Awal Perangkat WACRM v5.3" untuk mengaktifkan:
   - Kamera Belakang (QR Scanner & FIFO Barang)
   - Mikrofon (AI Voice Companion 24/7 + MODIFY_AUDIO_SETTINGS)
   - Notifikasi Order & Bluetooth Thermal Printer / USB OTG
4. Semua izin langsung terdaftar resmi di:
   Pengaturan HP -> Aplikasi -> WACRM -> Izin

OPSIONAL VIA PC WINDOWS (ZERO-PROMPT PROVISIONING):
Jika ingin memasang ke banyak HP kasir/gudang sekaligus, letakkan file
wacrm-android.apk di folder ini dan jalankan:
  Install-Android-APK-AutoPermissions-USB.bat
Script akan memasang APK offline + menjalankan `adb shell pm grant`
untuk Kamera, Mikrofon, Notifikasi & Bluetooth otomatis!
