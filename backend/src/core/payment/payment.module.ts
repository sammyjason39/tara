import { Module } from "@nestjs/common";
import { useDbPersistence } from "../../shared/persistence.mode";
import { PersistenceModule } from "../../persistence/persistence.module";
import { PaymentController } from "./payment.controller";
import { AdminPaymentController } from "./admin-payment.controller";
import { PaymentService } from "./payment.service";
import { PaymentDbRepository } from "./repositories/payment.db.repository";
import { PaymentMockRepository } from "./repositories/payment.mock.repository";
import { IPaymentRepository } from "./repositories/payment.repository.interface";
import { StripeAdapter } from "./adapters/stripe.adapter";
import { XenditAdapter } from "./adapters/xendit.adapter";
import { MidtransAdapter } from "./adapters/midtrans.adapter";
import { PaymentWebhookController } from "./payment.webhook.controller";
import { PaymentReconciliationService } from "./payment.reconciliation.service";
import { PaymentExpiryJob } from "./payment-expiry.job";

import { FinanceModule } from "../finance/finance.module";

@Module({
  imports: [PersistenceModule, FinanceModule],
  controllers: [
    PaymentController,
    PaymentWebhookController,
    AdminPaymentController,
  ],
  providers: [
    PaymentService,
    PaymentReconciliationService,
    PaymentExpiryJob,
    StripeAdapter,
    XenditAdapter,
    MidtransAdapter,
    {
      provide: IPaymentRepository,
      useClass: useDbPersistence()
        ? PaymentDbRepository
        : PaymentMockRepository,
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
