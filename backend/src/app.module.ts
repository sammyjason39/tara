import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { PersistenceModule } from './persistence/persistence.module';
import { AuthModule } from './core/auth/auth.module';
import { SettingsModule } from './core/settings/settings.module';
import { HrModule } from './core/hr/hr.module';
import { DemoModule } from './core/demo/demo.module';
import { SopModule } from './core/sop/sop.module';
import { AiModule } from './core/ai/ai.module';
import { StatusModule } from './core/status/status.module';
import { WorkflowModule } from './core/workflow/workflow.module';

const demoEnabled = process.env.DEMO_MODE === 'true';

/**
 * TARA HR System v2 — Root Module
 * DemoModule only loads when DEMO_MODE=true (mock data without DB).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    PersistenceModule,
    ...(demoEnabled ? [DemoModule] : []),
    AuthModule,
    SettingsModule,
    SopModule,    // SOP document management with PDF storage
    AiModule,     // TARA AI Assistant (LangChain + RAG + WhatsApp)
    StatusModule, // Public status page probes & history
    HrModule,     // HR + WhatsApp local MVP
    WorkflowModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
