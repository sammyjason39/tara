# Role & Akses

Kelola role dan permission pengguna TARA.

## Role bawaan

| Role | Akses utama |
|------|-------------|
| **SuperAdmin** | Semua fitur + konfigurasi sistem |
| **HR_Admin** | HR operasional, karyawan, SOP, absensi, **otomasi workflow** |
| **Supervisor** | Tim sendiri, approval cuti |
| **Employee** | Self-service: absen, cuti, profil |

## Hak khusus HR_Admin (v2.1+)

| Fitur | Path |
|-------|------|
| Penyesuaian saldo cuti | `/web/employees/:id` |
| Reset password karyawan + notifikasi WA | `/web/employees/:id` |
| Otomasi workflow (buat, publish, test) | `/web/workflows` |
| AI Logs | `/web/ai-logs` |

SuperAdmin memiliki hak yang sama plus **Pengaturan** penuh dan deployment.

## Menambah role

1. **Pengaturan** → **Role & Akses**.
2. Tambah nama role baru.
3. Assign karyawan ke role via data karyawan.

## Prinsip least privilege

Berikan role **minimum** yang diperlukan. Jangan assign SuperAdmin ke user operasional harian.

Workflow production hanya berjalan setelah **Publish + Aktifkan** — role HR tidak bisa mengaktifkan tanpa publish terlebih dahulu (validasi sistem).

## Dokumentasi terproteksi

Dokumentasi di `/docs` dengan label Supervisor, HR, dan Admin hanya dapat dibaca setelah login dengan role yang sesuai.

## Audit

Perubahan sensitif (penyesuaian cuti, reset password, eksekusi workflow) dicatat di database dengan timestamp dan konteks actor.
