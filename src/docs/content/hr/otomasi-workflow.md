# Otomasi Workflow

Modul **Otomasi** (`/web/workflows`) memungkinkan HR dan Admin membuat aturan sistem tanpa coding — mirip Zapier/n8n: trigger event → kondisi → aksi (notifikasi, WhatsApp, eskalasi HR).

> **Versi 2.1+** — modul ini menggantikan kebutuhan hardcode untuk banyak skenario notifikasi dan eskalasi.

## Siapa yang bisa akses?

Role **HR_Admin** dan **SuperAdmin**.

## Kapan pakai workflow?

| Situasi | Gunakan workflow |
|---------|------------------|
| Kirim notifikasi saat cuti diajukan/disahkan | Ya |
| Eskalasi ke HR jika supervisor cuti > N hari | Ya |
| Deteksi intent resign dari chat WhatsApp | Ya |
| Koreksi saldo cuti manual | Tidak — pakai **Detail Karyawan** |
| Reset password karyawan | Tidak — pakai tombol **Reset Password** |

Workflow **berjalan otomatis** setelah di-publish dan diaktifkan. Beberapa template sistem disediakan saat instalasi (status awal: nonaktif agar tidak bentrok dengan agen lama).

## Alur kerja: Simpan → Publish → Aktifkan

Setiap perubahan di canvas **belum berlaku** di production sampai Anda menyelesaikan langkah berikut:

1. **Simpan** — simpan draft graph ke server (tombol *Simpan*, hanya aktif jika ada perubahan).
2. **Publish** — snapshot draft menjadi versi production (*Publish*).
3. **Aktifkan** — workflow mulai merespons event nyata (*Aktifkan*).

**Status di sidebar:**

| Badge | Arti |
|-------|------|
| Draft | Belum pernah dipublish |
| Published | Sudah dipublish, belum aktif |
| Draft baru | Ada edit setelah publish terakhir — perlu publish ulang |
| Aktif | Berjalan di production |

> Edit setelah publish **tidak** mengubah yang sedang aktif sampai Anda publish ulang.

## Menguji workflow (Test)

Sebelum mengaktifkan, gunakan **Test**:

1. Klik **Test** di toolbar workflow.
2. Pilih **karyawan (subjek event)** — data role, departemen, atasan di-resolve dari akun ini.
3. Opsional: pilih **actor** (pemicu berbeda dari subjek).
4. Untuk trigger WhatsApp: bisa isi **nomor kustom** untuk simulasi pesan masuk.
5. Klik **Jalankan Test**.

Test menjalankan aksi **nyata** (notifikasi/WA bisa terkirim). Hasilnya muncul di **Log Eksekusi** dengan badge **Test**.

## Log eksekusi

Panel **Log Eksekusi** di bawah canvas menampilkan riwayat run:

- **Berhasil** / **Gagal** dengan waktu
- Badge **Test** untuk run manual
- Klik baris untuk melihat **detail tiap langkah** (node, kondisi, aksi)

Gunakan log ini untuk debug rule yang tidak jalan atau aksi yang gagal.

## Contoh skenario

### Cuti supervisor > 5 hari → eskalasi HR

Template: *Cuti — Hanya Supervisor yang cuti > 5 hari*

1. Trigger: `leave.request.submitted`
2. If: `employee.role` = `Supervisor`
3. If: `payload.total_days` > `5`
4. Aksi: Eskalasi HR

### Intent resign dari WhatsApp

Template: *WA Intent Resign → Eskalasi HR* (biasanya sudah aktif di seed).

## Tips operasional

- Setelah upgrade sistem, klik **Reset Template** hanya jika ingin mengembalikan graph template sistem (tidak mengubah status aktif yang sudah ada).
- Nonaktifkan workflow lama sebelum mengaktifkan yang baru dengan trigger sama, agar notifikasi tidak dobel.
- Untuk pertanyaan teknis (operator kondisi, field catalog), lihat dokumentasi **Admin → Otomasi Workflow**.
