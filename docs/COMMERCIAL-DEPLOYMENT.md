# WACRM — Runbook deployment komersial

Dokumen ini memisahkan deployment web dari aktivasi kanal. Aplikasi yang berhasil di-build belum berarti siap menerima data pelanggan atau mengirim pesan.

## 1. Status deployment

- Repository sumber: `Yudi8377/WACRM`, branch produksi `main`.
- Runtime: Next.js pada Node.js; database PostgreSQL Neon.
- Endpoint kesiapan: `GET /api/health`. Status 200 hanya memeriksa koneksi database; bukan pengujian autentikasi, tenant, worker, atau WhatsApp.
- Jangan menambahkan secret ke Git, issue, log, atau browser.
- Deploy pertama harus memakai preview / staging terlebih dahulu. Promosi produksi setelah smoke test dan konfigurasi keamanan lulus.

## 2. Environment server

Isi melalui secret manager hosting, bukan commit file:

- `DATABASE_URL`: koneksi runtime khusus yang tidak memiliki `SUPERUSER` maupun `BYPASSRLS`; jangan gunakan `neondb_owner`.
- `APP_URL`, `AUTH_URL`: URL HTTPS deployment yang benar.
- `AUTH_SECRET`: secret acak kuat, unik per environment.
- `APP_ENCRYPTION_KEY`: kunci 32 byte untuk enkripsi token konektor; simpan di secret manager dan siapkan prosedur rotasi.
- `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `META_GRAPH_API_VERSION`: konfigurasi Meta server-side.
- URL callback OAuth harus sama persis dengan yang didaftarkan di Meta.

Kredensial akses WhatsApp dan phone-number ID bersifat spesifik per koneksi/tenant. Jangan memakai satu token global untuk semua pelanggan. Simpan token yang telah dienkripsi pada record koneksi tenant.

## 3. Gerbang database

1. Terapkan migrasi hanya ke development terlebih dahulu.
2. Provision role runtime melalui Neon Console atau mekanisme role-management yang benar-benar dapat menghapus `BYPASSRLS`.
3. Verifikasi katalog PostgreSQL: `rolsuper = false` dan `rolbypassrls = false`.
4. Berikan hanya hak minimum pada schema dan tabel yang dibutuhkan.
5. Jalankan uji akses tanpa tenant context, anggota aktif, anggota dicabut, dan akses lintas dua tenant.
6. Uji transaksi paralel agar `app.tenant_id` tidak bocor antar-request akibat penggunaan koneksi pool.
7. Baru setelah semua lulus, tinjau migrasi production secara eksplisit; jangan jalankan migrasi otomatis saat boot.

## 4. Gerbang WhatsApp

1. Siapkan Meta App, WhatsApp Business Account, nomor bisnis, token akses yang sesuai, dan izin resmi.
2. Daftarkan endpoint `/api/webhooks/meta` pada konfigurasi webhook Meta dan pilih event yang dibutuhkan.
3. Verifikasi challenge GET dan signature HMAC POST menggunakan payload dari Meta.
4. Pastikan webhook inbox menyimpan event secara durable dan deduplikasi event bekerja.
5. Implementasikan dan verifikasi worker yang memetakan `phone_number_id` ke koneksi tenant, lalu memproses event secara idempoten dengan retry dan dead-letter.
6. Uji pesan masuk, status delivered/read/failed, duplikasi, urutan event, timeout, rate limit, token kedaluwarsa, dan retry.
7. Uji pengiriman keluar ke nomor penguji yang telah memberi persetujuan (opt-in). Terapkan aturan template/jendela layanan WhatsApp yang berlaku.
8. Jangan membuka aktivasi pelanggan umum sebelum pemetaan tenant, otorisasi, enkripsi token, audit log, dan uji lintas tenant lulus.

## 5. Gerbang operasional

- Autentikasi dan onboarding tenant aktif; role owner/admin/supervisor/agent/viewer diuji.
- Pembatasan laju berbagi (distributed rate limit) dan perlindungan abuse aktif.
- Backup otomatis serta latihan restore terdokumentasi.
- Retensi, ekspor, dan penghapusan data pelanggan ditetapkan.
- Monitoring error, latency, antrean webhook, dan notifikasi kegagalan aktif.
- CI lint, typecheck, test, build berhasil pada commit yang akan dipromosikan.
- Smoke test HTTPS, health, login, otorisasi tenant, webhook, dan halaman error selesai.

## 6. Kriteria go-live

Rilis komersial hanya dinyatakan siap ketika setiap gerbang di atas mempunyai bukti uji, tidak ada akses lintas tenant, tidak ada secret di log/browser, dan uji WhatsApp end-to-end lulus. Konektor Messenger, Instagram, TikTok, dan YouTube tetap berstatus belum aktif sampai implementasi dan izin platform masing-masing selesai.
