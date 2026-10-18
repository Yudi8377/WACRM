# WACRM — Verifikasi keamanan development

Tanggal pemeriksaan: 18 Oktober 2026. Scope: Neon development branch saja.

## Hasil terverifikasi

- Role runtime khusus `wacrm_runtime` dibuat pada branch development.
- Katalog PostgreSQL mengonfirmasi:
  - `rolsuper = false`
  - `rolbypassrls = false`
  - `rolcreatedb = false`
  - `rolcreaterole = false`
  - `rolinherit = false`
- Koneksi langsung sebagai `wacrm_runtime` berhasil.
- Query tabel `contacts` tanpa tenant context mengembalikan nol baris.
- Semua 12 tabel publik yang diperiksa memiliki Row Level Security aktif dan `FORCE ROW LEVEL SECURITY`.
- Skrip rollback-only `db/tests/rls_isolation.sql` dijalankan pada development menggunakan role runtime; tenant isolation, penolakan insert lintas tenant, dan tidak adanya visibilitas tanpa context lulus.
- Kredensial role tidak disimpan di repository atau ditampilkan dalam log.

## Batasan hasil

Ini belum membuktikan seluruh aplikasi aman untuk produksi. Tes ini tidak menggantikan autentikasi, validasi keanggotaan pada setiap request, uji pool paralel, otorisasi worker webhook, atau pengujian end-to-end.

Role ini hanya dibuat pada development. Production branch belum diubah. Jangan mengarahkan deployment produksi ke role owner atau menganggap role development dapat dipakai di production. Provision role production harus dilakukan terpisah setelah auth, grant minimum, dan deployment secret manager siap.
