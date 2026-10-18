# Integrasi API kanal resmi

## Pola umum
1. Pengguna organisasi memilih **Hubungkan kanal**.
2. Server menjalankan OAuth/flow onboarding resmi; `state` harus acak, berumur pendek, terikat sesi, dan sekali pakai.
3. Token disimpan terenkripsi di server. Token tidak pernah dikirim kembali ke browser atau dicatat dalam log.
4. Webhook diverifikasi sebelum payload diproses; event disimpan dengan unique key untuk idempotensi.
5. Event dinormalisasi ke model kontak/percakapan/pesan internal.
6. Pengiriman keluar harus melalui otorisasi tenant, idempotensi, kebijakan jendela layanan, batas rate, serta penanganan kegagalan yang aman. Pengiriman bervolume tinggi memerlukan outbox/worker khusus.

## WhatsApp Business Cloud API (P0)
Dokumentasi: https://developers.facebook.com/docs/whatsapp/cloud-api/
- Endpoint provider menggunakan Graph API dan ID versi Graph yang dikonfigurasi.
- Kebutuhan konfigurasi: Meta App ID/Secret, verify token webhook, WABA ID, Phone Number ID, access token, izin yang sesuai.
- Webhook: verifikasi challenge GET dan tanda tangan `X-Hub-Signature-256` pada POST menggunakan raw body dan HMAC-SHA256.
- Pesan bisnis tunduk pada aturan jendela layanan, template, kualitas, kebijakan, dan biaya Meta yang berlaku.

### Pengaturan koneksi WhatsApp di dashboard

Buka **Dashboard → workspace → Kelola kanal WhatsApp**. Pemilik/admin dapat memasukkan WABA ID, Phone Number ID, dan system-user access token dari Meta Business Manager. Server memeriksa token terhadap `META_APP_ID`/`META_APP_SECRET`, memastikan izin `whatsapp_business_management` dan `whatsapp_business_messaging`, memverifikasi nomor berada di WABA yang dipilih, lalu menyimpan token terenkripsi menggunakan `APP_ENCRYPTION_KEY`. Token mentah tidak dikembalikan ke browser atau ditulis ke log. Gunakan HTTPS dan token yang dikelola khusus untuk aplikasi ini; jangan gunakan token sementara pada produksi.

Webhook callback Meta: `https://<domain-anda>/api/webhooks/meta`. Konfigurasikan `META_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET`, dan subscription untuk `messages`. URL tersebut belum bisa diverifikasi secara publik sampai runtime HTTPS tersedia.

### Endpoint balasan WhatsApp WACRM

`POST /api/organizations/{tenantId}/conversations/{conversationId}/messages`

- Memerlukan sesi login Better Auth dan keanggotaan tenant aktif.
- Header `Idempotency-Key` wajib berupa UUID baru untuk setiap niat mengirim pesan.
- Body JSON: `{ "text": "..." }`; teks dibatasi 1–4096 karakter.
- Hanya peran owner/admin/supervisor/agent, percakapan WhatsApp terbuka/menunggu, dan koneksi `connected` yang dapat mengirim.
- Balasan teks bebas ditolak setelah jendela layanan 24 jam; alur template yang disetujui belum tersedia.
- Status `sent` berarti API menerima permintaan, bukan bukti pesan sudah delivered. Status delivered/read diperbarui dari webhook.
- Pengiriman sinkron dengan catatan idempotensi persisten; jika respons 502/503 atau status `queued`, jangan melakukan retry otomatis dengan kunci baru karena provider mungkin telah menerima pesan. Periksa status terlebih dahulu.
- Rate limiting per tenant dan outbox retry otomatis tetap menjadi gerbang sebelum volume komersial tinggi.

## Evolution API (opsional, bukan default)

Penilaian, daftar komponen, batasan adapter, arsitektur, dan pemeriksaan lisensi tersedia di [`EVOLUTION-API-ADOPTION.md`](./EVOLUTION-API-ADOPTION.md). Helper `src/lib/connectors/evolution-api.ts` adalah adapter dasar server-side; belum terhubung ke alur pelanggan atau webhook inbound. Meta WhatsApp Cloud API tetap provider default. Sebelum memakai Evolution API dalam SaaS komersial, pin versi, tinjau kewajiban aktivasi runtime dan ketentuan notifikasi lisensi, serta dapatkan konfirmasi tertulis bila diperlukan.

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
