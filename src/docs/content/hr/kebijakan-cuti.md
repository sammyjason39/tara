# Kebijakan Cuti

Kelola jatah, tipe cuti, dan koreksi saldo karyawan.

## Jatah tahunan

Saldo cuti per karyawan ditampilkan di modul **Cuti** (`/web/leaves`) dan di **Detail Karyawan**. Update jatah dapat dilakukan melalui:

- Seed/import data HR (Excel)
- **Penyesuaian manual** oleh HR Admin (disarankan untuk koreksi operasional)

## Penyesuaian saldo oleh HR

Untuk koreksi cepat tanpa pengajuan cuti:

1. Buka **Karyawan** → pilih karyawan → **Detail**.
2. Di kartu **Saldo Cuti**, klik **+ Sesuaikan saldo cuti**.
3. Tambah atau kurangi hari + **alasan wajib**.
4. Simpan.

Setiap penyesuaian:

- Langsung memperbarui saldo tersisa
- Tercatat di riwayat dengan timestamp, jumlah, alasan, dan nama HR penyesuai
- Tidak menggantikan pengajuan cuti resmi — hanya koreksi jatah

Contoh alasan: *Koreksi onboarding*, *Carryover tahun lalu*, *Kesalahan input awal*.

## Tipe cuti

Tipe umum: tahunan, sakit, darurat, tanpa gaji — sesuai kebijakan perusahaan.

Karyawan mengajukan via **Cuti** di mobile (`/m/leave`) atau web. Di mobile, field tanggal memakai date picker native — tap langsung pada field **Dari** / **Sampai**.

Opsi **cuti setengah hari** muncul jika tanggal mulai = tanggal selesai (memotong 0,5 jatah).

## Kalender libur

**Libur nasional** dan hari libur perusahaan dikelola di pengaturan agar perhitungan hari kerja akurat.

## Kebijakan global

Pengaturan seperti minimal hari pengajuan sebelum cuti biasanya tercantum di **SOP** dan diindeks untuk AI. Perubahan kebijakan:

1. Update dokumen SOP PDF.
2. Upload ulang di modul SOP.
3. Jalankan **Re-index SOP** di pengaturan AI Agent.

## Otomasi terkait cuti

Workflow dapat mengirim notifikasi atau eskalasi HR saat cuti diajukan — misalnya jika yang mengajukan supervisor dengan durasi panjang. Lihat [Otomasi Workflow](/docs/hr/otomasi-workflow).

## Audit

Semua pengajuan, approval, dan penyesuaian saldo tersimpan dengan timestamp untuk audit.
