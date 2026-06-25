# TARA — Total Assistance for Resources & Administration

**TARA** adalah sistem manajemen HR (Human Resources) cerdas yang dirancang untuk **Ralali**. Sistem ini mengotomatisasi operasional HR sehari-hari menggunakan 7 agen otonom, sehingga tim HR dapat fokus pada tugas strategis.

**Version:** 2.1.0 ([Changelog](./CHANGELOG.md))  
**Status:** Active Development

---

## Apa yang TARA Lakukan?

| Fitur | Penjelasan Singkat |
|-------|-------------------|
| 🕐 **Absensi Otomatis** | Karyawan clock-in/out via ponsel (biometrik + GPS) atau fingerprint device |
| 📋 **Manajemen Cuti** | Pengajuan cuti online, persetujuan otomatis, saldo real-time |
| 💰 **Penggajian** | Hitung gaji, potongan, bonus, dan cetak slip gaji |
| 💳 **Pinjaman / Kasbon** | Karyawan ajukan pinjaman, cicilan otomatis potong gaji |
| 📅 **Jadwal Kerja** | Atur shift, jadwal per karyawan, hari libur |
| 📄 **Dokumen SOP** | Upload, kelola, dan baca dokumen SOP (PDF) untuk seluruh karyawan |
| 🔔 **Notifikasi Multi-Kanal** | Kirim alert via aplikasi, WhatsApp, Telegram, atau Email |
| 🤖 **8 Agen Otonom** | Robot HR yang bekerja 24/7 tanpa perlu dioperasikan manual |
| 🧠 **Hermes AI** | Integrasi AI agentic: baca event, kirim reminder, sarankan keputusan |
| 📡 **Hermes SDK** | TypeScript SDK untuk menghubungkan Hermes (VPS terpisah) ke TARA via SSH tunnel |
| 📊 **Laporan & Analitik** | Dashboard kehadiran, keterlambatan, dan produktivitas |
| 🏢 **Profil Perusahaan** | Kelola informasi perusahaan, kantor, cabang, dan departemen |

---

## Siapa yang Menggunakan TARA?

| Pengguna | Akses |
|----------|-------|
| **HR Admin** | Akses penuh via Web — kelola semua karyawan, pengaturan, laporan |
| **Supervisor** | Web — setujui cuti tim, lihat laporan tim |
| **Karyawan** | Mobile (PWA) — clock-in/out, ajukan cuti, lihat slip gaji, notifikasi |

---

## Tampilan Aplikasi

### Web Interface (untuk HR & Supervisor)
- Dashboard dengan statistik real-time (total karyawan, hadir hari ini, cuti pending, terlambat)
- Direktori karyawan dengan pencarian + halaman detail per karyawan
- Manajemen cuti (setujui/tolak)
- Penggajian (periode, komponen, slip)
- Dokumen SOP (upload single/bulk PDF, viewer inline, kategori)
- Pengaturan lengkap (profil perusahaan, organisasi, agen, notifikasi, Hermes AI)

### Mobile Interface (untuk Karyawan)
- Clock-in/out dengan satu ketukan
- Ajukan cuti dari ponsel
- Lihat saldo cuti dan riwayat
- Baca dokumen SOP (viewer PDF inline)
- Notifikasi real-time
- Profil dan pengaturan bahasa

---

## Cara Menjalankan (Quick Start)

### Prasyarat
- Docker & Docker Compose (rekomendasi)
- Atau: Node.js 20+, PostgreSQL 16+ dengan PostGIS

### Langkah (Docker — Plug & Play)

```bash
# 1. Clone repository
git clone <repository-url>
cd project-tara

# 2. Salin konfigurasi
cp .env.example .env

# 3. Jalankan semuanya (build + migrate + seed + start)
docker compose up --build
```

Selesai. Semua berjalan otomatis:
- Database dibuat dan di-migrasi
- Data default (agen, role, konfigurasi Hermes) di-seed
- Backend dan frontend aktif

Aplikasi tersedia di:
- **Frontend:** http://localhost
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health
- **Hermes WebSocket:** ws://localhost:3001/event-stream

### Langkah (Development — Native)

```bash
# 1. Jalankan database via Docker
docker compose -f docker-compose.dev.yml up -d

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Migrasi database
cd backend && npx prisma migrate deploy && cd ..

# 4. Jalankan aplikasi (frontend + backend bersamaan)
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001

### Demo Mode (Tanpa Database)
TARA dapat berjalan dalam demo mode tanpa PostgreSQL:
```
Email: sari@majubersama.com
Password: demo123
```

---

## Struktur Proyek (Ringkas)

```
project-tara/
├── src/                    # Frontend (React + TypeScript)
│   ├── pages/web/          # Halaman Web Interface
│   ├── pages/mobile/       # Halaman Mobile Interface
│   ├── components/         # Komponen UI (shadcn/ui, AppFooter)
│   ├── contexts/           # Auth & Theme context
│   ├── layouts/            # WebLayout, MobileLayout
│   └── lib/                # Utilities, API helper, mobile detection, version config
├── backend/                # Backend (NestJS + TypeScript)
│   ├── src/core/hr/        # Modul HR (agen, services, controllers)
│   ├── src/core/hr/hermes/ # Integrasi Hermes AI (action gateway, safety)
│   ├── src/core/sop/       # Modul SOP (upload PDF, storage, viewer)
│   ├── src/core/auth/      # Autentikasi (JWT + bcrypt)
│   ├── src/core/demo/      # Demo mode (data mock)
│   ├── src/scripts/        # Seed scripts (auto-run di Docker)
│   ├── uploads/sop/        # Persistent PDF storage (not in git)
│   └── prisma/             # Database schema & migrations
├── packages/               # Shared packages
│   └── hermes-sdk/         # SDK untuk Hermes VPS (SSH tunnel + REST + WebSocket)
├── docker/                 # Docker init scripts (PostGIS setup)
├── docs/                   # Dokumentasi teknis
├── docker-compose.yml      # Production (satu command: docker compose up)
└── docker-compose.dev.yml  # Development (DB + Redis saja)
```

---

## Dokumentasi Teknis

Untuk developer, dokumentasi lengkap tersedia di folder [`docs/`](./docs/README.md):

| Kategori | Dokumen |
|----------|---------|
| **Backend** | [Arsitektur](./docs/backend/ARCHITECTURE.md), [API](./docs/backend/API.md), [Database](./docs/backend/DATABASE.md), [Agen](./docs/backend/AGENTS.md), [Security](./docs/backend/SECURITY.md) |
| **Frontend** | [Frontend Guide](./docs/frontend/FRONTEND.md) |
| **Hermes AI** | [Module](./docs/hermes/HERMES_MODULE.md), [SDK](./docs/hermes/HERMES_SDK.md), [Setup Guide](./docs/hermes/SETUP_INSTRUCTIONS.md), [WhatsApp](./docs/hermes/WHATSAPP_AGENT.md) |
| **Deployment** | [Deployment Guide](./docs/DEPLOYMENT.md) |
| **Changelog** | [Changelog](./CHANGELOG.md) |

---

## 🏷️ Version Control

TARA menggunakan [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH).

| Sumber | Fungsi |
|--------|--------|
| `src/lib/version.ts` | Single source of truth untuk versi aplikasi |
| `package.json` | Versi untuk npm/build tooling |
| `CHANGELOG.md` | Riwayat rilis yang mudah dibaca |

Footer aplikasi menampilkan versi, tahun copyright, dan nama perusahaan di semua halaman (desktop & mobile).

### Cara Rilis Versi Baru

```bash
# 1. Update src/lib/version.ts (APP_VERSION + APP_BUILD_DATE)
# 2. Update version di package.json
# 3. Tambahkan entry ke CHANGELOG.md
# 4. Commit dan tag
git commit -am "release: v2.1.0"
git tag v2.1.0
git push --follow-tags
```

---

## Teknologi

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | NestJS, TypeScript, Prisma ORM |
| Database | PostgreSQL 14+ dengan PostGIS |
| Real-time | WebSocket (Socket.IO) |
| Auth | JWT + bcrypt |
| Deployment | Docker, Nginx |

---

## Lisensi

Proprietary — Ralali. Hak cipta dilindungi.
