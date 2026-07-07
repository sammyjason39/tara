# prd.md — Product Requirements Document

Dokumen ini mendefinisikan **apa yang dibangun** di TARA, untuk siapa, dan kriteria keberhasilan. Gunakan bersama `agents.md` (cara implement) dan `designs.md` (tampilan/UX).

**Versi dokumen:** selaras dengan **TARA v2.1.0**  
**Production:** https://tara.ralali.io

---

## 1. Ringkasan Produk

### 1.1 Visi

Menjadikan operasional HR **otomatis, transparan, dan dapat diaudit** — mengurangi beban manual tim HR tanpa menghilangkan kontrol manusia.

### 1.2 Masalah yang Diselesaikan

| Masalah | Solusi TARA |
|---------|-------------|
| Absensi manual / tidak terpusat | Mobile clock-in GPS + selfie + geo-fence |
| Cuti via chat/email tidak terlacak | Pengajuan digital + approval supervisor |
| HR menjawab pertanyaan berulang | WhatsApp AI + SOP terindeks |
| Notifikasi tidak konsisten | Agen otonom + workflow builder (v2.1) |
| Data karyawan tersebar | Single HRIS PostgreSQL |

### 1.3 Persona

| Persona | Platform | Kebutuhan utama |
|---------|----------|-----------------|
| **Karyawan** | Mobile PWA `/m` | Absen, cuti, baca SOP, notifikasi, WA AI |
| **Supervisor** | Web `/web` | Setujui cuti tim, pantau absensi |
| **HR Admin** | Web `/web` | Kelola karyawan, kebijakan, audit, otomasi |
| **Super Admin** | Web `/web` | Konfigurasi sistem, integrasi, deployment |

---

## 2. Ruang Lingkup Produk (In Scope)

### 2.1 Modul Inti

| Modul | Status | Deskripsi |
|-------|--------|-----------|
| Dashboard | ✅ | Ringkasan kehadiran, cuti pending |
| Karyawan | ✅ | CRUD, detail, import seed |
| Absensi | ✅ | Clock in/out, GPS, selfie, audit HR |
| Cuti | ✅ | Pengajuan, approval, saldo, penyesuaian HR |
| Notifikasi | ✅ | In-app |
| SOP | ✅ | Upload PDF, viewer, RAG untuk AI |
| Pengaturan | ✅ | Branding, feature flags, integrasi |
| AI Assistant | ✅ | WhatsApp + tool calling |
| AI Logs | ✅ | Audit percakapan |
| **Otomasi Workflow** | ✅ v2.1 | Builder visual trigger→kondisi→aksi |
| Payroll | ✅ | Periode, slip, komponen |
| Jadwal | ✅ | Shift, libur, assignment |
| Pinjaman/Kasbon | ✅ | Backend agents |

### 2.2 Saluran

| Saluran | Path / Entry |
|---------|--------------|
| Web HR | `/web/*` |
| Mobile PWA | `/m/*` |
| WhatsApp | Kapso webhook → inbound service |
| Dokumentasi | `/docs` (publik employee + auth untuk HR/Admin) |
| Status | `/status` |

---

## 3. User Stories Prioritas

### 3.1 Karyawan

- Sebagai karyawan, saya ingin **absen dengan selfie dan GPS** agar kehadiran terverifikasi.
- Sebagai karyawan, saya ingin **mengajukan cuti dari HP** dengan date picker yang berfungsi di iOS/Android.
- Sebagai karyawan, saya ingin **bertanya kebijakan lewat WhatsApp** tanpa menunggu HR online.
- Sebagai karyawan, saya ingin **melihat saldo cuti** sebelum mengajukan.

### 3.2 Supervisor

- Sebagai supervisor, saya ingin **menyetujui/menolak cuti** bawahan dari web.
- Sebagai supervisor, saya ingin **melihat absensi tim** untuk tindak lanjut.

### 3.3 HR Admin

- Sebagai HR, saya ingin **mengoreksi saldo cuti** dengan alasan tercatat (audit).
- Sebagai HR, saya ingin **reset password karyawan** dan memberitahu via WhatsApp.
- Sebagai HR, saya ingin **membuat aturan otomasi** (mis. eskalasi cuti supervisor panjang) tanpa developer.
- Sebagai HR, saya ingin **menguji workflow** dengan akun karyawan tertentu sebelum go-live.
- Sebagai HR, saya ingin **melihat log eksekusi** workflow (sukses/gagal).

### 3.4 Admin

- Sebagai admin, saya ingin **mengaktifkan/menonaktifkan modul** per deployment.
- Sebagai admin, saya ingin **mengonfigurasi AI, WhatsApp, branding**.
- Sebagai admin, saya ingin **deploy aman** staging → production dengan versioning.

---

## 4. Fitur Detail v2.1.0

### 4.1 Otomasi Workflow

**Tujuan:** HR dapat mendefinisikan logika bisnis tanpa hardcode.

**Alur:**
1. Edit graph (trigger → if → action) di `/web/workflows`
2. **Simpan** draft
3. **Publish** snapshot ke production
4. **Aktifkan** — engine merespons event bus
5. **Test** dengan pilih karyawan / nomor WA

**Node types:**
- Trigger (event sistem)
- If (multi-rule AND/OR; field: role, departemen, payload, dll.)
- Action (notifikasi, WhatsApp, eskalasi HR, notify by role, set variable, log)

**Acceptance criteria:**
- [ ] HR dapat publish & activate tanpa error
- [ ] Eksekusi production tercatat di `workflow_executions`
- [ ] Test run ditandai `is_test=true`
- [ ] Engine tidak jalan jika hanya draft (belum publish)
- [ ] Kondisi `employee.role` dapat dievaluasi setelah context enrichment

**Non-goals v2.1:**
- Cron trigger (belum)
- Webhook eksternal sebagai action (belum)
- Approve cuti otomatis dari workflow (belum)

### 4.2 Penyesuaian Saldo Cuti (HR)

**Tujuan:** Koreksi jatah tanpa fake leave request.

**Acceptance criteria:**
- [ ] HR dapat +/- hari dengan alasan wajib
- [ ] Riwayat adjustment tampil di detail karyawan
- [ ] Event `leave.balance.adjusted` ter-emit (untuk workflow)

### 4.3 Reset Password Karyawan

**Acceptance criteria:**
- [ ] Password reset ke default sistem
- [ ] Jika WA terverifikasi → kirim pesan otomatis
- [ ] `must_change_password` dipakai untuk force change di login

### 4.4 Mobile Date Picker

**Acceptance criteria:**
- [ ] Field tanggal di form cuti mobile dapat di-tap di iOS & Android PWA
- [ ] Native calendar system muncul (bukan custom picker yang broken)

---

## 5. Persyaratan Non-Fungsional

| Area | Requirement |
|------|-------------|
| **Keamanan** | JWT 8h, bcrypt, PIN absensi, role-based access, PII tidak di git |
| **Audit** | Event bus log 90 hari; workflow steps_log; leave adjustment trail |
| **Bahasa** | UI Indonesia default; i18n EN tersedia |
| **Mobile** | PWA, `100dvh`, safe-area, touch target ≥44px |
| **Performa** | Workflow cache 30s; React Query stale 5 menit |
| **Availability** | Docker compose production; health check backend |
| **AI safety** | Konfirmasi sebelum aksi sensitif; eskalasi HR untuk out-of-scope |

---

## 6. Role & Permission Matrix

| Capability | Employee | Supervisor | HR_Admin | SuperAdmin |
|------------|----------|------------|----------|------------|
| Clock in/out mobile | ✅ | ✅ | ✅ | ✅ |
| Ajukan cuti | ✅ | ✅ | ✅ | ✅ |
| Approve cuti tim | ❌ | ✅ | ✅ | ✅ |
| Kelola semua karyawan | ❌ | 👁️ terbatas | ✅ | ✅ |
| Penyesuaian saldo cuti | ❌ | ❌ | ✅ | ✅ |
| Reset password karyawan | ❌ | ❌ | ✅ | ✅ |
| Workflow builder | ❌ | ❌ | ✅ | ✅ |
| Pengaturan sistem | ❌ | ❌ | 👁️ sebagian | ✅ |
| Feature flags | ❌ | ❌ | ❌ | ✅ |

---

## 7. Integrasi Eksternal

| Integrasi | Wajib? | Config |
|-----------|--------|--------|
| PostgreSQL + PostGIS | Ya | `DATABASE_URL` |
| Redis | Ya | `REDIS_URL` |
| OpenRouter (AI) | Untuk WA AI | `AI_API_KEY`, `AI_MODEL` |
| Kapso (WhatsApp) | Untuk WA | `KAPSO_*` |
| Hermes | Tidak (legacy) | `HERMES_ENABLED=false` |

---

## 8. Feature Flags

Disimpan di `SystemSettings` → `company.enabled_modules`.

Modul dapat dimatikan per deployment tanpa hapus kode. **Workflow tidak di-flag** — selalu on untuk HR_Admin/SuperAdmin.

Lihat `src/lib/feature-flags.ts` untuk daftar lengkap.

---

## 9. Metrik Keberhasilan (KPI)

| Metrik | Target |
|--------|--------|
| Waktu approval cuti | < 24 jam (operasional) |
| Clock-in berhasil geo-fence | > 95% attempt valid |
| HR manual password reset | < 5 menit dengan WA notif |
| Workflow test sebelum activate | 100% untuk aturan kritis |
| AI escalation rate | Turun setelah SOP lengkap |

---

## 10. Roadmap (Usulan — belum committed)

| Prioritas | Item |
|-----------|------|
| P1 | Workflow: cron trigger, lebih banyak action types |
| P1 | Nonaktifkan agent legacy saat workflow setara aktif |
| P2 | Dry-run mode untuk workflow test |
| P2 | Supervisor mobile approval |
| P3 | Multi-tenant / multi-company |
| P3 | Webhook action di workflow |

---

## 11. Definisi Selesai (DoD) untuk Fitur Baru

1. Backend API + validasi + role guard
2. Emit event jika relevan untuk workflow/agents
3. UI web dan/atau mobile sesuai persona
4. Migrasi Prisma jika ada schema baru
5. Entry di `src/docs/` untuk HR/Admin jika user-facing
6. Build lulus (`npm run build`, `backend npm run build`)
7. Update `agents.md` / `prd.md` jika mengubah arsitektur atau scope

---

## 12. Glosarium

| Istilah | Arti |
|---------|------|
| **Agen** | Service NestJS `@OnEvent` / `@Cron` yang bereaksi otomatis |
| **Workflow** | Rule graph visual; configurable oleh HR |
| **TARA AI** | LLM orchestrator built-in (OpenRouter) |
| **Hermes** | Sistem AI eksternal legacy (deprecated path) |
| **Publish** | Snapshot workflow draft ke versi production |
| **PWA** | Progressive Web App di `/m` |
| **SOP** | Standard Operating Procedure (PDF) |
| **WIB** | Waktu Indonesia Barat |

---

*Pemilik produk: Ralali / Conextlab MIT. Perbarui PRD ini saat scope release berubah.*
