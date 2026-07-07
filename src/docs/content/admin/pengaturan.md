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

> **Otomasi Workflow** (`/web/workflows`) selalu tersedia untuk HR_Admin dan SuperAdmin — tidak dikontrol feature flag terpisah.

## Integrasi

- **WhatsApp (Kapso)** — API key, webhook, nomor bisnis
- **AI (OpenRouter)** — model, API key, escalation email
- **Hermes** — dinonaktifkan; gunakan TARA AI Assistant built-in

## Agen otonom vs Workflow

| Mekanisme | Kapan dipakai |
|-----------|----------------|
| **Workflow engine** (v2.1+) | Aturan event-driven: trigger → kondisi → notifikasi/WA/eskalasi. Dikonfigurasi di `/web/workflows`. |
| **Agen HR legacy** | Beberapa skenario masih aktif di backend; dapat dimatikan bertahap saat workflow setara sudah dipublish. |

HR dapat mengoperasikan workflow; Admin mengawasi agar tidak ada duplikasi notifikasi dengan agen lama.

## Versi aplikasi

Versi ditampilkan di footer/status (`/status`). Skema **A.B.C**:

- **A** — generasi platform (saat ini: 2)
- **B** — upgrade mayor (fitur besar, mis. v2.1 workflow otomasi)
- **C** — patch / hotfix

Release v2.1.0 memperkenalkan modul otomasi workflow, penyesuaian saldo cuti HR, reset password + notifikasi WA, dan perbaikan mobile PWA.
