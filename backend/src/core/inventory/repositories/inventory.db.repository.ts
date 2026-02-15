import { Injectable } from '@nestjs/common';
import { InventoryMockRepository } from './inventory.mock.repository';

/**
 * Inventory DB Repository (DB-ready placeholder)
 *
 * Extend mock implementation until SQL/ORM adapter is enabled.
 */
@Injectable()
export class InventoryDbRepository extends InventoryMockRepository {}

