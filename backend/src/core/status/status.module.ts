import { Module } from '@nestjs/common';
import { StatusService } from './status.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [StatusService],
  exports: [StatusService],
})
export class StatusModule {}
