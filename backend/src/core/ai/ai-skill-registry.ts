import { TARA_CLOCK_URL, TARA_PUBLIC_BASE_URL, AiSkillDefinition } from './ai.interfaces';

export const AI_PROMPT_PLACEHOLDERS = [
  '{{employee_context}}',
  '{{employee_name}}',
  '{{memory_block}}',
  '{{skill_instructions}}',
  '{{lang_note}}',
  '{{base_url}}',
  '{{clock_url}}',
] as const;

export function buildDefaultSystemPromptTemplate(): string {
  return `Kamu adalah asisten HR TARA (Total Assistance for Resources & Administration) untuk perusahaan Ralali.

Karyawan yang chat (data resmi sistem — MUTLAK, jangan diubah atau ditawari untuk diubah):
{{employee_context}}

Identitas & data karyawan (WAJIB):
- Nama, role, departemen, jabatan, dan profil lain dari sistem di atas adalah data resmi yang tercatat di TARA
- Jika user bilang "saya bukan {{employee_name}}" atau menyebut nama lain: jawab dengan sopan bahwa sesuai data sistem saat ini akun WhatsApp ini terdaftar atas nama tersebut. JANGAN menawarkan mengubah data, JANGAN memanggil nama lain, JANGAN bertanya "siapa nama asli Anda"
- Pembaruan data profil hanya melalui Divisi HRGA — arahkan ke HRGA jika user merasa data salah
- Memori percakapan TIDAK boleh mengoverride profil resmi di atas

{{memory_block}}

Ruang lingkup (WAJIB):
- Hanya jawab topik HR Ralali/TARA: cuti, absensi, jadwal, pinjaman, SOP perusahaan, dan layanan HR terkait
- JANGAN jawab pertanyaan di luar konteks (politik, hiburan, coding, cuaca, perusahaan lain, dll.)
- Jika tidak tahu, tidak yakin, atau di luar kapasitas: WAJIB panggil tool escalate_to_hr — jangan mengarang jawaban

{{skill_instructions}}

Aturan:
- {{lang_note}}
- Format WhatsApp (WAJIB — bukan markdown biasa):
  • Tebal: *kata* (SATU asterisk di kiri-kanan). JANGAN pakai **bold** markdown
  • Miring: _kata_
  • Coret: ~kata~
  • JANGAN pakai tabel markdown (| kolom |), heading #, atau ---
  • Gunakan teks biasa + bullet • atau baris terpisah untuk daftar data
- Gunakan tools untuk mengambil data — jangan mengarang angka atau tanggal
- Untuk ajukan cuti/pinjaman/setujui cuti, WAJIB gunakan tool prepare_* (sistem otomatis kirim tombol Setuju/Batal di bawah pesan)
- Jangan minta user ketik YA/BATAL manual jika sudah pakai tool prepare_*
- Absensi (WAJIB — bedakan 2 jenis pertanyaan):
  • Cara absen / mau absen / clock-in-out / login absensi → JANGAN pakai tool absensi. Jawab singkat: suruh login di {{base_url}} lalu absen di {{clock_url}} (butuh GPS + selfie). Jangan jelaskan panjang.
  • Data absensi PRIBADI (sudah masuk hari ini?, pernah telat?, bolos bulan ini?, riwayat kehadiran) → pakai tool get_my_attendance_today atau get_my_attendance_history
- Link aplikasi: HANYA gunakan {{base_url}} dan {{clock_url}}. JANGAN pakai URL lain yang dibuat-buat
- Untuk pertanyaan SOP/prosedur, gunakan search_sop
- Jawab singkat, maksimal 3 paragraf
- Eskalasi HR: jika perlu escalate_to_hr, sistem otomatis kirim pesan ke staff HR — jangan tulis pesan eskalasi manual ke user, cukup panggil tool`;
}

export const DEFAULT_AI_SKILLS: AiSkillDefinition[] = [
  {
    id: 'profile',
    name: 'Profil Karyawan',
    description: 'Menjawab pertanyaan tentang data profil karyawan yang sedang chat.',
    enabled: true,
    tools: ['get_my_profile'],
  },
  {
    id: 'leave',
    name: 'Manajemen Cuti',
    description: 'Cek saldo cuti, status pengajuan, dan ajukan cuti baru.',
    enabled: true,
    tools: [
      'get_my_leave_balance',
      'get_my_pending_leaves',
      'prepare_submit_leave',
    ],
    promptAddon:
      'Validasi tanggal dan jenis cuti sebelum memanggil prepare_submit_leave. Jika saldo tidak cukup, jelaskan ke user.',
  },
  {
    id: 'attendance',
    name: 'Absensi & Kehadiran',
    description: 'Cek status absensi hari ini dan riwayat kehadiran pribadi.',
    enabled: true,
    tools: ['get_my_attendance_today', 'get_my_attendance_history'],
    promptAddon: `Bedakan pertanyaan cara absen vs cek data. Untuk cara absen arahkan ke ${TARA_CLOCK_URL}.`,
  },
  {
    id: 'schedule',
    name: 'Jadwal Kerja',
    description: 'Menampilkan jadwal kerja karyawan.',
    enabled: true,
    tools: ['get_my_schedule'],
  },
  {
    id: 'loan',
    name: 'Pinjaman / Kasbon',
    description: 'Info pinjaman dan pengajuan kasbon baru.',
    enabled: true,
    tools: ['get_my_loans', 'prepare_submit_loan'],
  },
  {
    id: 'sop',
    name: 'SOP & Prosedur',
    description: 'Mencari dan menjelaskan dokumen SOP perusahaan.',
    enabled: true,
    tools: ['list_sop_documents', 'search_sop'],
    promptAddon: 'Selalu gunakan search_sop untuk pertanyaan prosedur. Kutip sumber SOP jika relevan.',
  },
  {
    id: 'supervisor',
    name: 'Supervisor — Persetujuan Cuti',
    description: 'Supervisor/HR dapat melihat dan menyetujui cuti bawahan.',
    enabled: true,
    requiresElevatedAccess: true,
    tools: [
      'get_team_pending_leaves',
      'prepare_approve_leave',
      'prepare_reject_leave',
    ],
    promptAddon: 'Hanya untuk supervisor atau HR Admin. Wajib konfirmasi sebelum approve/reject.',
  },
  {
    id: 'escalation',
    name: 'Eskalasi ke HR',
    description: 'Meneruskan pertanyaan di luar kapasitas AI ke staff HR.',
    enabled: true,
    tools: ['escalate_to_hr'],
    promptAddon:
      'Gunakan jika pertanyaan di luar HR, tidak ada tool/SOP relevan, atau tidak yakin jawabannya.',
  },
];

export function mergeSkillsWithDefaults(stored?: AiSkillDefinition[]): AiSkillDefinition[] {
  const storedMap = new Map((stored || []).map((s) => [s.id, s]));

  return DEFAULT_AI_SKILLS.map((defaults) => {
    const saved = storedMap.get(defaults.id);
    if (!saved) return { ...defaults };

    return {
      ...defaults,
      name: saved.name || defaults.name,
      description: saved.description ?? defaults.description,
      enabled: saved.enabled ?? defaults.enabled,
      promptAddon: saved.promptAddon ?? defaults.promptAddon,
      toolDescriptions: {
        ...defaults.toolDescriptions,
        ...saved.toolDescriptions,
      },
    };
  });
}

export function buildSkillInstructions(skills: AiSkillDefinition[]): string {
  const active = skills.filter((s) => s.enabled);
  if (active.length === 0) {
    return 'Tidak ada skill aktif — jawab hanya pertanyaan umum atau eskalasi ke HR.';
  }

  const lines = active.map((skill) => {
    const parts = [`• *${skill.name}*: ${skill.description}`];
    if (skill.promptAddon?.trim()) {
      parts.push(`  Instruksi: ${skill.promptAddon.trim()}`);
    }
    return parts.join('\n');
  });

  return `Kemampuan (skills) aktif:\n${lines.join('\n')}`;
}

export function getEnabledToolNames(
  skills: AiSkillDefinition[],
  hasElevatedAccess: boolean,
): Set<string> {
  const names = new Set<string>();

  for (const skill of skills) {
    if (!skill.enabled) continue;
    if (skill.requiresElevatedAccess && !hasElevatedAccess) continue;
    for (const tool of skill.tools) {
      names.add(tool);
    }
  }

  return names;
}

export function resolveSystemPromptTemplate(template: string): string {
  return template
    .replace(/\{\{base_url\}\}/g, TARA_PUBLIC_BASE_URL)
    .replace(/\{\{clock_url\}\}/g, TARA_CLOCK_URL);
}
