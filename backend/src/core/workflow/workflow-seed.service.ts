import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import type { WorkflowGraph, WorkflowNode, WorkflowNodeData } from './workflow.types';

type SeedWorkflow = {
  slug: string;
  name: string;
  description: string;
  category: string;
  trigger_event: string;
  is_active: boolean;
  graph: WorkflowGraph;
};

function node(
  id: string,
  type: 'trigger' | 'condition' | 'action',
  x: number,
  y: number,
  data: WorkflowNodeData,
): WorkflowNode {
  return { id, type, position: { x, y }, data };
}

function edge(id: string, source: string, target: string, sourceHandle?: 'true' | 'false') {
  return { id, source, target, ...(sourceHandle ? { sourceHandle } : {}) };
}

@Injectable()
export class WorkflowSeedService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  async seedDefaults(): Promise<void> {
    const workflows = this.buildSeedWorkflows();
    for (const wf of workflows) {
      await this.prisma.workflowDefinition.upsert({
        where: { slug: wf.slug },
        create: {
          slug: wf.slug,
          name: wf.name,
          description: wf.description,
          category: wf.category,
          trigger_event: wf.trigger_event,
          is_active: wf.is_active,
          is_system: true,
          graph: wf.graph as any,
          ...(wf.is_active
            ? { published_graph: wf.graph as any, published_at: new Date() }
            : {}),
        },
        update: {
          name: wf.name,
          description: wf.description,
          category: wf.category,
          trigger_event: wf.trigger_event,
          graph: wf.graph as any,
          ...(wf.is_active
            ? { published_graph: wf.graph as any, published_at: new Date() }
            : {}),
        },
      });
    }
    this.logger.log(`Seeded ${workflows.length} workflow definitions`);
  }

  private buildSeedWorkflows(): SeedWorkflow[] {
    return [
      {
        slug: 'leave-supervisor-only-notify',
        name: 'Cuti — Hanya Supervisor yang cuti > 5 hari',
        description: 'Contoh rule: jika yang mengajukan role Supervisor DAN cuti lebih dari 5 hari, eskalasi HR.',
        category: 'leave',
        trigger_event: 'leave.request.submitted',
        is_active: false,
        graph: {
          nodes: [
            node('trigger', 'trigger', 80, 80, {
              label: 'Cuti diajukan',
              eventType: 'leave.request.submitted',
            }),
            node('check-role', 'condition', 80, 200, {
              label: 'Role Supervisor?',
              match: 'all',
              rules: [{ field: 'employee.role', operator: 'eq', value: 'Supervisor' }],
            }),
            node('check-days', 'condition', 80, 340, {
              label: 'Cuti > 5 hari?',
              match: 'all',
              rules: [{ field: 'payload.total_days', operator: 'gt', value: '5' }],
            }),
            node('escalate', 'action', 80, 480, {
              label: 'Eskalasi HR',
              actionType: 'escalate_hr',
              config: {
                reason: 'Supervisor mengajukan cuti panjang (>5 hari)',
                summary: '{{employee.full_name}} — {{payload.total_days}} hari',
              },
            }),
          ],
          edges: [
            edge('e1', 'trigger', 'check-role'),
            edge('e2', 'check-role', 'check-days', 'true'),
            edge('e3', 'check-days', 'escalate', 'true'),
          ],
        },
      },
      {
        slug: 'leave-notify-supervisor',
        name: 'Cuti — Notifikasi ke Atasan',
        description: 'Kirim notifikasi ke supervisor saat karyawan mengajukan cuti (menggantikan Leave Request Agent step 3).',
        category: 'leave',
        trigger_event: 'leave.request.submitted',
        is_active: false,
        graph: {
          nodes: [
            node('trigger', 'trigger', 80, 80, {
              label: 'Cuti diajukan',
              eventType: 'leave.request.submitted',
            }),
            node('notify-supervisor', 'action', 80, 220, {
              label: 'Notifikasi atasan',
              actionType: 'send_notification',
              config: {
                recipient_role: 'supervisor',
                notification_type: 'supervisor_leave_request',
                title: 'Pengajuan cuti — {{payload.employee_name}}',
                content:
                  '{{payload.employee_name}} mengajukan cuti {{payload.leave_type}} ' +
                  '({{payload.total_days}} hari) {{payload.start_date}} — {{payload.end_date}}.\n' +
                  'Alasan: {{payload.reason}}',
              },
            }),
          ],
          edges: [edge('e1', 'trigger', 'notify-supervisor')],
        },
      },
      {
        slug: 'leave-notify-approved',
        name: 'Cuti — Konfirmasi Disetujui',
        description: 'Notifikasi + WhatsApp ke karyawan saat cuti disetujui.',
        category: 'leave',
        trigger_event: 'leave.request.approved',
        is_active: false,
        graph: {
          nodes: [
            node('trigger', 'trigger', 80, 80, {
              label: 'Cuti disetujui',
              eventType: 'leave.request.approved',
            }),
            node('notify', 'action', 80, 220, {
              label: 'Notifikasi karyawan',
              actionType: 'send_notification',
              config: {
                recipient_field: 'payload.employee_id',
                notification_type: 'leave_approval',
                title: 'Cuti disetujui',
                content:
                  'Pengajuan cuti Anda ({{payload.total_days}} hari) telah disetujui oleh {{payload.approver_name}}.',
              },
            }),
            node('wa', 'action', 80, 360, {
              label: 'WhatsApp karyawan',
              actionType: 'send_whatsapp',
              config: {
                recipient_field: 'payload.employee_id',
                message:
                  'Halo {{payload.employee_name}}, cuti Anda telah *disetujui* ' +
                  '({{payload.total_days}} hari). Selamat beristirahat!',
              },
            }),
          ],
          edges: [
            edge('e1', 'trigger', 'notify'),
            edge('e2', 'notify', 'wa'),
          ],
        },
      },
      {
        slug: 'leave-notify-rejected',
        name: 'Cuti — Konfirmasi Ditolak',
        description: 'Notifikasi ke karyawan saat cuti ditolak.',
        category: 'leave',
        trigger_event: 'leave.request.rejected',
        is_active: false,
        graph: {
          nodes: [
            node('trigger', 'trigger', 80, 80, {
              label: 'Cuti ditolak',
              eventType: 'leave.request.rejected',
            }),
            node('notify', 'action', 80, 220, {
              label: 'Notifikasi karyawan',
              actionType: 'send_notification',
              config: {
                recipient_field: 'payload.employee_id',
                notification_type: 'leave_rejection',
                title: 'Cuti ditolak',
                content:
                  'Pengajuan cuti Anda ditolak. Alasan: {{payload.rejection_reason}}',
              },
            }),
          ],
          edges: [edge('e1', 'trigger', 'notify')],
        },
      },
      {
        slug: 'attendance-clock-in-confirm',
        name: 'Absensi — Konfirmasi Clock In',
        description: 'Kirim WhatsApp konfirmasi setelah clock in (Clock Confirmation Agent).',
        category: 'attendance',
        trigger_event: 'attendance.clock_in',
        is_active: false,
        graph: {
          nodes: [
            node('trigger', 'trigger', 80, 80, {
              label: 'Clock in',
              eventType: 'attendance.clock_in',
            }),
            node('wa', 'action', 80, 220, {
              label: 'WA konfirmasi',
              actionType: 'send_whatsapp',
              config: {
                recipient_field: 'payload.employee_id',
                message:
                  'Clock in tercatat pukul {{payload.clock_in_time}} di {{payload.office_name}}. Semangat bekerja!',
              },
            }),
          ],
          edges: [edge('e1', 'trigger', 'wa')],
        },
      },
      {
        slug: 'onboarding-welcome',
        name: 'Onboarding — Selamat Datang',
        description: 'Notifikasi selamat datang saat karyawan baru dibuat (Onboarding Agent step 1).',
        category: 'onboarding',
        trigger_event: 'employee.created',
        is_active: false,
        graph: {
          nodes: [
            node('trigger', 'trigger', 80, 80, {
              label: 'Karyawan baru',
              eventType: 'employee.created',
            }),
            node('notify', 'action', 80, 220, {
              label: 'Notifikasi welcome',
              actionType: 'send_notification',
              config: {
                recipient_field: 'payload.employee_id',
                notification_type: 'onboarding_notification',
                title: 'Selamat datang di TARA',
                content:
                  'Halo {{payload.full_name}}, akun Anda sudah aktif. Login dan lengkapi profil Anda.',
              },
            }),
          ],
          edges: [edge('e1', 'trigger', 'notify')],
        },
      },
      {
        slug: 'wa-intent-resign-escalate',
        name: 'WhatsApp — Intent Resign → HR',
        description: 'Deteksi kata resign/berhenti/phk di chat WA dan eskalasi ke HR.',
        category: 'whatsapp',
        trigger_event: 'whatsapp.message.inbound',
        is_active: true,
        graph: {
          nodes: [
            node('trigger', 'trigger', 80, 80, {
              label: 'Pesan WA masuk',
              eventType: 'whatsapp.message.inbound',
            }),
            node('check-resign', 'condition', 80, 200, {
              label: 'Intent resign?',
              field: 'payload.content',
              operator: 'contains',
              value: 'resign',
            }),
            node('check-berhenti', 'condition', 320, 200, {
              label: 'Kata "berhenti"?',
              field: 'payload.content',
              operator: 'contains',
              value: 'berhenti',
            }),
            node('escalate', 'action', 200, 380, {
              label: 'Eskalasi HR',
              actionType: 'escalate_hr',
              config: {
                reason: 'Intent resign / pengunduran diri via WhatsApp',
                summary: '{{payload.content}}',
                employee_message:
                  'Terima kasih sudah menghubungi TARA. Permintaan terkait pengunduran diri telah diteruskan ke tim HR.',
              },
            }),
          ],
          edges: [
            edge('e1', 'trigger', 'check-resign'),
            edge('e2-true', 'check-resign', 'escalate', 'true'),
            edge('e3-false', 'check-resign', 'check-berhenti', 'false'),
            edge('e4-true', 'check-berhenti', 'escalate', 'true'),
          ],
        },
      },
      {
        slug: 'wa-intent-phk-escalate',
        name: 'WhatsApp — Intent PHK → HR',
        description: 'Deteksi pertanyaan PHK/pemutusan kerja dan eskalasi ke HR.',
        category: 'whatsapp',
        trigger_event: 'whatsapp.message.inbound',
        is_active: true,
        graph: {
          nodes: [
            node('trigger', 'trigger', 80, 80, {
              label: 'Pesan WA masuk',
              eventType: 'whatsapp.message.inbound',
            }),
            node('check-phk', 'condition', 80, 220, {
              label: 'Mention PHK?',
              field: 'payload.content',
              operator: 'contains',
              value: 'phk',
            }),
            node('escalate', 'action', 80, 380, {
              label: 'Eskalasi HR',
              actionType: 'escalate_hr',
              config: {
                reason: 'Pertanyaan PHK / pemutusan kerja via WhatsApp',
                summary: '{{payload.content}}',
              },
            }),
          ],
          edges: [
            edge('e1', 'trigger', 'check-phk'),
            edge('e2-true', 'check-phk', 'escalate', 'true'),
          ],
        },
      },
      {
        slug: 'tardiness-warning-notify',
        name: 'Absensi — Peringatan Keterlambatan',
        description: 'Notifikasi karyawan saat terdeteksi telat (Warning Letter Agent awal).',
        category: 'attendance',
        trigger_event: 'attendance.tardiness_detected',
        is_active: false,
        graph: {
          nodes: [
            node('trigger', 'trigger', 80, 80, {
              label: 'Terlambat terdeteksi',
              eventType: 'attendance.tardiness_detected',
            }),
            node('notify', 'action', 80, 220, {
              label: 'Notifikasi karyawan',
              actionType: 'send_notification',
              config: {
                recipient_field: 'payload.employee_id',
                notification_type: 'warning_letter',
                title: 'Anda terlambat hari ini',
                content:
                  'Clock in tercatat terlambat {{payload.tardiness_minutes}} menit. Mohon perhatikan jam kehadiran.',
              },
            }),
          ],
          edges: [edge('e1', 'trigger', 'notify')],
        },
      },
    ];
  }
}
