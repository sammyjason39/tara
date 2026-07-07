# TARA HR Agentic

**Total Assistance for Resources & Administration** — sistem HR cerdas dengan agen otonom dan asisten AI untuk mengotomatisasi operasional kehadiran, cuti, penggajian, dan komunikasi karyawan.

[![Version](https://img.shields.io/badge/version-2.0.0-blue)](./CHANGELOG.md)
[![Stack](https://img.shields.io/badge/stack-React%20%7C%20NestJS%20%7C%20PostgreSQL-555)](./docs/README.md)
[![License](https://img.shields.io/badge/license-Proprietary-red)](#lisensi)

**Production:** [tara.ralali.io](https://tara.ralali.io)

---

## Deskripsi

TARA adalah platform HR end-to-end yang menggabungkan **web dashboard untuk HR**, **aplikasi mobile (PWA) untuk karyawan**, dan **asisten AI berbasis WhatsApp**. Sistem ini dirancang agar tim HR tidak perlu menangani tugas repetitif secara manual — agen otonom berjalan 24/7 untuk memproses absensi, cuti, notifikasi, onboarding, dan laporan.

Asisten AI TARA (via OpenRouter) dapat menjawab pertanyaan karyawan, mengeksekusi aksi HR dengan konfirmasi, dan mengeskalasi ke staff HR bila diperlukan.

---

## Fitur Utama

### Kehadiran & Organisasi
- Clock-in/out via mobile dengan **GPS geo-fence** per kantor/cabang
- Manajemen kantor, departemen, dan jabatan dari satu tab Organisasi
- Deteksi keterlambatan otomatis dan laporan harian
- Jadwal kerja, shift, dan hari libur

### Cuti & Penggajian
- Pengajuan cuti online dengan alur persetujuan supervisor
- Saldo cuti real-time dan riwayat pengajuan
- Perhitungan gaji, komponen, potongan, dan slip gaji

### Dokumen & Komunikasi
- Manajemen dokumen SOP (upload PDF, kategori, viewer inline)
- Notifikasi multi-kanal: in-app, WhatsApp, Telegram, Email
- Dashboard analitik kehadiran dan produktivitas

### Agen Otonom (24/7)
| Agen | Fungsi |
|------|--------|
| Leave Request | Validasi saldo cuti, notifikasi supervisor, update saldo |
| Absensi | Rekam clock-in/out, deteksi terlambat, cache status |
| Clock Confirmation | Konfirmasi privat ke karyawan setelah absen |
| Weekly Checkin | Form produktivitas Jumat, laporan Senin |
| Late Report | Pengumuman keterlambatan harian + recap HR |
| Onboarding | Workflow 7 langkah untuk karyawan baru |
| Saldo Cuti | Query saldo & rekapitulasi bulanan |
| SOP | Lifecycle dokumen SOP & konteks untuk AI |
| WhatsApp | Routing pesan WA ↔ AI, session & audit log |

### Asisten AI TARA
- Integrasi **OpenRouter** (model OpenAI-compatible, default: `deepseek-v4-flash`)
- Chat WhatsApp untuk karyawan: cek profil, saldo cuti, jadwal, SOP
- Tool-calling dengan konfirmasi sebelum aksi sensitif
- Eskalasi otomatis ke HR untuk pertanyaan di luar konteks
- Memory per karyawan (Mem0) dan log interaksi di admin panel

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query |
| **Mobile** | PWA (Vite PWA), responsive layout terpisah |
| **Backend** | NestJS 11, TypeScript, Prisma ORM |
| **Database** | PostgreSQL 16 + PostGIS |
| **Cache** | Redis 7 |
| **Real-time** | Socket.IO (WebSocket) |
| **Auth** | JWT + bcrypt |
| **AI** | LangChain, OpenRouter API, Mem0 |
| **WhatsApp** | Kapso WhatsApp Cloud API |
| **Deploy** | Docker Compose, Nginx |

---

## Arsitektur Singkat

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Web (HR)   │     │ Mobile PWA  │     │ WhatsApp (Kapso) │
└──────┬──────┘     └──────┬──────┘     └────────┬─────────┘
       │                   │                      │
       └───────────────────┼──────────────────────┘
                           ▼
                  ┌─────────────────┐
                  │  Nginx :80      │
                  │  /api → backend │
                  └────────┬────────┘
                           ▼
                  ┌─────────────────┐
                  │ NestJS Backend  │
                  │  • HR Services  │
                  │  • AI Orchestr. │
                  │  • 9 Agents     │
                  └────────┬────────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        PostgreSQL      Redis      OpenRouter
        + PostGIS                  (LLM API)
```

---

## Instalasi

### Prasyarat

- **Docker & Docker Compose** (disarankan untuk production)
- Atau untuk development native: **Node.js 20+**, **PostgreSQL 16+** (PostGIS), **Redis 7+**

### Opsi 1 — Docker (Production / Plug & Play)

```bash
# 1. Clone repository
git clone https://github.com/Conextlab-MIT/TARA-HR-AGENTIC.git
cd TARA-HR-AGENTIC

# 2. Salin dan edit konfigurasi
cp .env.example .env
# Edit .env — minimal set JWT_SECRET, AI_API_KEY, KAPSO_* untuk production

# 3. Build & jalankan semua service
docker compose up --build -d
```

Saat startup, Docker otomatis:
1. Menyalakan PostgreSQL (PostGIS) dan Redis
2. Menjalankan migrasi Prisma
3. Seed konfigurasi default (agen, role, settings)
4. Build frontend dan serve via Nginx

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost/api/ (via Nginx proxy) |
| Health check | http://localhost:3001/health |

### Opsi 2 — Development (Native)

```bash
# 1. Jalankan database & Redis saja via Docker
docker compose -f docker-compose.dev.yml up -d

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Konfigurasi backend
cp backend/.env.example backend/.env
# Set DATABASE_URL, JWT_SECRET, REDIS_URL, AI_API_KEY

# 4. Migrasi database
cd backend && npx prisma migrate deploy && npm run seed && cd ..

# 5. Jalankan frontend + backend bersamaan
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend | http://localhost:3001 |

### Seed Data Karyawan (Opsional)

File CSV karyawan **tidak disertakan di git** (data PII). Letakkan export di `backend/data/ralali-employees-2026.csv` atau set `RALALI_EMPLOYEES_CSV` di environment.

```bash
# Development
cd backend && npm run seed:ralali

# Production (salin CSV ke container dulu, lalu seed)
docker cp ./backend/data/ralali-employees-2026.csv tara-backend:/app/data/
docker exec tara-backend node dist/scripts/seed-ralali-employees.js
```

### Demo Mode

Tanpa database penuh, TARA dapat berjalan dalam demo mode:

```
Email:    sari@majubersama.com
Password: demo123
```

---

## Konfigurasi Environment

Salin `.env.example` ke `.env` di root project. Variabel penting:

| Variabel | Deskripsi |
|----------|-----------|
| `DB_PASSWORD` | Password PostgreSQL |
| `JWT_SECRET` | Secret key untuk JWT (wajib diganti di production) |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) |
| `VITE_API_URL` | URL API untuk frontend build |
| `AI_API_KEY` | API key OpenRouter |
| `AI_BASE_URL` | Default: `https://openrouter.ai/api/v1` |
| `AI_MODEL` | Default: `deepseek-v4-flash` |
| `KAPSO_API_KEY` | API key Kapso untuk WhatsApp |
| `KAPSO_WEBHOOK_SECRET` | Secret verifikasi webhook Kapso |
| `HERMES_ENABLED` | `false` (gunakan TARA AI Assistant) |

Detail lengkap: [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)

---

## Struktur Proyek

```
TARA-HR-AGENTIC/
├── src/                        # Frontend React
│   ├── pages/web/              # Dashboard HR (karyawan, cuti, gaji, settings)
│   ├── pages/mobile/           # PWA karyawan (absen, cuti, SOP)
│   ├── components/             # UI components (shadcn/ui)
│   └── lib/                    # API client, auth, utilities
├── backend/                    # NestJS API
│   ├── src/core/hr/            # Modul HR (agen, attendance, leave, payroll)
│   ├── src/core/ai/            # AI orchestrator, tools, memory, logs
│   ├── src/core/sop/           # Manajemen dokumen SOP
│   ├── src/core/auth/          # JWT authentication
│   ├── src/scripts/            # Seed & utility scripts
│   └── prisma/                 # Schema & migrations
├── packages/hermes-sdk/        # SDK Hermes (opsional, VPS terpisah)
├── docker/                     # Init scripts (PostGIS)
├── docs/                       # Dokumentasi teknis
├── docker-compose.yml          # Production stack
└── docker-compose.dev.yml      # Dev: DB + Redis only
```

---

## Dokumentasi

| Topik | File |
|-------|------|
| **AI / LLM onboarding** | [`agents.md`](../agents.md) · [`prd.md`](../prd.md) · [`designs.md`](../designs.md) |
| Index dokumentasi | [`docs/README.md`](./docs/README.md) |
| Deployment | [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) |
| Arsitektur backend | [`docs/backend/ARCHITECTURE.md`](./docs/backend/ARCHITECTURE.md) |
| API reference | [`docs/backend/API.md`](./docs/backend/API.md) |
| Agen otonom | [`docs/backend/AGENTS.md`](./docs/backend/AGENTS.md) |
| Frontend guide | [`docs/frontend/FRONTEND.md`](./docs/frontend/FRONTEND.md) |
| Changelog | [`CHANGELOG.md`](./CHANGELOG.md) |

---

## Peran Pengguna

| Role | Akses |
|------|-------|
| **SuperAdmin / HR Admin** | Web — kelola karyawan, organisasi, pengaturan, laporan, AI logs |
| **Supervisor** | Web — setujui cuti tim, lihat laporan tim |
| **Employee** | Mobile PWA — absen, ajukan cuti, baca SOP, notifikasi, chat AI via WA |

---

## Scripts Utama

```bash
# Root
npm run dev              # Frontend + backend (development)
npm run build            # Build frontend production
npm test                 # Frontend tests (Vitest)

# Backend
cd backend
npm run start:dev        # NestJS watch mode
npm run build            # Compile TypeScript
npm run seed             # Seed default config
npm run seed:ralali      # Seed karyawan Ralali dari CSV
npm test                 # Backend tests (Vitest)
```

---

## Lisensi

Proprietary — dikembangkan untuk **Ralali** / **Conextlab MIT**. Hak cipta dilindungi.

---

<p align="center">
  <strong>TARA HR Agentic</strong> · v2.0.0 · <a href="https://tara.ralali.io">tara.ralali.io</a>
</p>
