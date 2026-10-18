# WACRM — Omnichannel CRM

WACRM adalah aplikasi CRM omnichannel mandiri yang dibangun untuk WhatsApp Business terlebih dahulu, dengan fondasi konektor Facebook Messenger, Instagram Messaging, TikTok Business Messaging, dan YouTube Data API sejak awal.

## Prinsip proyek
- Repository dan database berdiri sendiri; tidak terintegrasi ke Aptinusa atau WA-AI-HOST-LIVE.
- PostgreSQL dikelola melalui Neon.
- API resmi platform, OAuth, webhook terverifikasi, serta token yang dienkripsi di sisi server.
- Arsitektur multi-tenant: setiap query bisnis dibatasi oleh organisasi/tenant dan keanggotaan pengguna.
- Integrasi kanal berbasis adapter agar penambahan kanal tidak mengubah model percakapan inti.
- Jangan pernah menyimpan secret/API token di Git atau mengirimkannya ke browser.

## Status integrasi
| Kanal | Adapter | Aktivasi produksi |
|---|---|---|
| WhatsApp Business Cloud API | Prioritas P0 | Memerlukan Meta App, WABA/nomor, token, webhook HTTPS, izin yang sesuai |
| Facebook Messenger | Fondasi P1 | Memerlukan Meta App, Page token, izin/App Review yang sesuai |
| Instagram Messaging | Fondasi P1 | Memerlukan akun profesional, aset Meta terkait, izin/App Review yang sesuai |
| TikTok Business Messaging | Fondasi P1 | Memerlukan developer app, akses produk/izin dan otorisasi bisnis |
| YouTube Data API v3 | Fondasi P1 | Memerlukan Google Cloud project, API aktif, OAuth consent dan scope yang sesuai |

Status 'fondasi' tidak berarti akun platform sudah tersambung atau App Review sudah disetujui.

## Autentikasi dan workspace
- Autentikasi email/kata sandi ditangani Better Auth pada server, dengan sesi disimpan di Neon.
- Gunakan kata sandi minimal 12 karakter dan `AUTH_SECRET` acak yang kuat (minimal 32 karakter); jangan pernah commit secret.
- Setelah daftar/masuk, pengguna dapat membuat workspace organisasi. RLS dan membership tetap membatasi akses data tenant.
- Migrasi `0004_better_auth_and_membership_listing.sql` harus diuji pada branch `development` sebelum produksi. Berikan hak tabel autentikasi kepada role runtime secara eksplisit.

## Pemrosesan webhook
- Webhook Meta yang lolos validasi signature disimpan dahulu ke `webhook_inbox` agar provider dapat menerima acknowledgment dengan cepat.
- Worker terpisah (`node scripts/webhook-worker.mjs`) memproses pesan/status WhatsApp dengan claim berbasis row-lock, idempotensi, retry terbatas, dan dead-letter.
- Worker memakai `WEBHOOK_WORKER_DATABASE_URL` dan role terpisah; jangan gunakan kredensial `neondb_owner` atau `wacrm_runtime` untuk worker.
- Status `connected` pada koneksi kanal diperlukan sebelum pesan dapat dipetakan ke tenant.

## Database
Gunakan Neon branch `development` untuk migrasi dan pengujian. Branch `production` tidak boleh dimigrasikan sebelum hasil pengujian development ditinjau.

## Konfigurasi
Salin `.env.example` menjadi `.env.local` di lingkungan lokal dan isi kredensial melalui secret manager/host. Jangan commit `.env.local`.

## API resmi
- WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api/
- Messenger Platform: https://developers.facebook.com/docs/messenger-platform/
- Instagram Messaging: https://developers.facebook.com/docs/messenger-platform/instagram/
- TikTok Business Messaging: https://business-api.tiktok.com/portal/docs/business-messaging-api-get-started/v1.3
- YouTube Data API v3: https://developers.google.com/youtube/v3

## Keamanan minimum sebelum produksi
Validasi signature webhook; idempotensi event; enkripsi token; rate limiting terdistribusi; RBAC berbasis organisasi; audit log; pembatasan izin OAuth; rotasi token; kebijakan retensi dan penghapusan data; pengujian isolasi tenant; dan CI untuk lint, typecheck, test, serta build.