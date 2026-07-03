# Dashboard HR

Ringkasan operasional HR di TARA web dashboard.

## Widget utama

- **Kehadiran hari ini** — hadir, terlambat, tidak hadir, cuti
- **Pengajuan cuti pending** — perlu tindakan
- **Notifikasi** — pengumuman dan alert sistem

## Akses HR

Role **HR_Admin** dan **SuperAdmin** memiliki akses penuh ke modul karyawan, absensi, cuti, SOP, dan pengaturan.

## Workflow harian disarankan

1. Cek pengajuan cuti pending di pagi hari.
2. Review absensi anomali (tanpa clock-out, GPS jauh).
3. Pastikan SOP terbaru sudah di-upload dan ter-indeks untuk AI.
4. Monitor log AI jika ada keluhan jawaban asisten WhatsApp.

## Eskalasi ke Admin

Konfigurasi sistem (branding, feature flags, integrasi API) dilakukan oleh Admin — lihat dokumentasi **Admin**.
