import { Injectable } from '@nestjs/common';
import { ITMockRepository } from './it.mock.repository';

/**
 * IT DB Repository (DB-ready placeholder)
 */
@Injectable()
export class ITDbRepository extends ITMockRepository {}

