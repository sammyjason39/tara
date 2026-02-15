import { Injectable } from '@nestjs/common';
import { MarketingMockRepository } from './marketing.mock.repository';

/**
 * Marketing DB Repository (DB-ready placeholder)
 */
@Injectable()
export class MarketingDbRepository extends MarketingMockRepository {}

