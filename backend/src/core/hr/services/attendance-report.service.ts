import { BadRequestException, Injectable } from '@nestjs/common';
import { eachDayOfInterval, format } from 'date-fns';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../../persistence/prisma.service';

export type AttendanceMatrixCell = {
  status: 'present' | 'tardy' | 'absent' | 'partial';
  label: string;
  clock_in: string | null;
  clock_out: string | null;
};

@Injectable()
export class AttendanceReportService {
  constructor(private readonly prisma: PrismaService) {}

  parseLocalDate(dateStr: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!match) {
      throw new BadRequestException('Format tanggal tidak valid (gunakan YYYY-MM-DD)');
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(year, month - 1, day);
  }

  private formatTimeWib(value: Date | null | undefined): string | null {
    if (!value) return null;
    return value.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });
  }

  private dateKey(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  private dateKeyFromDb(date: Date): string {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  }

  async buildMatrix(startDate: string, endDate: string) {
    const start = this.parseLocalDate(startDate);
    const end = this.parseLocalDate(endDate);
    if (end < start) {
      throw new BadRequestException('Tanggal akhir harus sama atau setelah tanggal mulai');
    }

    const days = eachDayOfInterval({ start, end });
    if (days.length > 62) {
      throw new BadRequestException('Rentang maksimal 62 hari per laporan');
    }

    const dayKeys = days.map((d) => this.dateKey(d));

    const [employees, records] = await Promise.all([
      this.prisma.employee.findMany({
        where: { employment_status: 'active' },
        include: {
          department: { select: { name: true } },
        },
        orderBy: { full_name: 'asc' },
      }),
      this.prisma.attendance.findMany({
        where: {
          attendance_date: { gte: start, lte: end },
        },
        select: {
          employee_id: true,
          attendance_date: true,
          clock_in_time: true,
          clock_out_time: true,
          is_tardy: true,
          tardiness_minutes: true,
        },
      }),
    ]);

    const recordMap = new Map<string, (typeof records)[number]>();
    for (const row of records) {
      const key = `${row.employee_id}:${this.dateKeyFromDb(row.attendance_date)}`;
      recordMap.set(key, row);
    }

    const rows = employees.map((emp) => {
      const dayCells: Record<string, AttendanceMatrixCell> = {};
      for (const dayKey of dayKeys) {
        const rec = recordMap.get(`${emp.id}:${dayKey}`);
        if (!rec || !rec.clock_in_time) {
          dayCells[dayKey] = { status: 'absent', label: '—', clock_in: null, clock_out: null };
          continue;
        }

        const clockIn = this.formatTimeWib(rec.clock_in_time);
        const clockOut = this.formatTimeWib(rec.clock_out_time);
        let label = clockIn ?? 'H';
        if (rec.is_tardy) {
          label = `${clockIn ?? 'H'} (T${rec.tardiness_minutes ?? 0}m)`;
        }
        if (clockOut) {
          label = `${clockIn ?? '—'} - ${clockOut}`;
        }

        dayCells[dayKey] = {
          status: rec.is_tardy ? 'tardy' : rec.clock_out_time ? 'present' : 'partial',
          label,
          clock_in: clockIn,
          clock_out: clockOut,
        };
      }

      return {
        employee_id: emp.id,
        employee_code: emp.employee_code,
        full_name: emp.full_name,
        department: emp.department?.name ?? null,
        days: dayCells,
      };
    });

    return {
      start_date: startDate,
      end_date: endDate,
      day_keys: dayKeys,
      rows,
    };
  }

  async exportWorkbook(startDate: string, endDate: string): Promise<Buffer> {
    const matrix = await this.buildMatrix(startDate, endDate);

    const header = [
      'Kode',
      'Nama Karyawan',
      'Departemen',
      ...matrix.day_keys.map((d) => format(this.parseLocalDate(d), 'dd/MM')),
    ];

    const dataRows = matrix.rows.map((row) => [
      row.employee_code ?? '',
      row.full_name,
      row.department ?? '',
      ...matrix.day_keys.map((d) => row.days[d]?.label ?? '—'),
    ]);

    const sheet = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    sheet['!cols'] = [
      { wch: 12 },
      { wch: 28 },
      { wch: 18 },
      ...matrix.day_keys.map(() => ({ wch: 14 })),
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Absensi');

    const meta = [
      ['Laporan Absensi TARA'],
      ['Periode', `${matrix.start_date} s/d ${matrix.end_date}`],
      ['Keterangan', 'H = hadir (jam masuk), T = terlambat, — = tidak ada data'],
      [],
    ];
    const metaSheet = XLSX.utils.aoa_to_sheet(meta);
    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Info');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
