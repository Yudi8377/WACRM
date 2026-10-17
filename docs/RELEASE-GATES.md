# Gerbang rilis komersial WACRM

Dokumen ini adalah checklist operasional yang harus dibuktikan dengan hasil uji, bukan asumsi. Jangan mengaktifkan trafik pelanggan hanya karena CI hijau.

## A. Database dan isolasi tenant — pemblokir rilis

- [ ] Pada branch development, provision role runtime terpisah melalui Neon Console/administrasi yang benar-benar mendukung `NOBYPASSRLS`.
- [ ] Verifikasi role runtime memiliki `rolsuper = false` dan `rolbypassrls = false`; jangan memakai `neondb_owner` untuk request aplikasi.
- [ ] Simpan connection string runtime sebagai secret deployment; jangan tampilkan atau commit nilainya.
- [ ] Jalankan query bisnis dengan konteks `app.user_id` dan `app.tenant_id` yang disetel per transaksi, setelah otorisasi keanggotaan server-side. Pastikan tidak ada konteks yang bocor antar request.
- [ ] Tambahkan integration test dua tenant: baca/tulis lintas tenant harus ditolak, termasuk FK, contact identity, conversation, message, channel connection, dan webhook inbox.
- [ ] Verifikasi role worker terpisah dan kebijakan akses webhook inbox sebelum mengaktifkan pemrosesan event. Jangan memberi akses baca/ubah antrean kepada role intake publik tanpa kebutuhan.
- [ ] Uji backup dan pemulihan; catat langkah rollback dan waktu pemulihan.

## B. Autentikasi dan organisasi

- [ ] Implementasikan provider autentikasi produksi, verifikasi email bila relevan, sesi aman, rotasi secret, logout dan pencabutan sesi.
- [ ] Terapkan pemeriksaan keanggotaan dan RBAC pada setiap server action/API; jangan percaya tenant ID dari browser tanpa otorisasi.
- [ ] Uji pencegahan CSRF, XSS, brute force, session fixation, privilege escalation, dan kebocoran data antar organisasi.

## C. WhatsApp Cloud API end-to-end

- [ ] Konfigurasikan Meta App, WABA, nomor bisnis, token akses, izin yang disetujui, URL HTTPS, verify token, dan app secret melalui secret manager.
- [ ] Verifikasi challenge webhook dan signature HMAC atas raw body; uji signature salah, payload malformed, payload terlalu besar, retry, duplikasi, serta kegagalan database.
- [ ] Simpan event secara tahan lama; implementasikan worker antrean yang idempotent, retry dengan backoff, dead-letter handling, dan observabilitas.
- [ ] Implementasikan dan uji pengiriman pesan resmi, template yang disetujui, jendela layanan pelanggan, status terkirim/gagal, batas laju, dan penanganan token kedaluwarsa.
- [ ] Uji alur nyata menggunakan akun/nomor uji Meta sebelum menghubungkan pelanggan.

## D. Operasional dan privasi

- [ ] Atur HTTPS, domain, secret management, rate limiting terdistribusi, alarm error, log terstruktur yang tidak berisi token/pesan sensitif, serta prosedur insiden.
- [ ] Terapkan kebijakan retensi, ekspor/penghapusan data, persetujuan/tujuan pemrosesan, dan akses staf minimum.
- [ ] Jalankan lint, typecheck, test, build, migration validation, dependency scan, dan tes smoke setelah deployment.
- [ ] Health probe `GET /api/health` harus mengembalikan 200 hanya saat database dapat dijangkau; respons tidak boleh memuat detail koneksi.
- [ ] Dokumentasikan backup/restore, pemantauan, dukungan pelanggan, billing, syarat layanan, kebijakan privasi, dan prosedur pembatalan sebelum menerima pembayaran.

## E. Kanal tambahan

Messenger, Instagram, TikTok Business Messaging, dan YouTube tetap berstatus fondasi sampai akses developer, izin/App Review, OAuth, sinkronisasi, serta tes end-to-end masing-masing terbukti. Jangan memasarkan kanal sebagai aktif sebelum itu.

## Gerbang produksi

Rilis hanya setelah semua kotak A–D relevan selesai, hasil tes dapat diperiksa, dan koneksi akun provider nyata telah berhasil. Migrasi Neon production dan pergantian trafik produksi tidak termasuk dalam perubahan dokumentasi atau CI ini; keduanya memerlukan rencana rilis, backup, serta verifikasi eksplisit.
