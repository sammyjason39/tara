export type DocsAudience = "employee" | "supervisor" | "hr" | "admin";

const SUPERVISOR_ROLES = new Set(["Supervisor", "HR_Admin", "SuperAdmin"]);
const HR_ROLES = new Set(["HR_Admin", "SuperAdmin"]);
const ADMIN_ROLES = new Set(["SuperAdmin", "HR_Admin"]);

export function canAccessDocsSection(
  section: DocsAudience,
  role: string | null | undefined,
  isAuthenticated: boolean,
): boolean {
  if (section === "employee") return true;
  if (!isAuthenticated || !role) return false;
  switch (section) {
    case "supervisor":
      return SUPERVISOR_ROLES.has(role);
    case "hr":
      return HR_ROLES.has(role);
    case "admin":
      return ADMIN_ROLES.has(role);
    default:
      return false;
  }
}

export function sectionRequiresAuth(section: DocsAudience): boolean {
  return section !== "employee";
}

export const SECTION_LABELS: Record<DocsAudience, string> = {
  employee: "Karyawan",
  supervisor: "Supervisor",
  hr: "HR",
  admin: "Admin",
};

export const SECTION_DESCRIPTIONS: Record<DocsAudience, string> = {
  employee: "Panduan untuk semua karyawan — tidak perlu login",
  supervisor: "Kelola tim, setujui cuti, pantau absensi",
  hr: "Kelola karyawan, SOP, dan kebijakan HR",
  admin: "Konfigurasi sistem, role, dan AI Agent",
};
