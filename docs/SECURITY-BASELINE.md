# Baseline keamanan WACRM

- Semua data bisnis memiliki `tenant_id`; setiap operasi harus melalui pemeriksaan keanggotaan organisasi di server.
- Terapkan PostgreSQL RLS untuk tabel tenant dan set `app.tenant_id` secara lokal per transaksi setelah otorisasi server. Jangan memakai connection role superuser/BYPASSRLS untuk request aplikasi.
- Kredensial kanal dienkripsi dengan AES-256-GCM menggunakan kunci aplikasi dari secret manager; rotasi dan versi kunci perlu direncanakan.
- Verifikasi webhook memakai raw request body dan signature resmi; gagal tertutup jika secret/signature tidak tersedia atau salah.
- Terapkan idempotensi event, proteksi replay, rate limiting terdistribusi, audit log tanpa secret, dan antrean persisten.
- Gunakan OAuth state + PKCE bila didukung, scope minimum, expiry/refresh/revocation, dan penghapusan koneksi yang mencabut token jika API mendukung.
- Tambahkan CSP enforcement setelah dependensi UI dipetakan; security headers saja bukan audit keamanan.
- CI wajib: lint, typecheck, tests, build, migration validation, dependency/security scan.
- Sebelum produksi: uji lintas tenant, SSRF, CSRF, XSS, kebocoran log, webhook spoofing, token expiry, backup/restore, dan penghapusan data.

Dokumen ini adalah target kontrol keamanan, bukan pernyataan bahwa aplikasi sudah diaudit atau siap produksi.

## Catatan verifikasi Neon saat inisialisasi

- Role bawaan `neondb_owner` pada branch development terverifikasi memiliki `rolbypassrls=true`; role ini **tidak boleh** dipakai sebagai kredensial runtime aplikasi.
- Pembuatan role runtime melalui konektor Neon pada sesi ini juga menghasilkan role dengan `BYPASSRLS`; role percobaan tersebut telah dihapus dan tidak digunakan.
- Sebelum aplikasi dihubungkan ke data pelanggan, provision role runtime melalui mekanisme administrasi Neon yang mendukung `NOBYPASSRLS`, lalu verifikasi `rolsuper=false` dan `rolbypassrls=false` pada role tersebut. Jangan lanjut ke produksi sebelum pemeriksaan ini lulus.
- RLS policy aktif pada 12 tabel branch development, tetapi keberadaan policy tidak cukup bila role koneksi dapat melewati RLS.
