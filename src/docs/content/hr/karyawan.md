# Manajemen Karyawan

HR mengelola data master karyawan di modul **Karyawan**.

## Menambah karyawan

1. Buka **Karyawan** → **Tambah**.
2. Isi data wajib: nama, email, kode karyawan, departemen, role.
3. Assign **supervisor** jika applicable.
4. Simpan — karyawan menerima kredensial login (via proses onboarding perusahaan).

## Mengedit data

Klik karyawan → edit profil, departemen, role, atau status aktif/nonaktif.

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
