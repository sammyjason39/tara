import { Injectable } from '@nestjs/common';
import { PaymentMockRepository } from './payment.mock.repository';

/**
 * Payment DB Repository (DB-ready placeholder)
 */
@Injectable()
export class PaymentDbRepository extends PaymentMockRepository {}

