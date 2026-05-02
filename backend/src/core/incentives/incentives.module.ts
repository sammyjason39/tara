import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { IncentivesService } from './incentives.service';
import { IncentivesListener } from './listeners/incentives.listener';
import { IncentivesController } from './incentives.controller';
import { FinanceModule } from '../finance/finance.module';
import { HRModule } from '../hr/hr.module';

@Module({
  imports: [
    FinanceModule,
    HRModule,
  ],
  providers: [IncentivesService, IncentivesListener, PrismaService],
  controllers: [IncentivesController],
  exports: [IncentivesService],
})
export class IncentivesModule {}
