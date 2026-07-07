import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HrModule } from '../hr/hr.module';
import { WorkflowController } from './workflow.controller';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowNodeExecutorService } from './workflow-node-executor.service';
import { WorkflowSeedService } from './workflow-seed.service';
import { WorkflowContextService } from './workflow-context.service';

@Module({
  imports: [AuthModule, forwardRef(() => HrModule)],
  controllers: [WorkflowController],
  providers: [
    WorkflowDefinitionService,
    WorkflowEngineService,
    WorkflowNodeExecutorService,
    WorkflowSeedService,
    WorkflowContextService,
  ],
  exports: [WorkflowEngineService, WorkflowDefinitionService],
})
export class WorkflowModule {}
