import { Injectable } from '@nestjs/common';
import { HRMockRepository } from './hr.mock.repository';

/**
 * HR DB Repository (DB-ready placeholder)
 *
 * Extend mock now; replace with real persistence adapter for DB mode.
 */
@Injectable()
export class HRDbRepository extends HRMockRepository {}

