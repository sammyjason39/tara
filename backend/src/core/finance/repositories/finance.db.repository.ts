import { Injectable } from '@nestjs/common';
import { FinanceMockRepository } from './finance.mock.repository';

/**
 * Finance DB Repository (DB-ready placeholder)
 *
 * This class intentionally extends the mock implementation while
 * persistence mode remains mock-first. Replace with real SQL/ORM
 * implementation when enabling PERSISTENCE_MODE=db in production.
 */
@Injectable()
export class FinanceDbRepository extends FinanceMockRepository {}

