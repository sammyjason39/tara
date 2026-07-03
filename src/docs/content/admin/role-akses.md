# Role & Akses

Kelola role dan permission pengguna TARA.

## Role bawaan

| Role | Akses utama |
|------|-------------|
| **SuperAdmin** | Semua fitur + konfigurasi sistem |
| **HR_Admin** | HR operasional, karyawan, SOP, absensi |
| **Supervisor** | Tim sendiri, approval cuti |
| **Employee** | Self-service: absen, cuti, profil |

## Menambah role

1. **Pengaturan** → **Role & Akses**.
2. Tambah nama role baru.
3. Assign karyawan ke role via data karyawan.

## Prinsip least privilege

Berikan role **minimum** yang diperlukan. Jangan assign SuperAdmin ke user operasional harian.

## Dokumentasi terproteksi

Dokumentasi di `/docs` dengan label Supervisor, HR, dan Admin hanya dapat dibaca setelah login dengan role yang sesuai.

## Audit

Perubahan sensitif dicatat di audit log (jika modul aktif).
