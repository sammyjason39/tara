import type { DocsAudience } from "./docs-access";

export interface DocPage {
  slug: string;
  title: string;
  description?: string;
}

export interface DocSection {
  id: DocsAudience;
  label: string;
  pages: DocPage[];
}

export const DOC_SECTIONS: DocSection[] = [
  {
    id: "employee",
    label: "Karyawan",
    pages: [
      { slug: "memulai", title: "Memulai", description: "Login, PWA, dan navigasi dasar" },
      { slug: "absensi", title: "Absensi & Clock-in", description: "Selfie, GPS, dan jam kerja" },
      { slug: "cuti", title: "Pengajuan Cuti", description: "Ajukan dan lacak status cuti" },
      { slug: "whatsapp-ai", title: "Asisten WhatsApp", description: "Login pertama & tanya kebijakan lewat chat" },
      { slug: "sop", title: "Dokumen SOP", description: "Baca prosedur perusahaan" },
      { slug: "profil", title: "Profil & Keamanan", description: "PIN, password, dan bahasa" },
    ],
  },
  {
    id: "supervisor",
    label: "Supervisor",
    pages: [
      { slug: "peran", title: "Peran Supervisor", description: "Akses dan tanggung jawab" },
      { slug: "tim", title: "Mengelola Tim", description: "Lihat bawahan dan hierarki" },
      { slug: "persetujuan-cuti", title: "Persetujuan Cuti", description: "Setujui atau tolak pengajuan" },
      { slug: "absensi-tim", title: "Absensi Tim", description: "Pantau kehadiran bawahan" },
    ],
  },
  {
    id: "hr",
    label: "HR",
    pages: [
      { slug: "dashboard-hr", title: "Dashboard HR", description: "Ringkasan operasional" },
      { slug: "karyawan", title: "Manajemen Karyawan", description: "Tambah, edit, reset password, penyesuaian cuti" },
      { slug: "kebijakan-cuti", title: "Kebijakan Cuti", description: "Jatah, penyesuaian saldo, dan kalender" },
      { slug: "otomasi-workflow", title: "Otomasi Workflow", description: "Aturan notifikasi dan eskalasi tanpa coding" },
      { slug: "sop-upload", title: "Upload SOP", description: "PDF kebijakan untuk AI Agent" },
      { slug: "absensi-hr", title: "Absensi & Bukti Foto", description: "Audit kehadiran karyawan" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    pages: [
      { slug: "pengaturan", title: "Pengaturan Sistem", description: "Branding, fitur, dan integrasi" },
      { slug: "otomasi-workflow", title: "Otomasi Workflow", description: "Mesin aturan, trigger, dan troubleshooting" },
      { slug: "role-akses", title: "Role & Akses", description: "Kelola role dan permission" },
      { slug: "ai-agent", title: "AI Agent", description: "Skill, memori, dan re-index SOP" },
      { slug: "deployment", title: "Staging & Production", description: "Alur deploy dan environment" },
    ],
  },
];

export function findDocPage(sectionId: string, slug: string) {
  const section = DOC_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return null;
  const page = section.pages.find((p) => p.slug === slug);
  if (!page) return null;
  return { section, page };
}

export function getDefaultDocPath(): string {
  return "/docs/employee/memulai";
}
