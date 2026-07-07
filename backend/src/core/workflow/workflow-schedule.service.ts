import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../../persistence/prisma.service';
import { TardinessReportService } from '../hr/services/tardiness-report.service';
import type { WorkflowGraph } from './workflow.types';

const JOB_PREFIX = 'workflow-schedule-';

@Injectable()
export class WorkflowScheduleService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly tardinessReportService: TardinessReportService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reloadSchedules();
  }

  async reloadSchedules(): Promise<void> {
    this.clearJobs();

    const rows = await this.prisma.workflowDefinition.findMany({
      where: {
        is_active: true,
        published_graph: { not: null },
      },
      select: { id: true, slug: true, name: true, published_graph: true },
    });

    let registered = 0;
    for (const row of rows) {
      const graph = row.published_graph as unknown as WorkflowGraph;
      const trigger = graph.nodes.find((n) => n.type === 'trigger');
      const cronExpr = String(trigger?.data?.scheduleCron ?? '').trim();
      if (!cronExpr) continue;

      const timezone = String(trigger?.data?.scheduleTimezone ?? 'Asia/Jakarta').trim();
      const scheduleAction = String(trigger?.data?.scheduleAction ?? 'generate_tardiness_report');

      const job = new CronJob(
        cronExpr,
        () => {
          void this.runScheduledWorkflow(row.slug, row.name, scheduleAction).catch((err) => {
            this.logger.error(
              `Scheduled workflow "${row.name}" failed: ${err.message}`,
              err.stack,
            );
          });
        },
        null,
        false,
        timezone,
      );

      const jobName = `${JOB_PREFIX}${row.id}`;
      this.schedulerRegistry.addCronJob(jobName, job);
      job.start();
      registered++;
      this.logger.log(
        `Scheduled workflow "${row.name}" (${row.slug}) cron="${cronExpr}" tz=${timezone}`,
      );
    }

    this.logger.log(`Workflow schedules loaded: ${registered} active cron job(s)`);
  }

  private async runScheduledWorkflow(
    slug: string,
    name: string,
    scheduleAction: string,
  ): Promise<void> {
    this.logger.log(`Running scheduled workflow "${name}" (${slug}) action=${scheduleAction}`);

    switch (scheduleAction) {
      case 'generate_tardiness_report':
        await this.tardinessReportService.generateAndEmit();
        break;
      default:
        this.logger.warn(`Unknown scheduleAction "${scheduleAction}" for workflow ${slug}`);
    }
  }

  private clearJobs(): void {
    const existing = this.schedulerRegistry.getCronJobs();
    for (const [name, job] of existing.entries()) {
      if (!name.startsWith(JOB_PREFIX)) continue;
      job.stop();
      this.schedulerRegistry.deleteCronJob(name);
    }
  }
}
