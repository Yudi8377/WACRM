# Evaluasi dan rencana adopsi Evolution API untuk WACRM

Tanggal evaluasi: 18 Oktober 2026.

Referensi yang diperiksa:
- Repository: https://github.com/evolution-foundation/evolution-api
- README: https://github.com/evolution-foundation/evolution-api/blob/main/README.md
- Docker Compose: https://github.com/evolution-foundation/evolution-api/blob/main/docker-compose.yaml
- License: https://github.com/evolution-foundation/evolution-api/blob/main/LICENSE
- Releases: https://github.com/evolution-foundation/evolution-api/releases

## Ringkasan keputusan

**Gunakan Evolution API sebagai provider opsional yang berjalan terpisah; jangan mengganti WACRM atau menjadikan Evolution API satu-satunya jalur WhatsApp.** WACRM tetap menjadi produk CRM, tenant authorization, customer inbox, audit, token storage, dan kontrol langganan. Evolution API hanya menjadi service transport eksternal jika organisasi memilih dan menyetujuinya.

Urutan provider yang disarankan:
1. **Meta WhatsApp Cloud API** sebagai pilihan default produksi: API resmi dan jalur dukungan utama.
2. **Evolution API yang dikonfigurasi menggunakan WhatsApp Cloud API** sebagai opsi deployment bagi pelanggan yang memang membutuhkan lapisan provider terpisah.
3. **Evolution API dengan Baileys/WhatsApp Web** tidak diaktifkan sebagai default komersial. Metode ini berbeda dari Cloud API resmi, mengandalkan sesi WhatsApp Web, dan membawa risiko kestabilan, pemutusan sesi, kebijakan, serta dukungan operasional yang lebih besar. Jangan memasarkan metode tersebut sebagai API resmi Meta.

## Komponen/atribut yang layak diadopsi

| Komponen Evolution API | Nilai untuk WACRM | Rencana |
|---|---|---|
| REST API pengiriman pesan | Memungkinkan adapter provider terpisah tanpa mengubah inbox WACRM | Adapter helper awal ada di `src/lib/connectors/evolution-api.ts`; belum terhubung ke endpoint pelanggan |
| Nama instance per koneksi | Memetakan koneksi provider ke nomor/akun yang dikelola pelanggan | Instance harus disimpan pada koneksi tenant dan diperiksa server; jangan menerima nama instance arbitrer dari browser |
| API key pada header `apikey` | Autentikasi server-ke-server | Simpan hanya di secret store/enkripsi server; jangan kirim API key ke frontend atau log |
| Webhook/event-driven | Mengirim event pesan masuk dan status pengiriman ke WACRM | Buat endpoint webhook khusus provider dengan autentikasi/signature/secret, deduplikasi, batas payload, dan durable inbox |
| Antrean/event broker (RabbitMQ, Kafka, SQS, NATS) | Mengisolasi proses masuk/keluar dan retry dari request web | Pertahankan worker WACRM dan Neon sebagai sumber data CRM; adopsi broker hanya ketika volume/operasional membenarkannya |
| Socket.IO/WebSocket | Pembaruan inbox langsung | Tambahkan setelah kontrak event dan autentikasi tenant selesai; jangan mengandalkan event socket sebagai penyimpanan permanen |
| Media lokal atau S3/MinIO | Gambar, dokumen, audio, dan video pelanggan | Gunakan object storage dengan URL berumur pendek; hindari menaruh media besar di tabel Neon |
| Transkripsi audio | Membantu AI Host memahami pesan suara | Modul opsional; perlu persetujuan/retensi data dan kontrol biaya |
| Integrasi Chatwoot, Typebot, Dify, OpenAI | Pilihan konektor eksternal | Jangan mengimpor semua integrasi. Hubungkan melalui kontrak provider/automation WACRM satu per satu sesuai kebutuhan |

## Adapter yang ditambahkan

`src/lib/connectors/evolution-api.ts` menyediakan helper server-side untuk mengirim teks ke endpoint Evolution API `/message/sendText/{instance}` menggunakan header `apikey`. Helper:
- memvalidasi nomor tujuan, teks, nama instance, dan URL;
- mensyaratkan HTTPS untuk host non-lokal;
- menetapkan timeout;
- mengklasifikasikan 408/429/5xx sebagai kegagalan yang mungkin dapat dicoba ulang;
- tidak memasukkan body error provider yang berpotensi sensitif ke pesan error;
- memerlukan ID pesan dari respons sebelum mengembalikan status diterima.

Unit test awal berada di `src/lib/connectors/evolution-api.test.ts`.

**Batasan saat ini:** ini adalah adapter dasar, belum ada form aktivasi Evolution API, tabel/kolom untuk menyimpan endpoint dan instance per tenant, pembukaan API key terenkripsi, pemeriksaan hak akses sebelum pemanggilan, webhook inbound Evolution API, atau tes end-to-end terhadap instance nyata. Jangan menganggap provider ini sudah aktif untuk pelanggan.

## Integrasi arsitektur yang disarankan

```text
WACRM UI / API
  -> autentikasi + role + tenant context
  -> kebijakan pesan, consent, jendela layanan, idempotency
  -> connector registry
       -> Meta Cloud API (default)
       -> Evolution API (opt-in)
  -> durable outbox / worker
  -> Neon: status CRM, pesan, audit, webhook inbox

Provider webhook
  -> verifikasi sumber + batas payload
  -> dedupe event
  -> durable inbox di Neon
  -> worker normalisasi
  -> contact / conversation / message
```

Aturan penting:
- Tenant ID harus berasal dari sesi dan membership server-side, bukan request body.
- Jangan menyimpan dua sumber kebenaran untuk pesan: WACRM menyimpan model CRM dan status yang dinormalisasi; provider menjadi sumber ID/status transport.
- Gunakan kunci idempotensi untuk setiap niat mengirim pesan. Retry dengan kunci yang sama; jangan kirim ulang dengan kunci baru hanya karena timeout.
- Webhook perlu menangani event duplikat, status yang datang tidak berurutan, replay, payload tak dikenal, dan kegagalan database.
- Jangan menganggap respons HTTP sukses berarti pesan sudah delivered; tunggu status webhook.
- Semua pesan outbound harus tetap melewati aturan consent, opt-out, template/jendela layanan, rate limit, dan kebijakan provider.
- Pisahkan secret API global Evolution dari token/instance setiap pelanggan. Jika API key sama untuk semua tenant, aksesnya harus terbatas pada jaringan privat dan instance harus diturunkan dari koneksi tenant yang telah diotorisasi.
- Jangan mengekspos endpoint administrasi Evolution API ke internet tanpa autentikasi, TLS, pembatasan jaringan, dan rotasi key.

## Infrastruktur

README Evolution API mendokumentasikan Node.js, PostgreSQL/MySQL, Redis yang direkomendasikan, Docker, dan pilihan integrasi event/media. Docker Compose yang ditinjau menjalankan API, Redis, dan database Postgres dalam stack tersendiri. Untuk WACRM:
- WACRM tetap menggunakan Neon PostgreSQL untuk data CRM.
- Jika Evolution API dijalankan sendiri, gunakan database terpisah yang didukung versi Evolution API; jangan menggunakan skema/tabel Neon WACRM sebagai database internal Evolution API.
- Tempatkan Evolution API dan WACRM dalam jaringan privat, lalu publikasikan hanya endpoint yang memang diperlukan melalui HTTPS.
- Pin versi image berdasarkan release/tag yang telah diuji; hindari `:latest` untuk produksi.
- Tetapkan backup, pemantauan, batas resource, retensi media, dan prosedur pemulihan sesi.
- Jangan mengaktifkan Redis/RabbitMQ/Kafka hanya karena tersedia. Mulai dari komponen minimum yang diperlukan dan ukur beban terlebih dahulu.

## Pemeriksaan lisensi dan release

Lisensi yang ada di repository bukan sekadar Apache-2.0 tanpa syarat tambahan. File `LICENSE` menyatakan:
- penggunaan backend komersial diperbolehkan menurut lisensi yang dinyatakan, tetapi ada persyaratan tambahan;
- jika menggunakan komponen frontend Evolution, logo dan copyright tidak boleh dihapus/diubah tanpa lisensi komersial;
- proyek yang menggunakan Evolution API harus menampilkan pemberitahuan penggunaan yang jelas bagi administrator dan di dokumentasi/pengaturan. Lisensi menyatakan kegagalan mematuhi ketentuan ini dapat memerlukan lisensi komersial menurut penilaian produsen;
- untuk kepastian model SaaS, distribusi, dan notifikasi, minta konfirmasi tertulis kepada Evolution Foundation sebelum go-live.

Catatan versi: halaman rilis yang ditinjau mencatat perubahan pada rilis 2.4.0 (6 Mei 2026) yang mewajibkan aktivasi lisensi pada runtime sebelum endpoint bisnis melayani trafik. Karena perilaku ini dapat berbeda antarversi, **jangan deploy versi terbaru secara membabi buta**. Pin versi yang akan dipakai, baca catatan rilis dan syarat aktivasi untuk versi tersebut, lalu verifikasi biaya, persyaratan lisensi, telemetry, dan prosedur aktivasi terlebih dahulu.

WACRM tidak menyalin source code Evolution API ke dalam repository ini. Adapter dibuat terpisah agar dapat ditinjau sendiri dan menghindari penggabungan kode/ketergantungan yang belum diperlukan.

## Checklist sebelum mengaktifkan untuk pelanggan

- [ ] Tentukan apakah deployment memakai Cloud API resmi atau Baileys; Cloud API adalah default.
- [ ] Tinjau syarat lisensi dan minta persetujuan tertulis jika model komersial memerlukannya.
- [ ] Pin image/version dan verifikasi aktivasi/entitlement untuk versi yang dipilih.
- [ ] Simpan API key dan instance metadata dengan aman; koneksi ditautkan ke tenant yang berhak.
- [ ] Implementasikan UI aktivasi, health check, rotasi/revoke credential, serta audit log.
- [ ] Implementasikan webhook provider, signature/secret verification, dedupe, worker, dan status delivered/read.
- [ ] Tambahkan rate limiting, batas ukuran payload/media, retry dengan backoff, dead-letter dan observability.
- [ ] Uji tenant isolation, kredensial invalid, replay/duplicate webhook, outage provider, dan restore.
- [ ] Lakukan tes end-to-end menggunakan nomor uji dan opt-in yang sah sebelum traffic pelanggan.
