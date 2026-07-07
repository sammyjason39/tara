export type WorkflowFieldType = 'string' | 'number' | 'boolean' | 'date';

export interface WorkflowFieldDef {
  path: string;
  label: string;
  group: string;
  type: WorkflowFieldType;
  description?: string;
  /** Suggested values for dropdown (e.g. roles) */
  options?: string[];
}

export const WORKFLOW_OPERATOR_CATALOG: Record<
  string,
  { label: string; description: string; needsValue: boolean }
> = {
  eq: { label: 'sama dengan', description: 'Nilai persis sama', needsValue: true },
  neq: { label: 'tidak sama dengan', description: 'Nilai berbeda', needsValue: true },
  contains: { label: 'mengandung', description: 'Teks mengandung substring', needsValue: true },
  not_contains: { label: 'tidak mengandung', description: 'Teks tidak mengandung substring', needsValue: true },
  starts_with: { label: 'diawali', description: 'Teks diawali dengan', needsValue: true },
  ends_with: { label: 'diakhiri', description: 'Teks diakhiri dengan', needsValue: true },
  exists: { label: 'ada / tidak kosong', description: 'Field punya nilai', needsValue: false },
  is_empty: { label: 'kosong', description: 'Field null atau kosong', needsValue: false },
  gt: { label: 'lebih besar', description: 'Angka lebih besar', needsValue: true },
  gte: { label: 'lebih besar/sama', description: 'Angka >=', needsValue: true },
  lt: { label: 'lebih kecil', description: 'Angka lebih kecil', needsValue: true },
  lte: { label: 'lebih kecil/sama', description: 'Angka <=', needsValue: true },
  in: { label: 'salah satu dari', description: 'Nilai ada di daftar (pisah koma)', needsValue: true },
  not_in: { label: 'bukan salah satu dari', description: 'Nilai tidak ada di daftar', needsValue: true },
  is_true: { label: 'benar (true)', description: 'Boolean true', needsValue: false },
  is_false: { label: 'salah (false)', description: 'Boolean false', needsValue: false },
};

const ROLE_OPTIONS = ['SuperAdmin', 'HR_Admin', 'Supervisor', 'Employee'];
const STATUS_OPTIONS = ['active', 'probation', 'on_leave', 'resigned', 'terminated'];

/** Fields always available after context enrichment */
export const WORKFLOW_BASE_FIELDS: WorkflowFieldDef[] = [
  { path: 'employee.id', label: 'ID karyawan (subjek)', group: 'Karyawan', type: 'string' },
  { path: 'employee.employee_code', label: 'Kode karyawan', group: 'Karyawan', type: 'string' },
  { path: 'employee.full_name', label: 'Nama lengkap', group: 'Karyawan', type: 'string' },
  { path: 'employee.email', label: 'Email', group: 'Karyawan', type: 'string' },
  { path: 'employee.role', label: 'Role', group: 'Karyawan', type: 'string', options: ROLE_OPTIONS },
  { path: 'employee.department', label: 'Departemen', group: 'Karyawan', type: 'string' },
  { path: 'employee.office', label: 'Lokasi kantor', group: 'Karyawan', type: 'string' },
  { path: 'employee.employment_status', label: 'Status kepegawaian', group: 'Karyawan', type: 'string', options: STATUS_OPTIONS },
  { path: 'employee.supervisor_id', label: 'ID atasan', group: 'Karyawan', type: 'string' },
  { path: 'employee.supervisor_name', label: 'Nama atasan', group: 'Karyawan', type: 'string' },
  { path: 'employee.whatsapp_verified', label: 'WA terverifikasi', group: 'Karyawan', type: 'boolean' },
  { path: 'actor.id', label: 'ID actor (pemicu)', group: 'Actor', type: 'string' },
  { path: 'actor.type', label: 'Tipe actor', group: 'Actor', type: 'string', options: ['employee', 'agent', 'system'] },
  { path: 'actor_employee.role', label: 'Role actor', group: 'Actor', type: 'string', options: ROLE_OPTIONS },
  { path: 'actor_employee.department', label: 'Departemen actor', group: 'Actor', type: 'string' },
  { path: 'supervisor.id', label: 'ID atasan', group: 'Atasan', type: 'string' },
  { path: 'supervisor.full_name', label: 'Nama atasan', group: 'Atasan', type: 'string' },
  { path: 'supervisor.role', label: 'Role atasan', group: 'Atasan', type: 'string', options: ROLE_OPTIONS },
  { path: 'supervisor.email', label: 'Email atasan', group: 'Atasan', type: 'string' },
  { path: 'event.event_type', label: 'Tipe event', group: 'Event', type: 'string' },
  { path: 'entity.type', label: 'Tipe entity', group: 'Event', type: 'string' },
  { path: 'entity.id', label: 'ID entity', group: 'Event', type: 'string' },
];

/** Extra payload fields per trigger event */
export const WORKFLOW_EVENT_PAYLOAD_FIELDS: Record<string, WorkflowFieldDef[]> = {
  'leave.request.submitted': [
    { path: 'payload.leave_type', label: 'Jenis cuti', group: 'Payload Cuti', type: 'string', options: ['annual', 'sick', 'emergency', 'unpaid'] },
    { path: 'payload.total_days', label: 'Total hari cuti', group: 'Payload Cuti', type: 'number' },
    { path: 'payload.reason', label: 'Alasan cuti', group: 'Payload Cuti', type: 'string' },
    { path: 'payload.employee_id', label: 'ID karyawan', group: 'Payload Cuti', type: 'string' },
  ],
  'leave.request.approved': [
    { path: 'payload.leave_type', label: 'Jenis cuti', group: 'Payload Cuti', type: 'string' },
    { path: 'payload.total_days', label: 'Total hari', group: 'Payload Cuti', type: 'number' },
    { path: 'payload.approver_name', label: 'Nama approver', group: 'Payload Cuti', type: 'string' },
  ],
  'leave.request.rejected': [
    { path: 'payload.rejection_reason', label: 'Alasan ditolak', group: 'Payload Cuti', type: 'string' },
  ],
  'whatsapp.message.inbound': [
    { path: 'payload.content', label: 'Isi pesan WA', group: 'Payload WhatsApp', type: 'string' },
    { path: 'payload.message_type', label: 'Tipe pesan', group: 'Payload WhatsApp', type: 'string' },
  ],
  'attendance.clock_in': [
    { path: 'payload.is_tardy', label: 'Terlambat?', group: 'Payload Absensi', type: 'boolean' },
    { path: 'payload.tardiness_minutes', label: 'Menit telat', group: 'Payload Absensi', type: 'number' },
    { path: 'payload.office_name', label: 'Nama kantor', group: 'Payload Absensi', type: 'string' },
  ],
  'attendance.tardiness_detected': [
    { path: 'payload.tardiness_minutes', label: 'Menit telat', group: 'Payload Absensi', type: 'number' },
  ],
  'employee.created': [
    { path: 'payload.full_name', label: 'Nama karyawan baru', group: 'Payload Karyawan', type: 'string' },
    { path: 'payload.email', label: 'Email', group: 'Payload Karyawan', type: 'string' },
  ],
};

export function getFieldsForTrigger(triggerEvent: string | null | undefined): WorkflowFieldDef[] {
  const payloadFields = triggerEvent ? WORKFLOW_EVENT_PAYLOAD_FIELDS[triggerEvent] ?? [] : [];
  const seen = new Set<string>();
  const merged: WorkflowFieldDef[] = [];
  for (const f of [...WORKFLOW_BASE_FIELDS, ...payloadFields]) {
    if (seen.has(f.path)) continue;
    seen.add(f.path);
    merged.push(f);
  }
  return merged;
}

export const WORKFLOW_RECIPIENT_MODES = [
  { id: 'employee', label: 'Karyawan subjek (employee)' },
  { id: 'actor', label: 'Actor / pemicu event' },
  { id: 'supervisor', label: 'Atasan karyawan' },
  { id: 'field', label: 'Field ID kustom' },
  { id: 'role', label: 'Semua karyawan dengan role' },
  { id: 'department', label: 'Semua karyawan departemen' },
] as const;
