# Dashboard HR

Ringkasan operasional HR di TARA web dashboard (`/web`).

## Widget utama

- **Kehadiran hari ini** — hadir, terlambat, tidak hadir, cuti
- **Pengajuan cuti pending** — perlu tindakan
- **Notifikasi** — pengumuman dan alert sistem

## Akses HR

Role **HR_Admin** dan **SuperAdmin** memiliki akses penuh ke modul karyawan, absensi, cuti, SOP, otomasi workflow, dan pengaturan (terbatas untuk HR_Admin).

## Workflow harian disarankan

1. Cek **pengajuan cuti pending** di pagi hari.
2. Review **absensi anomali** (tanpa clock-out, GPS jauh) — lihat [Absensi & Bukti Foto](/docs/hr/absensi-hr).
3. Tangani permintaan **reset password** atau **koreksi saldo cuti** dari detail karyawan.
4. Pastikan **SOP terbaru** sudah di-upload dan ter-indeks untuk AI.
5. Pantau **log eksekusi workflow** jika ada otomasi aktif — lihat [Otomasi Workflow](/docs/hr/otomasi-workflow).
6. Monitor **log AI** jika ada keluhan jawaban asisten WhatsApp.

## Modul utama HR

| Modul | Path | Fungsi |
|-------|------|--------|
| Karyawan | `/web/employees` | Data master, reset password, penyesuaian cuti |
| Cuti | `/web/leaves` | Approval & monitoring pengajuan |
| Absensi | `/web/attendance` | Audit kehadiran + selfie |
| SOP | `/web/sop` | Upload kebijakan PDF |
| Otomasi | `/web/workflows` | Aturan notifikasi & eskalasi |
| AI Logs | `/web/ai-logs` | Audit percakapan WhatsApp AI |

## Eskalasi ke Admin

Konfigurasi sistem (branding, feature flags, integrasi API, deployment) dilakukan oleh Admin — lihat dokumentasi **Admin**.
