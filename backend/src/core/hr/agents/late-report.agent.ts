import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaraEvent } from '../services/event-bus.service';
import { TardinessReportService } from '../services/tardiness-report.service';

/**
 * Late Report Agent — thin wrapper around TardinessReportService.
 *
 * Scheduled execution and notification delivery are handled by:
 * - WorkflowScheduleService (cron from workflow automation tab)
 * - WorkflowEngineService (report.daily_tardiness event → notification actions)
 */
@Injectable()
export class LateReportAgent {
  private readonly logger = new Logger(LateReportAgent.name);

  constructor(private readonly tardinessReportService: TardinessReportService) {
    this.logger.log('Late Report Agent initialized (workflow-driven)');
  }

  /** Manual / test entry point — same logic as scheduled run. */
  async generateDailyTardinessReport(referenceDate?: Date): Promise<void> {
    await this.tardinessReportService.generateAndEmit(referenceDate);
  }

  @OnEvent('attendance.clock_in')
  async handleAttendanceClockIn(event: TaraEvent | any): Promise<void> {
    const employeeId =
      event?.payload?.employee_id ??
      event?.entity?.id ??
      event?.actor?.id;

    const isTardy = event?.payload?.is_tardy ?? false;
    const tardinessMinutes = event?.payload?.tardiness_minutes ?? 0;

    if (!employeeId) {
      this.logger.warn(
        '[LATE_REPORT] attendance.clock_in received without employee identifier; ignoring',
      );
      return;
    }

    if (isTardy) {
      this.logger.log(
        `[LATE_REPORT] Tardiness detected in real time — employee ${employeeId} ` +
          `is ${tardinessMinutes} minute(s) late. Included in next scheduled report.`,
      );
    }
  }
}
