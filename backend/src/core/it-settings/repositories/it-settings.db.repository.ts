import { Injectable } from '@nestjs/common';
import { ITSettingsMockRepository } from './it-settings.mock.repository';

/**
 * IT Settings DB Repository (DB-ready placeholder)
 *
 * Extend mock now; replace with SQL-backed repository for DB mode.
 */
@Injectable()
export class ITSettingsDbRepository extends ITSettingsMockRepository {}

