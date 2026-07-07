import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { HrModule } from '../hr/hr.module';
import { WorkflowController } from './workflow.controller';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowNodeExecutorService } from './workflow-node-executor.service';
import { WorkflowSeedService } from './workflow-seed.service';
import { WorkflowContextService } from './workflow-context.service';
import { WorkflowScheduleService } from './workflow-schedule.service';

@Module({
  imports: [AuthModule, ScheduleModule, forwardRef(() => HrModule)],
  controllers: [WorkflowController],
  providers: [
    WorkflowDefinitionService,
    WorkflowEngineService,
    WorkflowNodeExecutorService,
    WorkflowSeedService,
    WorkflowContextService,
    WorkflowScheduleService,
  ],
  exports: [WorkflowEngineService, WorkflowDefinitionService, WorkflowScheduleService],
})
export class WorkflowModule {}
