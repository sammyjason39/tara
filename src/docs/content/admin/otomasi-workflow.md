# Otomasi Workflow (Admin)

Panduan teknis modul **Otomasi** (`/web/workflows`) — mesin aturan event-driven TARA v2.1+.

## Arsitektur singkat

```
Event sistem (cuti, absensi, WA, dll.)
        ↓
Workflow aktif + published graph
        ↓
Trigger → If (kondisi) → Aksi
        ↓
Log eksekusi + side effect (notifikasi / WA / eskalasi)
```

- **Draft** disimpan di kolom `graph`.
- **Production** memakai `published_graph` (hanya setelah Publish).
- Engine hanya menjalankan workflow dengan `is_active = true` **dan** `published_graph` terisi.

## Akses

| Role | Akses |
|------|-------|
| SuperAdmin | Penuh |
| HR_Admin | Penuh |
| Supervisor / Employee | Tidak ada |

## Node types

| Node | Fungsi |
|------|--------|
| **Trigger** | Event pemicu (`leave.request.submitted`, `whatsapp.message.inbound`, dll.) |
| **If / Kondisi** | Cabang berdasarkan rule (role, departemen, payload, dll.) |
| **Aksi** | Kirim notifikasi, WhatsApp, eskalasi HR, set variabel, log debug |

## Kondisi (If)

Satu node If bisa punya **beberapa rule** dengan mode:

- **ALL** — semua rule harus benar (AND)
- **ANY** — salah satu cukup (OR)

### Field yang tersedia (contoh)

Setelah event terjadi, sistem meng-enrich context dari database:

| Grup | Field contoh |
|------|----------------|
| Karyawan | `employee.role`, `employee.department`, `employee.office`, `employee.full_name` |
| Actor | `actor_employee.role`, `actor.id` |
| Atasan | `supervisor.role`, `supervisor.full_name` |
| Payload event | `payload.total_days`, `payload.content`, `payload.leave_type` |

Field catalog di panel **Properti Node** menyesuaikan **trigger event** yang dipilih.

### Operator

`eq`, `neq`, `contains`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `starts_with`, `ends_with`, `exists`, `is_empty`, `is_true`, `is_false`

Untuk `in` / `not_in`, pisahkan nilai dengan koma (mis. `Employee,Supervisor`).

## Tipe aksi

| Aksi | Deskripsi |
|------|-----------|
| Kirim Notifikasi | In-app ke karyawan/HR/supervisor |
| Kirim WhatsApp | Pesan WA ke penerima ter-resolve |
| Eskalasi ke HR | Notifikasi staff HR + opsional ack WA ke karyawan |
| Notifikasi per Role | Semua karyawan dengan role tertentu |
| Set Variabel | Simpan nilai untuk node berikutnya (`{{variables.nama}}`) |
| Log (Debug) | Catat ke log server |

### Mode penerima

`employee`, `actor`, `supervisor`, `role`, `department`, atau field path kustom.

Template pesan mendukung variabel: `{{employee.full_name}}`, `{{payload.total_days}}`, dll.

## Lifecycle: Simpan → Publish → Aktifkan

| Langkah | API / UI | Efek |
|---------|----------|------|
| Simpan | `PUT /workflows/:id` `{ graph }` | Update draft + sync `trigger_event` dari node trigger |
| Publish | `POST /workflows/:id/publish` | Copy `graph` → `published_graph` |
| Aktifkan | `POST /workflows/:id/activate` | `is_active = true` (wajib sudah publish) |
| Nonaktifkan | `POST /workflows/:id/deactivate` | `is_active = false` |

Commit message `chore(release):` di deploy production **tidak** memicu auto-bump versi di CI.

## Test execution

`POST /workflows/:id/test`

```json
{
  "employee_id": "uuid-karyawan",
  "actor_employee_id": "uuid-opsional",
  "phone": "6281234567890",
  "event": { "event_type": "...", "payload": { } }
}
```

- Run ditandai `is_test = true` di `workflow_executions`.
- Test memakai **graph tersimpan** (bukan draft di browser yang belum disimpan).
- Aksi nyata tetap dijalankan — gunakan akun test dengan hati-hati.

## Log eksekusi

- `GET /workflows/:id/executions?limit=30`
- `GET /workflows/:id/executions/:executionId`

Setiap baris berisi: `status`, `is_test`, `steps_log[]`, `error`, `context` (event JSON), timestamp.

## Template sistem (seed)

Tombol **Reset Template** menjalankan `POST /workflows/seed` — upsert template tanpa menghapus workflow custom. Template bawaan mencakup skenario cuti, absensi, onboarding, dan intent WA.

**Praktik:** nonaktifkan agen/notifikasi hardcode lama sebelum mengaktifkan workflow dengan trigger yang sama.

## Coexistence dengan AI Agent

| Komponen | Peran |
|----------|-------|
| **Workflow engine** | Aturan deterministik pada event bus |
| **AI Agent (WhatsApp)** | Percakapan natural language + tool calling |
| **Agen HR legacy** | Beberapa masih aktif; workflow bisa menggantikan sebagian |

Workflow tidak menggantikan SOP AI — tetap upload PDF dan re-index untuk jawaban kebijakan.

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Workflow tidak jalan | Pastikan **Published** + **Aktif**; cek `trigger_event` cocok dengan event |
| Rule selalu false | Test dengan karyawan yang datanya lengkap; cek field path di log |
| Notifikasi dobel | Nonaktifkan workflow/agen lain dengan trigger sama |
| Test pakai graph lama | **Simpan** dulu sebelum test |
| WA gagal di test | Karyawan harus `whatsapp_verified` + opted-in |

## Environment

Workflow engine aktif default. Nonaktifkan dengan `WORKFLOW_ENGINE_ENABLED=false` di `.env` backend (hanya untuk debugging darurat).
