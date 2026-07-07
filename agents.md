# agents.md — Panduan untuk AI Agent / LLM

Dokumen ini membantu **AI coding agent** memahami codebase TARA, konvensi, dan cara melanjutkan pekerjaan tanpa kehilangan konteks.

**Baca juga:** `prd.md` (apa yang dibangun), `designs.md` (UI/UX), `README.md` (setup), `docs/` (referensi teknis).

---

## 1. Identitas Proyek

| Item | Nilai |
|------|-------|
| Nama | **TARA** — Total Assistance for Resources & Administration |
| Versi saat ini | **2.1.0** (lihat `/VERSION`, `src/lib/version.ts`) |
| Production | https://tara.ralali.io |
| Repo utama deploy | `Conextlab-MIT/TARA-HR-AGENTIC` (remote: `conextlab`) |
| Bahasa UI utama | Bahasa Indonesia (`i18next`, locale `id` + `en`) |
| Zona waktu bisnis | **Asia/Jakarta (WIB)** |

TARA = platform HR dengan **web admin**, **mobile PWA**, **WhatsApp AI**, **agen otonom**, dan **workflow builder** (v2.1+).

---

## 2. Prinsip Arsitektur (WAJIB diikuti)

Dari `docs/backend/ARCHITECTURE.md`:

1. **Event-driven** — Mutasi data memicu `TaraEvent` lewat `EventBusService`. Jangan hardcode side-effect di controller jika bisa lewat event + agent/workflow.
2. **Dual interface** — Web = HR/Supervisor; Mobile (`/m`) = karyawan. Jangan campur layout.
3. **Autonomous agents** — Cron/event listeners di `backend/src/core/hr/agents/`. Bisa dinonaktifkan via `agent_configs`.
4. **Manual override** — HR selalu bisa intervensi manual (contoh: penyesuaian saldo cuti, reset password).
5. **Single source of truth** — PostgreSQL + Prisma. Redis = cache saja.

### Aturan coding untuk LLM

- **Minimize scope** — diff kecil, fokus task. Jangan refactor tidak terkait.
- **Ikuti konvensi existing** — baca file sekitar sebelum menulis kode baru.
- **Jangan commit** kecuali user minta eksplisit.
- **Jangan push** kecuali user minta.
- **Version bump** — pakai `scripts/bump-version.sh` + `scripts/sync-version.sh`; deploy prod auto-bump patch kecuali commit `chore(release):`.
- **Migrasi DB** — selalu buat file di `backend/prisma/migrations/` + update `schema.prisma`.
- **Auth** — endpoint admin pakai `JwtGuard` + `RolesGuard`; role: `SuperAdmin`, `HR_Admin`, `Supervisor`, `Employee`.
- **Feature flags** — modul UI di-gate via `FeatureGate`; `/web/workflows` **tidak** di-flag (selalu untuk HR_Admin/SuperAdmin).

---

## 3. Struktur Monorepo

```
tara/
├── src/                          # Frontend React + Vite
│   ├── pages/web/                # Dashboard HR
│   ├── pages/mobile/             # PWA karyawan
│   ├── components/               # UI + workflows/
│   ├── docs/                     # In-app help (/docs)
│   ├── lib/                      # api.ts, feature-flags, dates, i18n
│   └── layouts/                  # WebLayout, MobileLayout
├── backend/
│   ├── src/core/
│   │   ├── hr/                   # Modul terbesar (services, agents, controllers)
│   │   ├── ai/                   # TARA AI Assistant (OpenRouter)
│   │   ├── workflow/             # Workflow engine v2.1+
│   │   ├── sop/                  # SOP PDF + RAG
│   │   └── auth/
│   └── prisma/schema.prisma
├── packages/hermes-sdk/          # Opsional; HERMES_ENABLED=false default
├── docs/                         # Dokumentasi teknis engineer
├── scripts/                      # deploy, bump-version
├── agents.md                     # ← file ini
├── prd.md
└── designs.md
```

**Dev lokal:**
```bash
docker compose -f docker-compose.dev.yml up -d
cd backend && npx prisma migrate deploy && npm run start:dev   # :3001
npm run dev:frontend                                              # :5173
```

---

## 4. Peta Agent & Otomatisasi

Ada **4 lapisan** otomatisasi — jangan dicampur sembarangan:

### A. HR Agents (deterministik, legacy)

Path: `backend/src/core/hr/agents/`

| File | Trigger utama | Fungsi |
|------|---------------|--------|
| `leave-request.agent.ts` | `leave.request.*` | Validasi, notif supervisor |
| `absensi.agent.ts` | clock API / cron | Absensi, terlambat |
| `clock-confirmation.agent.ts` | `attendance.clock_in/out` | Konfirmasi privat |
| `weekly-checkin.agent.ts` | Cron Jumat | Form produktivitas |
| `late-report.agent.ts` | Cron 09:05 WIB | Laporan terlambat |
| `onboarding.agent.ts` | `employee.created` | 7 langkah onboarding |
| `saldo-cuti.agent.ts` | query / cron | Info saldo |
| `payroll.agent.ts` | payroll events | Otomasi gaji |
| `loan.agent.ts` | loan events | Kasbon |
| `scheduling.agent.ts` | schedule events | Jadwal |
| `warning-letter.agent.ts` | SP events | Surat peringatan |
| `health-check.agent.ts` | cron | Health agent |

Konfigurasi: tabel `agent_configs`, seed di `backend/src/scripts/seed-defaults.ts`.

**Penting:** Beberapa workflow seed **sengaja `is_active: false`** agar tidak dobel notifikasi dengan agent lama. Saat mengaktifkan workflow, nonaktifkan agent yang overlap.

### B. Workflow Engine (v2.1+, configurable UI)

Path: `backend/src/core/workflow/`

- **UI:** `/web/workflows` → `src/pages/web/WorkflowsPage.tsx`
- **Engine:** `workflow-engine.service.ts` — listen semua event via `EventEmitter2.onAny`
- **Lifecycle:** Draft (`graph`) → **Publish** (`published_graph`) → **Activate** (`is_active`)
- **Test:** `POST /workflows/:id/test` dengan `employee_id`, optional `phone`
- **Log:** `workflow_executions` + panel `WorkflowExecutionPanel`

Kill switch: `WORKFLOW_ENGINE_ENABLED=false`.

### C. TARA AI Assistant (konversasional)

Path: `backend/src/core/ai/`

- Entry WA: `whatsapp-inbound.service.ts` → `AiOrchestratorService`
- Tool-calling + **konfirmasi** sebelum aksi sensitif (`prepare_*`)
- RAG SOP: `ai-rag.service.ts`, `sop-indexer.service.ts`
- Memory: Mem0 per karyawan
- Onboarding/password messages: `wa-onboarding.util.ts`

Env: `AI_API_KEY`, `AI_MODEL` (default `deepseek-v4-flash`).

### D. Hermes (legacy, opsional)

- `HERMES_ENABLED=false` di production
- SDK: `packages/hermes-sdk/`
- Jangan bangun fitur baru di Hermes kecuali diminta eksplisit

---

## 5. Event Bus

**Service:** `backend/src/core/hr/services/event-bus.service.ts`

```typescript
// Bentuk event standar
interface TaraEvent {
  event_id: string;
  event_type: string;        // e.g. 'leave.request.submitted'
  event_version: string;
  event_timestamp: Date;
  actor: { id: string; type: 'employee' | 'agent' | 'system' };
  entity: { id: string; type: string };
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

**Alur:** emit → persist `event_bus_logs` → `EventEmitter2` → agents + workflow engine + WebSocket

**Trigger workflow umum:**
`leave.request.submitted`, `leave.balance.adjusted`, `attendance.clock_in`, `whatsapp.message.inbound`, `employee.created`, dll. — lihat `workflow.controller.ts` catalog.

**Catatan:** Ada dua konvensi penamaan (`leave.request.submitted` vs `hr.leave.requested.v1`). Workflow & agent mayoritas pakai format **dot lowercase**.

---

## 6. API & Auth Patterns

- **Prefix prod:** Nginx `/api/` → Nest `/v1/`
- **Frontend client:** `src/lib/api.ts` (Bearer JWT, redirect 401)
- **BFF web:** `backend/src/core/hr/controllers/web-api.controller.ts`
- **Mobile/employee API:** `tara-employee.controller.ts`, `tara-leave.controller.ts`, dll.

### Guards umum

```typescript
@UseGuards(JwtGuard, RolesGuard)
@Roles('SuperAdmin', 'HR_Admin')
```

`SuperAdmin` selalu lolos `RolesGuard`.

---

## 7. Database — Model Penting

Schema: `backend/prisma/schema.prisma`

| Domain | Model |
|--------|-------|
| People | `Employee`, `Department`, `Role`, `OfficeLocation` |
| Attendance | `Attendance` (PostGIS), `AbsenceRecord` |
| Leave | `LeaveRequest`, `LeaveBalance`, `LeaveBalanceAdjustment` |
| Workflow | `WorkflowDefinition`, `WorkflowExecution` |
| AI | `AiAgentLog`, `AiPendingAction`, `SopDocument`, `SopChunk` |
| Config | `AgentConfig`, `SystemSettings` |
| Events | `EventBusLog`, `AuditLog` |

Setelah ubah schema: `npx prisma migrate dev` (lokal) / `migrate deploy` (prod).

---

## 8. Fitur v2.1.0 — Konteks Terbaru

| Fitur | Backend | Frontend |
|-------|---------|----------|
| Workflow builder | `core/workflow/*` | `pages/web/WorkflowsPage.tsx`, `components/workflows/*` |
| Penyesuaian saldo cuti | `leave.service.ts`, `web-api.controller.ts` | `EmployeeDetailPage.tsx` |
| Reset password + WA | `web-api.controller.ts`, `wa-onboarding.util.ts` | `EmployeeDetailPage.tsx` |
| Date picker mobile | — | `DatePickerInput.tsx` (native input overlay) |
| Docs HR/Admin | — | `src/docs/content/hr/*`, `admin/*` |

---

## 9. Testing

```bash
# Frontend
npm test

# Backend
cd backend && npm test

# Spesifik workflow
cd backend && npx vitest run src/core/workflow/
```

---

## 10. Deploy

- **Production:** push ke `conextlab` remote `main` → GitHub Actions `deploy-production.yml`
- **Commit release:** prefix `chore(release): vX.Y.Z` agar CI tidak double-bump
- **Staging:** branch `staging` → `deploy-staging.yml`

---

## 11. Checklist Sebelum Selesai Task

- [ ] Build backend: `cd backend && npm run build`
- [ ] Build frontend: `npm run build`
- [ ] Tidak ada secret di commit
- [ ] Migrasi DB jika schema berubah
- [ ] Update `src/docs/` jika fitur user-facing baru
- [ ] Pertimbangkan event bus + workflow vs hardcode
- [ ] Mobile: uji touch target / PWA jika ubah form

---

## 12. Dokumentasi Terkait

| Path | Isi |
|------|-----|
| `prd.md` | Product requirements & roadmap |
| `designs.md` | Design system & UX |
| `docs/backend/AGENTS.md` | Detail agent teknis |
| `docs/backend/EVENT_BUS.md` | Event bus spec |
| `docs/backend/ARCHITECTURE.md` | Arsitektur backend |
| `src/docs/` | Help in-app untuk end user |
| `CHANGELOG.md` | Riwayat release (mungkin tertinggal — cek git log) |

---

## 13. Hal yang Sering Salah (Anti-patterns)

1. **Mengaktifkan workflow + agent** untuk trigger yang sama → notifikasi dobel.
2. **Test workflow tanpa save** → engine pakai graph di DB, bukan draft browser.
3. **Activate workflow tanpa publish** → API menolak; engine pakai `published_graph`.
4. **Edit `trigger_event` di DB tanpa sync node trigger** → save graph sudah sync via `extractTriggerEventFromGraph`.
5. **DatePicker programmatic `showPicker()`** → gagal di iOS PWA; pakai native input overlay (lihat `DatePickerInput.tsx`).
6. **Push ke `origin`** → mungkin 403; production deploy via `conextlab`.

---

*Terakhir diselaraskan dengan release v2.1.0 — perbarui file ini saat ada perubahan arsitektur mayor.*
