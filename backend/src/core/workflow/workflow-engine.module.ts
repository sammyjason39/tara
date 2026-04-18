import { Module } from '@nestjs/common';
import { WorkflowOrchestratorService } from './workflow-orchestrator.service';
import { EventBusService } from '../../shared/events/event-bus.service';
import { PrismaService } from '../../persistence/prisma.service';
import { WorkflowController } from './workflow.controller';

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowOrchestratorService, EventBusService, PrismaService],
  exports: [WorkflowOrchestratorService],
})
export class WorkflowEngineModule {}
