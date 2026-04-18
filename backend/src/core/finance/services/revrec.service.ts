import { Injectable, Logger } from '@nestjs/common';
import { RevRecScheduler } from './revrec-scheduler.service';
import { RevRecSchedule } from '../domain/revrec.interfaces';
import { Prisma } from '@prisma/client';

@Injectable()
export class RevRecService {
  private readonly logger = new Logger(RevRecService.name);
  private readonly schedules = new Map<string, RevRecSchedule>();

  constructor(private readonly scheduler: RevRecScheduler) {}

  /**
   * Handles the activation of a contract by generating its recognition schedule.
   */
  async activateContract(params: {
    tenant_id: string;
    company_id: string;
    contractId: string;
    total_amount: Prisma.Decimal;
    currency: string;
    start_date: Date;
    end_date: Date;
    deferredAccountId: string;
    revenueAccountId: string;
  }): Promise<RevRecSchedule> {
    this.logger.log(`Activating RevRec for Contract ${params.contractId}`);

    // 1. Generate core schedule
    const schedule = await this.scheduler.createSchedule(params);

    // 2. Persist schedule (Mock persistence)
    this.schedules.set(schedule.id, schedule);

    this.logger.log(`Contract ${params.contractId} activated with ${schedule.periods.length} recognition periods.`);
    return schedule;
  }

  async getSchedule(scheduleId: string): Promise<RevRecSchedule | undefined> {
    return this.schedules.get(scheduleId);
  }
}
