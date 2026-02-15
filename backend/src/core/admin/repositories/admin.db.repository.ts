import { Injectable } from '@nestjs/common';
import { AdminMockRepository } from './admin.mock.repository';

/**
 * Admin DB Repository (DB-ready placeholder)
 */
@Injectable()
export class AdminDbRepository extends AdminMockRepository {}

