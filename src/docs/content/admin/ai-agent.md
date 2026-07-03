# AI Agent

Konfigurasi asisten AI TARA untuk WhatsApp dan skill internal.

## Mengaktifkan AI

Pastikan environment variable **`AI_API_KEY`** terisi (OpenRouter atau provider kompatibel OpenAI). Tanpa ini, asisten tidak aktif.

## Skill registry

Di **Pengaturan → AI Agent**, aktifkan skill per kebutuhan:

- **SOP** — `search_sop`, `list_sop_documents` (wajib untuk jawaban kebijakan)
- **Leave** — info saldo dan status cuti
- **Attendance** — info absensi karyawan
- Dan lainnya sesuai daftar di UI

## Memori (mem0)

Asisten menyimpan **fakta percakapan** per karyawan (preferensi, konteks), **bukan** isi PDF. PDF diindeks terpisah di tabel `sop_chunks`.

## Re-index SOP

Jalankan setelah upload PDF baru atau jika jawaban AI tidak akurat:

1. Pengaturan → AI Agent → **Re-index SOP**
2. Monitor log backend untuk error embedding

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| AI tidak menjawab | Cek `AI_API_KEY`, skill aktif |
| Jawaban kebijakan salah | Upload SOP, re-index, pastikan PDF berisi teks |
| PDF scan tidak terbaca | Gunakan PDF teks, bukan scan foto |

## Log AI

Modul **AI Logs** (`/web/ai-logs`) menampilkan riwayat percakapan untuk audit HR.
