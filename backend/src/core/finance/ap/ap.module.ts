import { Module, forwardRef } from '@nestjs/common';
import { FinanceModule } from '../finance.module';
import { VendorDbRepository } from '../repositories/vendor.db.repository';
import { VendorMockRepository } from '../repositories/vendor.mock.repository';
import { getFinanceExecutionMode, FinanceExecutionMode } from '../utils/finance-safety.utils';

function getRepo(dbClass: any, mockClass: any) {
  const mode = getFinanceExecutionMode();
  return mode === FinanceExecutionMode.MOCK ? mockClass : dbClass;
}

@Module({
  imports: [
    forwardRef(() => FinanceModule),
  ],
  providers: [
    {
      provide: 'IVendorRepository',
      useClass: getRepo(VendorDbRepository, VendorMockRepository),
    },
  ],
  exports: [
    'IVendorRepository',
  ],
})
export class ApModule {}
