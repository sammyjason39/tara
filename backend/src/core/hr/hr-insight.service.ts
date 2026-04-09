import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { EventBusService, DomainEvent } from '../../shared/events/event-bus.service';
import { PrismaService } from '../../persistence/prisma.service';
import { EVENT_NAMES } from './events/event-names';
import { OrchestrationHook } from '../../shared/orchestration/orchestration.interface';
import { NotificationService } from '../../shared/comms/notification.service';

/**
 * HRInsightService (Stabilized)
 * Phase 1-7 — Intelligent HR Node Stabilization & Recovery
 */
@Injectable()
export class HRInsightService implements OnModuleInit {
  private readonly logger = new Logger(HRInsightService.name);
  private readonly hooks: OrchestrationHook[] = [];

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    @Optional() private readonly orchestrator?: OrchestrationHook,
  ) {
    if (this.orchestrator) this.hooks.push(this.orchestrator);
  }

  onModuleInit() {
    this.eventBus.subscribe(EVENT_NAMES.PAYROLL_EXECUTED, 'HR_INSIGHT_PAYROLL', (event) => this.handlePayrollExecuted(event));
    this.eventBus.subscribe(EVENT_NAMES.FINANCE_PAYROLL_PROCESSED, 'HR_FINANCE_SYNC', (event) => this.handleFinanceContext(event));
    this.eventBus.subscribe(EVENT_NAMES.CLOCK_IN, 'HR_INSIGHT_ATTENDANCE', (event) => this.handleAttendanceEvent(event));
    this.eventBus.subscribe(EVENT_NAMES.CLOCK_OUT, 'HR_INSIGHT_ATTENDANCE', (event) => this.handleAttendanceEvent(event));
    this.eventBus.subscribe(EVENT_NAMES.SCHEDULE_APPROVED, 'HR_INSIGHT_SCHEDULING', (event) => this.handleScheduleEvent(event));
    
    this.logger.log('HRInsightService (Stabilized) initialized.');
  }

  private async handleFinanceContext(event: DomainEvent) {
    const { tenantId, payload } = event;
    await this.prisma.hrContextSnapshot.create({
      data: {


        tenantId,
        metricType: 'FINANCE_PAYROLL_REF',
        timeWindow: 'MONTHLY',
        aggregatedValues: payload,
      },
    });
  }

  /**
   * Main Payroll Analysis with Stability Guards
   */
  private async handlePayrollExecuted(event: DomainEvent) {
    const { tenantId, payload } = event;
    const { totalNet, period } = payload;

    try {
      // --- PHASE 1: FEEDBACK GUARDS & DECAY ---
      const baseline = await this.getAdjustedBaseline(tenantId);
      let threshold = await this.getAdaptiveThreshold(tenantId);

      // --- PHASE 2: DRIFT DETECTION ---
      await this.detectDrift(tenantId, totalNet);

      let isAnomaly = false;
      let diffPercent = 0;

      if (baseline > 0) {
        diffPercent = ((totalNet - baseline) / baseline) * 100;
        if (diffPercent > threshold) isAnomaly = true;
      }

      // --- SUPPRESSION & CROSS-MODULE ---
      if (isAnomaly) {
        const financeContext = await this.prisma.hrContextSnapshot.findFirst({
          where: { 
            tenantId, 
            metricType: 'FINANCE_PAYROLL_REF',
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          },
          orderBy: { createdAt: 'desc' },
        });

        if (financeContext && (financeContext.aggregatedValues as any).runType === 'BONUS') {
          isAnomaly = false;
        }
      }

      // --- PHASE 4: QUALITY CONTROL (Deduplication & Cooldown) ---
      if (isAnomaly) {
        const recentRec = await this.prisma.hrRecommendation.findFirst({
          where: { 
            tenantId, 
            message: { contains: 'payroll deviation' },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24h cooldown
          },
        });

        if (recentRec) {
          this.logger.log(`[AI_QC] Recommendation suppressed due to cooldown.`);
          isAnomaly = false;
        }
      }

      // --- PERSISTENCE ---
      const insight = await this.prisma.hrInsight.create({
        data: {


          tenantId,
          type: 'PAYROLL',
          summary: `Payroll analysis for ${period}. Deviation: ${diffPercent.toFixed(2)}%.`,
          confidence: isAnomaly ? 0.85 : 1.0,
          metadata: { totalNet, baseline, diffPercent },
        },
      });

      // --- PHASE 5: ORCHESTRATION HOOKS ---
      for (const hook of this.hooks) {
        await hook.afterInsight?.(tenantId, insight.id, 'PAYROLL');
      }

      if (isAnomaly) {
        const severity = diffPercent > 50 ? 'HIGH' : 'MEDIUM';
        const confidenceScore = diffPercent > 100 ? 0.95 : 0.8;

        // --- PHASE 4: SCORE FILTER ---
        if (confidenceScore >= 0.7) {
          const recData = {
            tenantId,
            insightId: insight.id,
            message: `Significant payroll deviation: ${diffPercent.toFixed(2)}% increase.`,
            priority: severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
            severity,
            confidenceScore,
            status: 'PENDING',
          };

          for (const hook of this.hooks) {
            await hook.beforeRecommendation?.(tenantId, insight.id, recData);
          }

          await this.prisma.hrRecommendation.create({ data: recData });

          // Notification for stakeholders
          await this.notificationService.createNotification({


            tenantId,
            userId: 'SYSTEM',
            title: `AI Alert: Payroll Deviation`,
            message: recData.message,
            type: 'AI_ANOMALY',
            priority: severity === 'HIGH' ? 'HIGH' : 'NORMAL',
            eventReferenceId: `AI-PAY-${insight.id}`,
          });
        }
      }

      // Update baseline
      await this.prisma.hrContextSnapshot.create({
        data: {


          tenantId,
          metricType: 'PAYROLL',
          timeWindow: 'MONTHLY',
          aggregatedValues: { totalNet, period },
        },
      });

    } catch (error) {
      this.logger.error('Failed to process stabilized payroll insight:', error.stack);
    }
  }

  /**
   * Adaptive Threshold with Bounds & Decay logic
   */
  private async getAdaptiveThreshold(tenantId: string): Promise<number> {
    const floor = 15;
    const cap = 50;
    
    const recentFeedback = await this.prisma.hrRecommendationFeedback.findMany({
      where: { tenantId, actionTaken: 'REJECTED' },
      take: 5,
      orderBy: { timestamp: 'desc' },
    });

    let currentThreshold = 20;

    // Apply Feedback-based increase
    if (recentFeedback.length >= 3) {
      currentThreshold = 35;
    }

    // Apply Decay: If last rejection was > 30 days ago, reduce threshold by 5% per month (gradual reset)
    const lastRejection = recentFeedback[0];
    if (lastRejection) {
      const daysSince = (Date.now() - new Date(lastRejection.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 30) {
        currentThreshold = Math.max(floor, currentThreshold - 5);
        this.logger.log(`[AI_STABILITY] Threshold decayed to ${currentThreshold}% due to inactivity.`);
      }
    }

    return Math.min(cap, Math.max(floor, currentThreshold));
  }

  private async handleAttendanceEvent(event: DomainEvent) {
    const { tenantId, payload, eventType } = event;
    
    // Heuristic 1: Multi-Clock detection (Anomalous pattern)
    if (eventType === EVENT_NAMES.CLOCK_IN) {
      const recentClockIns = await this.prisma.hrAttendanceRecord.count({
        where: {
          tenantId,
          employeeId: payload.employeeId,
          date: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Past hour
        }
      });

      if (recentClockIns > 1) {
        await this.prisma.hrSystemAlert.create({
          data: {


            tenantId,
            type: 'ATTENDANCE_ANOMALY',
            severity: 'LOW',
            message: `Multiple clock-ins detected for employee ${payload.employeeId} within 1 hour.`,
            metadata: { employeeId: payload.employeeId, count: recentClockIns }
          }
        });

        await this.notificationService.createNotification({
          tenantId,
          userId: 'SYSTEM',
          title: "Attendance Anomaly",
          message: `Multiple clock-ins for employee ${payload.employeeId}`,
          type: "AI_ATTENDANCE",
          priority: "NORMAL",
          eventReferenceId: `AI-ATT-${payload.employeeId}`,
        });
      }

      // Heuristic 2: Location Mismatch detection
      const employee = await this.prisma.employee.findUnique({
        where: { id: payload.employeeId },
        select: { locationId: true }
      });

      if (employee && employee.locationId !== payload.locationId) {
        await this.prisma.hrSystemAlert.create({
          data: {


            tenantId,
            type: 'LOCATION_MISMATCH',
            severity: 'MEDIUM',
            message: `Employee ${payload.employeeId} clocked in at unauthorized location ${payload.locationId}. Assigned: ${employee.locationId}`,
            metadata: { employeeId: payload.employeeId, assignedLocation: employee.locationId, actualLocation: payload.locationId }
          }
        });
      }
    }
  }

  private async handleScheduleEvent(event: DomainEvent) {
    const { tenantId, payload } = event;
    
    // Heuristic: Under-coverage detection
    const shifts = await this.prisma.workShift.findMany({
      where: { tenantId, scheduleId: payload.scheduleId }
    });

    if (shifts.length < 5) { // Hypothetical floor for a location
      await this.prisma.hrRecommendation.create({
        data: {


          tenantId,
          message: `Low coverage detected for newly approved schedule ${payload.scheduleId}. Consider adding more shifts.`,
          priority: 'MEDIUM',
          severity: 'MEDIUM',
          confidenceScore: 0.75,
          status: 'PENDING'
        }
      });
    }
  }

  private async getAdjustedBaseline(tenantId: string): Promise<number> {
    const snapshot = await this.prisma.hrContextSnapshot.findFirst({
      where: { tenantId, metricType: 'PAYROLL' },
      orderBy: { createdAt: 'desc' },
    });
    return snapshot ? (snapshot.aggregatedValues as any).totalNet : 0;
  }

  /**
   * Drift Detection: Compare long-term baseline (90d) vs short-term baseline (30d)
   */
  private async detectDrift(tenantId: string, currentValue: number) {
    const longTermSnapshot = await this.prisma.hrContextSnapshot.findFirst({
      where: { 
        tenantId, 
        metricType: 'PAYROLL',
        createdAt: { lte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } // 60-90 days ago
      },
      orderBy: { createdAt: 'desc' },
    });

    if (longTermSnapshot) {
      const longTermVal = (longTermSnapshot.aggregatedValues as any).totalNet;
      const drift = ((currentValue - longTermVal) / longTermVal) * 100;
      
      if (Math.abs(drift) > 15) {
        await this.prisma.hrSystemAlert.create({
          data: {


            tenantId,
            type: 'DRIFT',
            severity: 'MEDIUM',
            message: `Long-term baseline drift detected: payroll has shifted by ${drift.toFixed(2)}% over 60 days.`,
            metadata: { drift, longTermVal, currentValue },
          },
        });

        await this.notificationService.createNotification({
          tenantId,
          userId: 'SYSTEM',
          title: "Baseline Drift Alert",
          message: `Payroll has shifted by ${drift.toFixed(2)}% over 60 days.`,
          type: "AI_DRIFT",
          priority: "HIGH",
          eventReferenceId: `AI-DRIFT-${tenantId}`,
        });
      }
    }
  }
}
