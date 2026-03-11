import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LoggerController } from './logger.controller';
import { PersistenceModule } from '../../persistence/persistence.module';

@Global()
@Module({
  imports: [PersistenceModule],
  providers: [LoggerService],
  controllers: [LoggerController],
  exports: [LoggerService],
})
export class LoggerModule {}
