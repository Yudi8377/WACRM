# WACRM Android App (`com.wacrm.android`)

Aplikasi Android native Kotlin (Material 3 + AndroidX SplashScreen + SwipeRefresh + JavaScript Native Bridge) untuk ruang kerja **WACRM Omnichannel WhatsApp CRM** yang terhubung ke web app live dan database Neon PostgreSQL (`small-tree-35716017` / `br-patient-mud-a1xi2iun`).

## Fitur Native Android
- **Persistent Session Cookies** (`CookieManager`) sehingga sesi login Better Auth bertahan setelah aplikasi ditutup.
- **Native JavaScript Bridge (`window.WACRMAndroid`)**: Toast native, Android Share Sheet, haptic feedback, versi aplikasi, dan Pengaturan Server langsung dari UI web.
- **Pengaturan Server Dinamis**: Beralih antara Live Production, Mode Demo (`/demo`), atau server self-hosted HTTPS kustom.
- **Smart Pull-to-Refresh & File Uploader**: Mendukung upload lampiran dari galeri/dokumen Android serta deteksi mode offline dengan layar pemulihan native.
- **Keamanan Jaringan**: `network_security_config.xml` memblokir trafik HTTP non-HTTPS untuk domain publik dan `UrlValidator` menolak kredensial tertanam / skema tidak aman.

## Build Lokal (Android Studio / CLI)
```bash
cd android
gradle testDebugUnitTest assembleDebug -PWACRM_BASE_URL=https://wacrm-seven-dusky.vercel.app
```
APK debug akan tersedia di `android/app/build/outputs/apk/debug/app-debug.apk`.

## Build Otomatis via GitHub Actions
Workflow `.github/workflows/android-release.yml` otomatis menjalankan unit test Kotlin (`UrlValidatorTest`) dan mengompilasi APK debug siap pasang (`wacrm-android-debug.apk`) setiap kali ada perubahan di `android/` atau dipicu manual lewat tab **Actions → Android APK Build**.
