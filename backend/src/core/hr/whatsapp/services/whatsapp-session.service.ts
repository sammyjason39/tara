import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../../persistence/prisma.service';

/**
 * WhatsApp Session Service — manages conversation sessions.
 *
 * A session groups messages into a logical conversation flow.
 * Sessions auto-close after 30 minutes of inactivity.
 */
@Injectable()
export class WhatsAppSessionService {
  private readonly logger = new Logger(WhatsAppSessionService.name);
  private readonly SESSION_TIMEOUT_MINUTES = 30;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create an active session for an employee.
   * If no active session exists, creates a new one.
   */
  async getOrCreateSession(employeeId: string, hermesAgentId?: string): Promise<string> {
    // Look for an active or idle session
    const existing = await this.prisma.whatsAppSession.findFirst({
      where: {
        employee_id: employeeId,
        status: { in: ['active', 'idle'] },
      },
      orderBy: { last_activity_at: 'desc' },
    });

    if (existing) {
      // Reactivate if idle
      if (existing.status === 'idle') {
        await this.prisma.whatsAppSession.update({
          where: { id: existing.id },
          data: { status: 'active', last_activity_at: new Date() },
        });
      }
      return existing.id;
    }

    // Create new session
    const session = await this.prisma.whatsAppSession.create({
      data: {
        employee_id: employeeId,
        hermes_agent_id: hermesAgentId,
        status: 'active',
      },
    });

    this.logger.log(`[SESSION] New session created: ${session.id} for employee ${employeeId}`);
    return session.id;
  }

  /**
   * Record activity on a session (called when a message is sent/received).
   */
  async recordActivity(sessionId: string): Promise<void> {
    await this.prisma.whatsAppSession.update({
      where: { id: sessionId },
      data: {
        last_activity_at: new Date(),
        message_count: { increment: 1 },
        status: 'active',
      },
    });
  }

  /**
   * Close a session explicitly.
   */
  async closeSession(sessionId: string): Promise<void> {
    await this.prisma.whatsAppSession.update({
      where: { id: sessionId },
      data: {
        status: 'closed',
        ended_at: new Date(),
      },
    });

    this.logger.log(`[SESSION] Session closed: ${sessionId}`);
  }

  /**
   * Get active session for an employee (if any).
   */
  async getActiveSession(employeeId: string) {
    return this.prisma.whatsAppSession.findFirst({
      where: {
        employee_id: employeeId,
        status: 'active',
      },
      orderBy: { last_activity_at: 'desc' },
    });
  }

  /**
   * Get session history for an employee.
   */
  async getSessionHistory(employeeId: string, limit = 20) {
    return this.prisma.whatsAppSession.findMany({
      where: { employee_id: employeeId },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: { _count: { select: { messages: true } } },
    });
  }

  /**
   * Cron: Auto-close idle sessions (every 5 minutes).
   * Sessions with no activity for 30 minutes are marked 'idle',
   * those idle for another 30 minutes are closed.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSessionTimeouts(): Promise<void> {
    const now = new Date();
    const idleThreshold = new Date(now.getTime() - this.SESSION_TIMEOUT_MINUTES * 60 * 1000);
    const closeThreshold = new Date(now.getTime() - this.SESSION_TIMEOUT_MINUTES * 2 * 60 * 1000);

    // Mark active sessions as idle
    const idled = await this.prisma.whatsAppSession.updateMany({
      where: {
        status: 'active',
        last_activity_at: { lt: idleThreshold },
      },
      data: { status: 'idle' },
    });

    // Close idle sessions that have been idle too long
    const closed = await this.prisma.whatsAppSession.updateMany({
      where: {
        status: 'idle',
        last_activity_at: { lt: closeThreshold },
      },
      data: { status: 'closed', ended_at: now },
    });

    if (idled.count > 0 || closed.count > 0) {
      this.logger.log(
        `[SESSION] Timeout sweep: ${idled.count} → idle, ${closed.count} → closed`,
      );
    }
  }
}
