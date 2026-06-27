import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { AiConfigService } from './ai-config.service';
import { AiPendingActionType } from './ai.interfaces';

@Injectable()
export class AiPendingActionService {
  private readonly logger = new Logger(AiPendingActionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: AiConfigService,
  ) {}

  async create(params: {
    employeeId: string;
    sessionId?: string;
    actionType: AiPendingActionType;
    payload: Record<string, any>;
    summary: string;
  }) {
    await this.cancelPending(params.employeeId);

    const config = this.configService.getAiConfig();
    const expiresAt = new Date(
      Date.now() + config.confirmationTimeoutMinutes * 60 * 1000,
    );

    return this.prisma.aiPendingAction.create({
      data: {
        employee_id: params.employeeId,
        session_id: params.sessionId,
        action_type: params.actionType,
        payload: params.payload,
        summary: params.summary,
        expires_at: expiresAt,
      },
    });
  }

  async getActive(employeeId: string) {
    await this.expireStale(employeeId);

    return this.prisma.aiPendingAction.findFirst({
      where: { employee_id: employeeId, status: 'pending' },
      orderBy: { created_at: 'desc' },
    });
  }

  async markExecuted(id: string) {
    return this.prisma.aiPendingAction.update({
      where: { id },
      data: { status: 'executed', executed_at: new Date() },
    });
  }

  async cancelPending(employeeId: string) {
    await this.prisma.aiPendingAction.updateMany({
      where: { employee_id: employeeId, status: 'pending' },
      data: { status: 'cancelled' },
    });
  }

  async expireStale(employeeId?: string) {
    const where: any = {
      status: 'pending',
      expires_at: { lt: new Date() },
    };
    if (employeeId) where.employee_id = employeeId;

    const result = await this.prisma.aiPendingAction.updateMany({
      where,
      data: { status: 'expired' },
    });

    if (result.count > 0) {
      this.logger.debug(`Expired ${result.count} pending AI actions`);
    }
  }

  isConfirmationMessage(text: string): boolean {
    const normalized = text.trim().toUpperCase();
    return ['YA', 'YES', 'SETUJU', 'OK', 'OKE', 'CONFIRM'].includes(normalized);
  }

  isCancellationMessage(text: string): boolean {
    const normalized = text.trim().toUpperCase();
    return ['TIDAK', 'BATAL', 'CANCEL', 'NO', 'TOLAK'].includes(normalized);
  }

  parseButtonAction(content: string): string | null {
    const match = content.match(/^\[button:([^\]]+)\]/);
    return match ? match[1] : null;
  }
}
