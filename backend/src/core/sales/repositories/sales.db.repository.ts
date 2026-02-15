import { Injectable } from '@nestjs/common';
import { SalesMockRepository } from './sales.mock.repository';

/**
 * Sales DB Repository (DB-ready placeholder)
 */
@Injectable()
export class SalesDbRepository extends SalesMockRepository {}
