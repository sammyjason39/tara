import { Module, forwardRef } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { SopModule } from '../sop/sop.module';
import { AuthModule } from '../auth/auth.module';
import { HrModule } from '../hr/hr.module';
import { AiConfigService } from './ai-config.service';
import { AiLogService } from './ai-log.service';
import { AiPendingActionService } from './ai-pending-action.service';
import { EmbeddingService } from './embedding.service';
import { SopIndexerService } from './sop-indexer.service';
import { AiRagService } from './ai-rag.service';
import { AiToolsService } from './ai-tools.service';
import { AiLlmService } from './ai-llm.service';
import { AiActionExecutorService } from './ai-action-executor.service';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { AiMemoryService } from './ai-memory.service';
import { AiAdminController } from './ai-admin.controller';
import { AiCleanupScheduler } from './ai-cleanup.scheduler';
import { HermesDisabledGuard } from './hermes-disabled.guard';

@Module({
  imports: [SettingsModule, SopModule, AuthModule, forwardRef(() => HrModule)],
  controllers: [AiAdminController],
  providers: [
    AiConfigService,
    AiLogService,
    AiPendingActionService,
    EmbeddingService,
    SopIndexerService,
    AiRagService,
    AiToolsService,
    AiLlmService,
    AiActionExecutorService,
    AiOrchestratorService,
    AiCleanupScheduler,
    AiMemoryService,
    HermesDisabledGuard,
  ],
  exports: [
    AiConfigService,
    AiOrchestratorService,
    AiLogService,
    AiMemoryService,
    SopIndexerService,
    HermesDisabledGuard,
  ],
})
export class AiModule {}
