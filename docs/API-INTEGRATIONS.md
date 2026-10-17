# Integrasi API kanal resmi

## Pola umum
1. Pengguna organisasi memilih **Hubungkan kanal**.
2. Server menjalankan OAuth/flow onboarding resmi; `state` harus acak, berumur pendek, terikat sesi, dan sekali pakai.
3. Token disimpan terenkripsi di server. Token tidak pernah dikirim kembali ke browser atau dicatat dalam log.
4. Webhook diverifikasi sebelum payload diproses; event disimpan dengan unique key untuk idempotensi.
5. Event dinormalisasi ke model kontak/percakapan/pesan internal.
6. Pengiriman keluar melewati antrean persisten, batas rate per tenant/kanal, retry dengan exponential backoff dan dead-letter queue.

## WhatsApp Business Cloud API (P0)
Dokumentasi: https://developers.facebook.com/docs/whatsapp/cloud-api/
- Endpoint provider menggunakan Graph API dan ID versi Graph yang dikonfigurasi.
- Kebutuhan konfigurasi: Meta App ID/Secret, verify token webhook, WABA ID, Phone Number ID, access token, izin yang sesuai.
- Webhook: verifikasi challenge GET dan tanda tangan `X-Hub-Signature-256` pada POST menggunakan raw body dan HMAC-SHA256.
- Pesan bisnis tunduk pada aturan jendela layanan, template, kualitas, kebijakan, dan biaya Meta yang berlaku.

## Facebook Messenger (P1)
Dokumentasi: https://developers.facebook.com/docs/messenger-platform/
- Perlu Page access token, webhook subscription, izin Messenger dan App Review/Advanced Access bila disyaratkan.
- Jendela pesan dan kebijakan pesan harus ditegakkan pada level connector.

## Instagram Messaging (P1)
Dokumentasi: https://developers.facebook.com/docs/messenger-platform/instagram/
- Fokus pada akun Instagram profesional dan aset/izin Meta yang kompatibel.
- Tidak semua akun atau jenis interaksi tersedia untuk semua aplikasi.

## TikTok Business Messaging (P1)
Dokumentasi: https://business-api.tiktok.com/portal/docs/business-messaging-api-get-started/v1.3
- Daftar sebagai developer, buat aplikasi, minta akses Business Messaging, jalankan authorization, lalu daftarkan webhook.
- Ketersediaan produk/izin bergantung pada kelayakan akun dan persetujuan TikTok.
- TikTok Content Posting API terpisah dari Business Messaging API; jangan menganggap izin pesan otomatis mengizinkan publikasi konten.

## YouTube Data API v3 (P1)
Dokumentasi: https://developers.google.com/youtube/v3
- Gunakan Google Cloud project, aktifkan YouTube Data API v3, konfigurasi OAuth consent, dan minta scope minimum.
- Cocok untuk data kanal/video, komentar dan balasan yang diizinkan; bukan pengganti API DM.
- Operasi tulis memerlukan OAuth dari pemilik akun/kanal dan kuota API.

## Variabel lingkungan
Lihat `.env.example`. Semua secret diatur di secret manager deployment. Jangan commit token, `.env.local`, database URL, atau payload pelanggan.

## Gerbang sebelum produksi
- Buat aplikasi developer dan lengkapi detail kebijakan privasi/URL penghapusan data bila diminta.
- Lengkapi App Review/Advanced Access dan verifikasi bisnis sesuai kebutuhan.
- HTTPS untuk webhook; uji signature, replay, duplikasi, urutan event, retry dan token kedaluwarsa.
- Uji isolasi tenant dan penghapusan data sebelum mengaktifkan pelanggan eksternal.
