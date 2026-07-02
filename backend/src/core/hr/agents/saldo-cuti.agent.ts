import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../persistence/prisma.service';
import { toLeaveDays, LeaveDaysInput } from '../../../shared/utils/leave-days.util';
import {
  NotificationService,
  TaraNotificationType,
} from '../services/notification.service';
import { EventBusService, TaraEvent } from '../services/event-bus.service';

/**
 * A single upcoming approved leave entry returned alongside the balance.
 */
export interface UpcomingLeave {
  leave_request_id: string;
  leave_type: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  total_days: number;
}

/**
 * Real-time leave balance snapshot for a single employee and year.
 *
 * Mirrors the LEAVE_BALANCE data model (Req 7.2) and includes the list of
 * upcoming approved leave dates (Req 7.3).
 */
export interface LeaveBalanceResult {
  employee_id: string;
  year: number;
  /** Whether a balance record exists for this employee/year. */
  has_balance: boolean;
  total_entitlement: number;
  used_days: number;
  remaining_days: number;
  carryover_days: number;
  carryover_expiry_date: string | null;
  /** Approved leave whose start date is today or later, ordered by start date. */
  upcoming_leave: UpcomingLeave[];
  /** ISO timestamp the snapshot was produced (for freshness/SLA tracking). */
  retrieved_at: string;

  // --- Derived calculation fields (Task 18.3, Req 7.6 / 7.7) ---
  /**
   * Total approved leave days for the year, derived live by summing every
   * approved LeaveRequest.total_days whose start_date falls in `year`
   * (Req 7.6 - balance is calculated from approved leave requests).
   */
  computed_used_days: number;
  /**
   * Carryover days that are still valid (not expired). Equal to
   * `carryover_days` when `carryover_expiry_date` is null or today <= expiry,
   * otherwise 0 (Req 7.7 - carryover expiration rules).
   */
  carryover_valid_days: number;
  /** True when carryover existed but its expiry date has already passed. */
  carryover_expired: boolean;
  /**
   * Authoritative available balance accounting for expired carryover:
   * total_entitlement + carryover_valid_days - computed_used_days.
   * Never negative.
   */
  available_balance: number;
  /**
   * Cross-check flag: true when the stored `used_days` matches the live
   * `computed_used_days`. A false value indicates the persisted balance has
   * drifted from the approved leave records and should be recalculated.
   */
  reconciled: boolean;
}

/**
 * Result of the on-demand balance calculation (Task 18.3).
 *
 * Derived purely from the employee's own data (their stored LeaveBalance and
 * their approved LeaveRequest rows) and therefore safe to return only to the
 * requesting employee (Req 7.8 privacy).
 */
export interface ComputedLeaveBalance {
  employee_id: string;
  year: number;
  has_balance: boolean;
  total_entitlement: number;
  /** Raw carryover days as stored on the balance record. */
  carryover_days: number;
  /** Carryover days that still count toward the balance (0 if expired). */
  carryover_valid_days: number;
  carryover_expired: boolean;
  carryover_expiry_date: string | null;
  /** Live sum of approved leave days for the year. */
  computed_used_days: number;
  /** used_days persisted on the LeaveBalance record. */
  stored_used_days: number;
  /** remaining_days persisted on the LeaveBalance record. */
  stored_remaining_days: number;
  /** total_entitlement + carryover_valid_days - computed_used_days (>= 0). */
  available_balance: number;
  /** True when stored used_days equals the live computed_used_days. */
  reconciled: boolean;
}

/**
 * Saldo Cuti Agent (Leave Balance Agent)
 *
 * Autonomous service for TARA HR System that provides employees with their
 * leave balance information in real time, removing the need to contact HR for
 * a manual confirmation.
 *
 * This task (18.1) implements the real-time balance query. Task 18.2 adds the
 * scheduled monthly leave balance recap delivered privately to each employee.
 * Task 18.3 adds the balance calculation logic: deriving used days from
 * approved leave requests, applying carryover expiration rules, exposing an
 * authoritative available balance, and reconciling against the stored record.
 *
 * Requirements:
 * - 7.1: Retrieve the current Leave_Balance in real-time within 5 seconds
 * - 7.2: Display remaining annual leave days, used days, and total entitlement
 * - 7.3: Show upcoming approved leave dates
 * - 7.4: Generate a monthly leave balance recap for each Employee
 * - 7.5: Send the monthly recap to the Employee via Private_Notification
 * - 7.6: Calculate Leave_Balance from total entitlement minus approved leave
 * - 7.7: Be accessible 24/7 (on-demand, no time-window, no scheduled dependency)
 * - 7.8: Provide leave balance only to the requesting Employee (private)
 *
 * ### 24/7 accessibility (Req 7.7)
 * Every read path ({@link queryLeaveBalance}, {@link computeBalance}) is a pure
 * on-demand database read keyed by `employeeId`. There is no time-of-day guard,
 * no business-hours window, and no dependency on the monthly @Cron job: the
 * scheduled recap merely *reuses* the same query, it is never a prerequisite
 * for answering a query. A balance can therefore be retrieved at any hour.
 *
 * ### Privacy (Req 7.8)
 * Both read paths accept a single `employeeId` and filter every query by that
 * id (`employee_id_year` unique key for the balance, `employee_id` predicate
 * for leave requests). The derived result is computed solely from that
 * employee's own rows, so no other employee's balance can be returned. Callers
 * must pass the authenticated employee's own id; the agent never queries across
 * employees on a balance request.
 *
 * Design: Task 18.1 / 18.2 / 18.3 - Real-time leave balance query + monthly
 * recap + carryover-aware balance calculation
 */
@Injectable()
export class SaldoCutiAgent {
  private readonly logger = new Logger(SaldoCutiAgent.name);
  private readonly TIME_ZONE = 'Asia/Jakarta'; // WIB (UTC+7)

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBusService: EventBusService,
    private readonly notificationService: NotificationService,
  ) {
    this.logger.log('Saldo Cuti Agent initialized');
  }

  /**
   * Retrieve an employee's current leave balance together with their upcoming
   * approved leave dates.
   *
   * The query is designed to be instant (Req 7.1): the balance lookup uses the
   * `employee_id_year` unique index and the upcoming-leave lookup uses the
   * existing `employee_id` / `start_date` indexes on `leave_requests`. Both run
   * concurrently so total latency is bounded by the slower single indexed read.
   *
   * @param employeeId - The employee whose balance to retrieve
   * @param year - Calendar year of the balance (defaults to the current year)
   * @returns Remaining/used/total entitlement plus upcoming approved leave
   */
  async queryLeaveBalance(
    employeeId: string,
    year?: number,
  ): Promise<LeaveBalanceResult> {
    const targetYear = year ?? new Date().getFullYear();

    // Today at 00:00 local time. Approved leave starting today or later counts
    // as "upcoming" (Req 7.3).
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Bounds of the target calendar year [Jan 1, next Jan 1) used to sum the
    // approved leave that has been taken/booked for the year (Req 7.6).
    const yearStart = new Date(targetYear, 0, 1);
    const yearEnd = new Date(targetYear + 1, 0, 1);

    // Run the indexed reads concurrently to minimise latency (Req 7.1). All are
    // scoped to this single employee_id, enforcing privacy (Req 7.8).
    const [balance, upcomingRequests, approvedYearRequests] = await Promise.all(
      [
        this.prisma.leaveBalance.findUnique({
          where: {
            employee_id_year: {
              employee_id: employeeId,
              year: targetYear,
            },
          },
          select: {
            total_entitlement: true,
            used_days: true,
            remaining_days: true,
            carryover_days: true,
            carryover_expiry_date: true,
          },
        }),
        this.prisma.leaveRequest.findMany({
          where: {
            employee_id: employeeId,
            status: 'approved',
            start_date: { gte: today },
          },
          select: {
            id: true,
            leave_type: true,
            start_date: true,
            end_date: true,
            total_days: true,
          },
          orderBy: { start_date: 'asc' },
        }),
        // Req 7.6: every approved leave request whose start date falls in the
        // target year, used to derive the live used-days figure.
        this.prisma.leaveRequest.findMany({
          where: {
            employee_id: employeeId,
            status: 'approved',
            start_date: { gte: yearStart, lt: yearEnd },
          },
          select: { total_days: true },
        }),
      ],
    );

    const upcoming_leave: UpcomingLeave[] = upcomingRequests.map((req) => ({
      leave_request_id: req.id,
      leave_type: req.leave_type,
      start_date: this.formatDate(req.start_date),
      end_date: this.formatDate(req.end_date),
      total_days: toLeaveDays(req.total_days),
    }));

    // Derive used days from the approved requests and apply carryover rules.
    const approvedDaysInYear = this.sumTotalDays(approvedYearRequests);
    const derived = this.deriveBalance({
      totalEntitlement: toLeaveDays(balance?.total_entitlement),
      carryoverDays: toLeaveDays(balance?.carryover_days),
      carryoverExpiryDate: balance?.carryover_expiry_date ?? null,
      storedUsedDays: toLeaveDays(balance?.used_days),
      approvedDaysInYear,
    });

    if (balance && !derived.reconciled) {
      // Req 7.6: surface drift between the persisted balance and the live
      // approved-leave total so it can be recalculated. Best-effort log only.
      this.logger.warn(
        `Leave balance drift for employee ${employeeId} (${targetYear}): ` +
          `stored used_days=${balance.used_days}, computed=${approvedDaysInYear}`,
      );
    }

    const result: LeaveBalanceResult = {
      employee_id: employeeId,
      year: targetYear,
      // Edge case: no balance record yet -> report zeroed entitlement (Req 7.2).
      has_balance: balance !== null,
      total_entitlement: toLeaveDays(balance?.total_entitlement),
      used_days: toLeaveDays(balance?.used_days),
      remaining_days: toLeaveDays(balance?.remaining_days),
      carryover_days: toLeaveDays(balance?.carryover_days),
      carryover_expiry_date: balance?.carryover_expiry_date
        ? this.formatDate(balance.carryover_expiry_date)
        : null,
      upcoming_leave,
      retrieved_at: new Date().toISOString(),
      // Task 18.3 derived fields.
      computed_used_days: derived.computedUsedDays,
      carryover_valid_days: derived.carryoverValidDays,
      carryover_expired: derived.carryoverExpired,
      available_balance: derived.availableBalance,
      reconciled: derived.reconciled,
    };

    // Emit a query event for monitoring / downstream consumers. Best-effort:
    // event emission must never block or fail the real-time query (Req 7.1).
    await this.emitQueryEvent(result);

    return result;
  }

  /**
   * Calculate an employee's leave balance on demand from their own data
   * (Task 18.3).
   *
   * The balance is derived from first principles rather than trusted blindly
   * from the stored record:
   * - `computed_used_days` = sum of every approved LeaveRequest.total_days whose
   *   start date falls in `year` (Req 7.6 - calculated from approved requests).
   * - `carryover_valid_days` = stored carryover, but only while it has not
   *   expired (Req 7.7 - today must be on or before carryover_expiry_date).
   * - `available_balance` = total_entitlement + carryover_valid_days -
   *   computed_used_days, never negative.
   * - `reconciled` cross-checks the live used-days figure against the persisted
   *   `used_days` so drift can be detected.
   *
   * This is a pure on-demand read (no time-window, no scheduled dependency) so
   * it satisfies 24/7 access (Req 7.7), and it is scoped to a single
   * `employeeId` so it only ever exposes that employee's balance (Req 7.8).
   *
   * @param employeeId - The employee whose balance to calculate
   * @param year - Calendar year (defaults to the current year)
   */
  async computeBalance(
    employeeId: string,
    year?: number,
  ): Promise<ComputedLeaveBalance> {
    const targetYear = year ?? new Date().getFullYear();
    const yearStart = new Date(targetYear, 0, 1);
    const yearEnd = new Date(targetYear + 1, 0, 1);

    // Both reads are scoped to this employee only (Req 7.8 privacy).
    const [balance, approvedYearRequests] = await Promise.all([
      this.prisma.leaveBalance.findUnique({
        where: {
          employee_id_year: { employee_id: employeeId, year: targetYear },
        },
        select: {
          total_entitlement: true,
          used_days: true,
          remaining_days: true,
          carryover_days: true,
          carryover_expiry_date: true,
        },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          employee_id: employeeId,
          status: 'approved',
          start_date: { gte: yearStart, lt: yearEnd },
        },
        select: { total_days: true },
      }),
    ]);

    const approvedDaysInYear = this.sumTotalDays(approvedYearRequests);
    const derived = this.deriveBalance({
      totalEntitlement: toLeaveDays(balance?.total_entitlement),
      carryoverDays: toLeaveDays(balance?.carryover_days),
      carryoverExpiryDate: balance?.carryover_expiry_date ?? null,
      storedUsedDays: toLeaveDays(balance?.used_days),
      approvedDaysInYear,
    });

    return {
      employee_id: employeeId,
      year: targetYear,
      has_balance: balance !== null,
      total_entitlement: toLeaveDays(balance?.total_entitlement),
      carryover_days: toLeaveDays(balance?.carryover_days),
      carryover_valid_days: derived.carryoverValidDays,
      carryover_expired: derived.carryoverExpired,
      carryover_expiry_date: balance?.carryover_expiry_date
        ? this.formatDate(balance.carryover_expiry_date)
        : null,
      computed_used_days: derived.computedUsedDays,
      stored_used_days: toLeaveDays(balance?.used_days),
      stored_remaining_days: toLeaveDays(balance?.remaining_days),
      available_balance: derived.availableBalance,
      reconciled: derived.reconciled,
    };
  }

  /**
   * Pure balance calculation (Task 18.3). Kept side-effect free so it is
   * trivially testable and reusable by both {@link queryLeaveBalance} and
   * {@link computeBalance}.
   *
   * Carryover expiration rule (Req 7.7): carryover only counts toward the
   * available balance while `today <= carryover_expiry_date`. A null expiry
   * date is treated as "no expiration" and the carryover always counts.
   *
   * @param now - injectable clock for deterministic testing (defaults to now)
   */
  private deriveBalance(params: {
    totalEntitlement: number;
    carryoverDays: number;
    carryoverExpiryDate: Date | null;
    storedUsedDays: number;
    approvedDaysInYear: number;
    now?: Date;
  }): {
    computedUsedDays: number;
    carryoverValidDays: number;
    carryoverExpired: boolean;
    availableBalance: number;
    reconciled: boolean;
  } {
    const {
      totalEntitlement,
      carryoverDays,
      carryoverExpiryDate,
      storedUsedDays,
      approvedDaysInYear,
    } = params;

    // Normalise "today" to start of day so the comparison is date-only: the
    // carryover is still valid on its expiry date itself.
    const today = params.now ? new Date(params.now) : new Date();
    today.setHours(0, 0, 0, 0);

    const hasCarryover = carryoverDays > 0;
    const carryoverExpired =
      hasCarryover &&
      carryoverExpiryDate !== null &&
      this.startOfDay(carryoverExpiryDate).getTime() < today.getTime();
    const carryoverValidDays = carryoverExpired ? 0 : carryoverDays;

    const computedUsedDays = approvedDaysInYear;
    const availableBalance = Math.max(
      0,
      totalEntitlement + carryoverValidDays - computedUsedDays,
    );

    return {
      computedUsedDays,
      carryoverValidDays,
      carryoverExpired,
      availableBalance,
      reconciled: storedUsedDays === computedUsedDays,
    };
  }

  /** Sum the total_days across a list of leave-request rows. */
  private sumTotalDays(rows: Array<{ total_days: LeaveDaysInput }>): number {
    return rows.reduce((sum, row) => sum + toLeaveDays(row.total_days), 0);
  }

  /** Return a copy of the date normalised to 00:00 local time. */
  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Scheduled task: generate and privately deliver the monthly leave balance
   * recap for every active employee.
   *
   * Runs on the 1st day of each month at 08:00 WIB. For each active employee it
   * reuses {@link queryLeaveBalance} to build the current-year balance snapshot
   * and sends it as a Private_Notification (LEAVE_BALANCE_RECAP) so the recap is
   * visible only to that employee (Req 7.5 / privacy rules). Per-employee sends
   * are isolated so a single failure never aborts the batch, and the top-level
   * run swallows errors so a scheduled execution can never crash.
   *
   * @param year Optional explicit balance year. Defaults to the current WIB
   *   year. Primarily used for manual invocation and testing.
   *
   * Requirements: 7.4, 7.5
   */
  @Cron('0 8 1 * *', { timeZone: 'Asia/Jakarta' }) // 08:00 WIB, 1st of month
  async sendMonthlyRecap(year?: number): Promise<void> {
    this.logger.log(
      'Generating monthly leave balance recap (1st 08:00 WIB)',
    );

    try {
      const targetYear = year ?? this.nowWIB().getFullYear();

      const employees = await this.prisma.employee.findMany({
        where: { employment_status: 'active' },
        select: { id: true, full_name: true },
      });

      if (employees.length === 0) {
        this.logger.warn('No active employees found for monthly leave recap');
        return;
      }

      let sent = 0;
      for (const employee of employees) {
        try {
          // Req 7.4: build the per-employee balance recap, reusing the
          // real-time query so the recap reflects the same source of truth.
          const balance = await this.queryLeaveBalance(employee.id, targetYear);
          const content = this.buildMonthlyRecapContent(
            employee.full_name,
            balance,
          );

          // Req 7.5: deliver privately to the employee only. The
          // LEAVE_BALANCE_RECAP type is PRIVATE by the notification privacy
          // rules, so only the recipient employee can see it.
          await this.notificationService.sendPrivateNotification({
            recipient_id: employee.id,
            type: TaraNotificationType.LEAVE_BALANCE_RECAP,
            title: `Rekap Saldo Cuti ${targetYear}`,
            content,
            metadata: {
              recap_type: 'monthly_leave_balance',
              year: targetYear,
              has_balance: balance.has_balance,
              total_entitlement: balance.total_entitlement,
              used_days: balance.used_days,
              remaining_days: balance.remaining_days,
              carryover_days: balance.carryover_days,
              carryover_expiry_date: balance.carryover_expiry_date,
              upcoming_leave: balance.upcoming_leave,
            },
          });
          sent++;
        } catch (error: any) {
          // Isolate per-employee failures so one bad record never aborts the
          // whole batch.
          this.logger.error(
            `Failed to send monthly leave recap to employee ${employee.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Monthly leave balance recap (${targetYear}) sent to ` +
          `${sent}/${employees.length} active employee(s)`,
      );

      await this.emitAgentEvent('leave_balance.monthly_recap_sent', {
        year: targetYear,
        recipients_count: sent,
        total_employees: employees.length,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to generate monthly leave balance recap: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Build the human-readable monthly recap content for a single employee.
   *
   * Summarises total entitlement, used and remaining days, any carryover, and
   * upcoming approved leave dates (Req 7.2 / 7.3 / 7.4).
   */
  private buildMonthlyRecapContent(
    fullName: string | null | undefined,
    balance: LeaveBalanceResult,
  ): string {
    const lines: string[] = [];
    lines.push(
      `Halo ${fullName ?? 'Karyawan'}, berikut rekap saldo cuti Anda untuk tahun ${balance.year}.`,
    );
    lines.push('');
    lines.push(`- Total hak cuti: ${balance.total_entitlement} hari`);
    lines.push(`- Cuti terpakai: ${balance.used_days} hari`);
    lines.push(`- Sisa cuti: ${balance.remaining_days} hari`);

    if (balance.carryover_days > 0) {
      const expiry = balance.carryover_expiry_date
        ? ` (berlaku hingga ${balance.carryover_expiry_date})`
        : '';
      lines.push(`- Cuti carryover: ${balance.carryover_days} hari${expiry}`);
    }

    lines.push('');
    if (balance.upcoming_leave.length === 0) {
      lines.push('Anda belum memiliki cuti yang disetujui ke depan.');
    } else {
      lines.push('Cuti yang sudah disetujui mendatang:');
      for (const leave of balance.upcoming_leave) {
        lines.push(
          `- ${leave.leave_type}: ${leave.start_date} s/d ${leave.end_date} ` +
            `(${leave.total_days} hari).`,
        );
      }
    }

    return lines.join('\n');
  }

  /**
   * Emit an agent event to the Event Bus for monitoring / downstream consumers.
   * Failures are swallowed so event emission never blocks the scheduled task.
   */
  private async emitAgentEvent(
    eventType: string,
    payload: Record<string, any>,
  ): Promise<void> {
    try {
      const event: Partial<TaraEvent> = {
        event_type: eventType,
        event_version: '1.0',
        event_timestamp: new Date(),
        actor: {
          id: 'saldo_cuti_agent',
          type: 'agent',
        },
        entity: {
          id: String(payload.year ?? new Date().toISOString()),
          type: 'leave_balance_recap',
        },
        payload,
      };

      await this.eventBusService.emit(event as TaraEvent);
    } catch (error: any) {
      this.logger.error(
        `Failed to emit event ${eventType}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get the current time expressed in WIB (Asia/Jakarta). Used so the recap
   * year is computed against the WIB calendar regardless of server timezone.
   */
  private nowWIB(): Date {
    const now = new Date();
    return new Date(
      now.toLocaleString('en-US', { timeZone: this.TIME_ZONE }),
    );
  }

  /**
   * Emit `leave_balance.query_executed` to the Event Bus. Failures are
   * swallowed so a query is never blocked by event-bus issues.
   */
  private async emitQueryEvent(result: LeaveBalanceResult): Promise<void> {
    try {
      const event: Partial<TaraEvent> = {
        event_type: 'leave_balance.query_executed',
        event_version: '1.0',
        event_timestamp: new Date(),
        actor: {
          id: 'saldo_cuti_agent',
          type: 'agent',
        },
        entity: {
          id: result.employee_id,
          type: 'employee',
        },
        payload: {
          employee_id: result.employee_id,
          year: result.year,
          has_balance: result.has_balance,
          total_entitlement: result.total_entitlement,
          used_days: result.used_days,
          remaining_days: result.remaining_days,
          carryover_days: result.carryover_days,
          upcoming_leave_count: result.upcoming_leave.length,
        },
      };

      await this.eventBusService.emit(event as TaraEvent);
    } catch (error: any) {
      this.logger.error(
        `Failed to emit leave_balance.query_executed event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Format a date as YYYY-MM-DD.
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ---------------------------------------------------------------------------
  // Real-Time Data Sync (Requirement 13.1)
  // ---------------------------------------------------------------------------

  /**
   * React to leave balance updates propagated by the Leave_Request_Agent.
   *
   * When a leave request is approved and the balance is updated, this listener
   * is triggered synchronously (in-process EventEmitter2) ensuring the Saldo
   * Cuti Agent reflects the change within well under the 5-second SLA defined
   * by Requirement 13.1.
   *
   * The handler logs the update and could be extended to invalidate any
   * per-employee cache layer (Redis) in the future. Since the agent reads
   * directly from the database (single source of truth, Req 13.4), the update
   * is inherently available for subsequent queries the instant the transaction
   * commits.
   *
   * @param event - The leave.balance.updated TaraEvent emitted by
   *   LeaveRequestAgent.updateLeaveBalance()
   *
   * Requirements: 13.1 - Leave balance updates propagate to Saldo Cuti Agent
   *   within 5 seconds.
   */
  @OnEvent('leave.balance.updated')
  async handleLeaveBalanceUpdated(event: TaraEvent | any): Promise<void> {
    const employeeId =
      event?.payload?.employee_id ??
      event?.entity?.id ??
      event?.entity_id;

    if (!employeeId) {
      this.logger.warn(
        '[SALDO_CUTI] leave.balance.updated received without employee_id; ignoring',
      );
      return;
    }

    const year = event?.payload?.year ?? new Date().getFullYear();
    const newRemaining = event?.payload?.new_remaining_days;
    const daysDeducted = event?.payload?.days_deducted;

    this.logger.log(
      `[SALDO_CUTI] Leave balance updated for employee ${employeeId} ` +
        `(year=${year}, deducted=${daysDeducted}, remaining=${newRemaining}). ` +
        `Sync complete — subsequent queries will reflect the new balance.`,
    );
  }
}
