# Pengaturan Sistem

Admin mengonfigurasi TARA melalui halaman **Pengaturan** (`/web/settings`).

## Branding

- **Logo perusahaan** — tampil di login dan sidebar
- **Nama perusahaan**
- **Tema** — light/dark, forced theme opsional

## Feature flags (modul)

Aktifkan/nonaktifkan modul per deployment:

| Modul | Deskripsi |
|-------|-----------|
| Dashboard | Halaman beranda |
| Karyawan | Manajemen SDM |
| Absensi | Clock-in/out |
| Cuti | Leave management |
| Payroll | Penggajian |
| Jadwal | Scheduling |
| SOP | Dokumen prosedur |
| AI Logs | Log percakapan AI |
| Notifikasi | Push/in-app notifications |

Nonaktifkan modul yang belum siap di production tanpa menghapus kode.

## Integrasi

- **WhatsApp (Kapso)** — API key, webhook, nomor bisnis
- **AI (OpenRouter)** — model, API key, escalation email
- **Hermes** — dinonaktifkan; gunakan TARA AI Assistant built-in

## Agen otonom

7 agen HR (absensi, cuti, payroll, dll.) dapat diaktifkan per konfigurasi. HR tetap dapat override manual.
