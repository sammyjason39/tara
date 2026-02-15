import { Injectable } from '@nestjs/common';
import { ProcurementMockRepository } from './procurement.mock.repository';

/**
 * Procurement DB Repository (DB-ready placeholder)
 */
@Injectable()
export class ProcurementDbRepository extends ProcurementMockRepository {}

