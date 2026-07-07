# Manajemen Karyawan

HR mengelola data master karyawan di modul **Karyawan** (`/web/employees`).

## Menambah karyawan

1. Buka **Karyawan** → **Tambah**.
2. Isi data wajib: nama, email, kode karyawan, departemen, role, lokasi kantor.
3. Assign **supervisor** jika applicable (pejabat berwenang menyetujui cuti).
4. Simpan — karyawan menerima kredensial login (via proses onboarding perusahaan atau WhatsApp TARA).

## Halaman detail karyawan

Klik nama karyawan untuk membuka **Detail Karyawan** (`/web/employees/:id`).

### Informasi profil

Menampilkan email, telepon, departemen, role, atasan, lokasi kantor, status kepegawaian, dan tanggal bergabung.

### Edit & hapus

- **Edit** — ubah profil, departemen, role, supervisor, lokasi kantor.
- **Hapus** — soft delete (status `deleted`); tidak dapat dihapus jika masih memiliki bawahan langsung.

### Reset password

Tombol **Reset Password** di header detail karyawan:

1. Password direset ke **password default** sistem.
2. Jika karyawan **WhatsApp terverifikasi**, sistem mengirim pesan WA berisi password baru dan link login.
3. Jika WA tidak terverifikasi, reset tetap berhasil — beritahu karyawan secara manual.

> Gunakan setelah karyawan lupa password atau saat onboarding ulang. Karyawan tetap wajib ganti password saat login jika kebijakan `must_change_password` aktif.

### Saldo cuti & penyesuaian manual

Bagian **Saldo Cuti** menampilkan sisa jatah tahun berjalan. HR dapat:

1. Klik **+ Sesuaikan saldo cuti**.
2. Pilih **Tambah** atau **Kurangi**.
3. Isi jumlah hari (desimal `0.5` didukung untuk setengah hari).
4. Wajib isi **alasan** (audit).
5. Klik **Simpan penyesuaian**.

Perubahan tercatat di **Riwayat Cuti** pada halaman yang sama (gabungan pengajuan cuti + log penyesuaian HR), dengan nama HR yang melakukan koreksi.

Lihat juga [Kebijakan Cuti](/docs/hr/kebijakan-cuti).

## Impor data

Untuk bulk import, gunakan skrip seed atau migrasi yang disediakan tim IT — hubungi Admin untuk deployment data besar.

## Role karyawan

| Role | Deskripsi |
|------|-----------|
| Employee | Akses standar karyawan |
| Supervisor | Approval cuti tim |
| HR_Admin | Operasional HR penuh |
| SuperAdmin | Konfigurasi sistem |

## Keamanan data

Data karyawan bersifat **PII** — jangan export ke luar sistem tanpa otorisasi. File CSV karyawan tidak disimpan di repository publik.
