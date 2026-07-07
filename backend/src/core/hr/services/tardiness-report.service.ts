import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { EventBusService, TaraEvent } from './event-bus.service';

export type TardyEmployeeEntry = {
  employee_id: string;
  employee_name: string;
  department_name: string | null;
  arrival_time: string;
  minutes_late: number;
};

export type DailyTardinessReportPayload = {
  report_type: 'daily_tardiness';
  report_date: string;
  tardy_count: number;
  no_tardiness: boolean;
  tardy_employees: TardyEmployeeEntry[];
  public_tardiness_title: string;
  public_tardiness_content: string;
  hr_recap_title: string;
  hr_recap_content: string;
  positive_title: string;
  positive_content: string;
};

@Injectable()
export class TardinessReportService {
  private readonly logger = new Logger(TardinessReportService.name);
  private readonly TIME_ZONE = 'Asia/Jakarta';

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBusService: EventBusService,
  ) {}

  /**
   * Build today's (or given WIB day) tardiness report and emit `report.daily_tardiness`
   * for workflow automation to deliver notifications.
   */
  async generateAndEmit(referenceDate?: Date): Promise<DailyTardinessReportPayload | null> {
    const reportDayKey = referenceDate
      ? this.formatDateKey(referenceDate)
      : this.todayWibKey();

    const reportDate = this.parseLocalDate(reportDayKey);

    if (this.isWeekend(reportDate)) {
      this.logger.log(`${reportDayKey} is weekend — skipping tardiness report`);
      return null;
    }

    if (await this.isActivePublicHoliday(reportDate)) {
      this.logger.log(`${reportDayKey} is public holiday — skipping tardiness report`);
      return null;
    }

    const { start, end } = this.dayBounds(reportDate);
    const tardyRecords = await this.prisma.attendance.findMany({
      where: {
        attendance_date: { gte: start, lt: end },
        is_tardy: true,
        clock_in_time: { not: null },
      },
      select: {
        employee_id: true,
        clock_in_time: true,
        tardiness_minutes: true,
        employee: {
          select: {
            full_name: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { tardiness_minutes: 'desc' },
    });

    const tardyEntries: TardyEmployeeEntry[] = tardyRecords.map((record) => ({
      employee_id: record.employee_id,
      employee_name: record.employee?.full_name ?? 'Karyawan',
      department_name: record.employee?.department?.name ?? null,
      arrival_time: this.formatTimeWib(record.clock_in_time),
      minutes_late: record.tardiness_minutes ?? 0,
    }));

    const payload = this.buildPayload(reportDayKey, tardyEntries);
    await this.emitReportEvent(payload);

    this.logger.log(
      `Daily tardiness report for ${reportDayKey}: ${payload.tardy_count} tardy employee(s) — event emitted`,
    );

    return payload;
  }

  buildPayload(
    reportDayKey: string,
    tardyEntries: TardyEmployeeEntry[],
  ): DailyTardinessReportPayload {
    const tardyCount = tardyEntries.length;
    return {
      report_type: 'daily_tardiness',
      report_date: reportDayKey,
      tardy_count: tardyCount,
      no_tardiness: tardyCount === 0,
      tardy_employees: tardyEntries,
      public_tardiness_title: `Laporan Keterlambatan Harian (${reportDayKey})`,
      public_tardiness_content: this.buildPublicAnnouncementContent(reportDayKey, tardyEntries),
      hr_recap_title: `Rekap Keterlambatan HR (${reportDayKey})`,
      hr_recap_content: this.buildHrRecapContent(reportDayKey, tardyEntries),
      positive_title: `Apresiasi Kehadiran (${reportDayKey})`,
      positive_content: this.buildPositiveAcknowledgmentContent(reportDayKey),
    };
  }

  private async emitReportEvent(payload: DailyTardinessReportPayload): Promise<void> {
    const event: Partial<TaraEvent> = {
      event_type: 'report.daily_tardiness',
      event_version: '1.0',
      event_timestamp: new Date(),
      actor: { id: 'tardiness_report_service', type: 'agent' },
      entity: { id: payload.report_date, type: 'tardiness_report' },
      payload,
      metadata: { source: 'tardiness_report_service' },
    };

    await this.eventBusService.emit(event as TaraEvent);

    await this.eventBusService.emit({
      ...event,
      event_type: 'report.tardiness_generated',
    } as TaraEvent);

    await this.eventBusService.emit({
      ...event,
      event_type: 'announcement.tardiness_published',
      payload: {
        ...payload,
        public_recipients_count: null,
      },
    } as TaraEvent);
  }

  private buildPublicAnnouncementContent(
    reportDayKey: string,
    entries: TardyEmployeeEntry[],
  ): string {
    const lines: string[] = [];
    lines.push(`Laporan Keterlambatan untuk tanggal ${reportDayKey}.`);
    lines.push('');
    lines.push(
      `Berikut ${entries.length} karyawan yang tercatat terlambat hari ini:`,
    );
    lines.push('');
    for (const entry of entries) {
      lines.push(
        `- ${entry.employee_name}: tiba pukul ${entry.arrival_time} WIB ` +
          `(terlambat ${entry.minutes_late} menit).`,
      );
    }
    return lines.join('\n');
  }

  private buildHrRecapContent(reportDayKey: string, entries: TardyEmployeeEntry[]): string {
    const totalMinutesLate = entries.reduce((sum, entry) => sum + entry.minutes_late, 0);
    const lines: string[] = [];
    lines.push(`Rekap Keterlambatan HR untuk tanggal ${reportDayKey}.`);
    lines.push('');
    lines.push(
      `Total karyawan terlambat: ${entries.length}. ` +
        `Total akumulasi keterlambatan: ${totalMinutesLate} menit.`,
    );
    lines.push('');
    lines.push('Rincian:');
    for (const entry of entries) {
      const dept = entry.department_name ? ` [${entry.department_name}]` : '';
      lines.push(
        `- ${entry.employee_name}${dept}: tiba pukul ${entry.arrival_time} WIB ` +
          `(terlambat ${entry.minutes_late} menit).`,
      );
    }
    return lines.join('\n');
  }

  private buildPositiveAcknowledgmentContent(reportDayKey: string): string {
    const lines: string[] = [];
    lines.push(`Kabar baik untuk tanggal ${reportDayKey}!`);
    lines.push('');
    lines.push(
      'Tidak ada karyawan yang tercatat terlambat hari ini. ' +
        'Terima kasih atas kedisiplinan dan kehadiran tepat waktu seluruh tim. ' +
        'Pertahankan semangat ini!',
    );
    return lines.join('\n');
  }

  private todayWibKey(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: this.TIME_ZONE });
  }

  parseLocalDate(dateStr: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!match) {
      throw new Error(`Invalid date: ${dateStr}`);
    }
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  private dayBounds(date: Date): { start: Date; end: Date } {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
    return { start, end };
  }

  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  private async isActivePublicHoliday(date: Date): Promise<boolean> {
    const { start, end } = this.dayBounds(date);
    const holiday = await this.prisma.publicHoliday.findFirst({
      where: {
        holiday_date: { gte: start, lt: end },
        is_active: true,
      },
      select: { id: true },
    });
    return holiday !== null;
  }

  private formatTimeWib(date: Date | null | undefined): string {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: this.TIME_ZONE,
    });
  }
}
