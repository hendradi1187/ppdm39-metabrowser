# PPDM39MetaBrowser (PHP sederhana)

Aplikasi PHP "wordpress-feel" yang membaca **PPDM Meta Model** (tabel PPDM_*) dan menampilkan:
- daftar tabel
- detail tabel (kolom, PK/FK/UK/CK, komentar, synonym/alias)
- child tables (tabel yang mereferensikan tabel ini)
- urutan pengisian tabel (load order) berdasarkan FK (topological sort)
- (opsional) audit ke **Target DB** (cek tabel/kolom ada atau tidak + orphan FK)

## Prasyarat
- PHP 8+ (bisa via Laragon/XAMPP)
- PostgreSQL
- ekstensi `pdo_pgsql` aktif

## Konfigurasi
Copy `config/config.sample.php` menjadi `config/config.php` lalu isi:
- koneksi **META DB** (wajib) = DB yang berisi tabel PPDM_* (meta model)
- koneksi **TARGET DB** (opsional) = DB PPDM39 real yang mau diaudit

## Menjalankan
Taruh folder `ppdm39metabrowser/` di web root (mis. `laragon/www/`), lalu buka:
- `http://localhost/ppdm39metabrowser/public/`

## Catatan penting
- Aplikasi **tidak** butuh tabel PPDM operasional selain meta model. Audit target memerlukan akses ke `information_schema` dan data tabel target.
