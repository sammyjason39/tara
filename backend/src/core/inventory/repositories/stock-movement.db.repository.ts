import { Injectable, Inject } from '@nestjs/common';
import { Prisma, stock_movements as StockMovement, stock_levels as StockLevel } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IStockMovementRepository, StockReservation } from './interfaces/stock-movement.repository.interface';
import { StockIntakeDto } from '../dto/stock-intake.dto';
import { TransferStockDto } from '../dto/transfer-stock.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StockMovementDbRepository implements IStockMovementRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService | Prisma.TransactionClient
  ) {}

  private get db(): Prisma.TransactionClient {
    return (this.prisma as Prisma.TransactionClient);
  }

  async intake(tenant_id: string, data: StockIntakeDto, providedTx?: any): Promise<StockMovement> {
    const execute = async (tx: Prisma.TransactionClient) => {
      // 1. Update or create stock level
      await tx.stock_levels.upsert({
        where: {
          location_id_product_id_department_id: {
            location_id: data.location_id,
            product_id: data.item_id,
            department_id: data.departmentId || (undefined as unknown as string),
          },
        },
        create: {
          id: uuidv4(),
          tenant_id: tenant_id,
          location_id: data.location_id,
          department_id: data.departmentId || null,
          product_id: data.item_id,
          on_hand: data.quantity,
          available: data.quantity,
          updated_at: new Date(),
        },
        update: {
          on_hand: { increment: data.quantity },
          available: { increment: data.quantity },
          updated_at: new Date(),
        },
      });

      // 2. Create movement record
      return tx.stock_movements.create({
        data: {
          id: uuidv4(),
          tenant_id: tenant_id,
          product_id: data.item_id,
          location_id: data.location_id,
          to_location_id: data.location_id,
          to_department_id: data.departmentId || null,
          quantity: data.quantity,
          type: "INTAKE",
          reference_id: data.referenceId || `INTAKE-${Date.now()}`,
          reference_type: data.referenceType || 'MANUAL',
          performed_by: data.createdBy || "system",
        },
      });
    };

    return providedTx ? execute(providedTx) : (this.prisma as PrismaService).$transaction(execute);
  }

  async transfer(tenant_id: string, data: TransferStockDto, providedTx?: any): Promise<StockMovement[]> {
    const execute = async (tx: Prisma.TransactionClient) => {
      // 1. Decrement source
      await tx.stock_levels.update({
        where: {
          location_id_product_id_department_id: {
            location_id: data.fromLocationId,
            product_id: data.item_id,
            department_id: data.fromDepartmentId || (undefined as unknown as string),
          },
        },
        data: {
          on_hand: { decrement: data.quantity },
          available: { decrement: data.quantity },
          updated_at: new Date(),
        },
      });

      // 2. Increment destination
      await tx.stock_levels.upsert({
        where: {
          location_id_product_id_department_id: {
            location_id: data.toLocationId,
            product_id: data.item_id,
            department_id: data.toDepartmentId || (undefined as unknown as string),
          },
        },
        create: {
          id: uuidv4(),
          tenant_id: tenant_id,
          location_id: data.toLocationId,
          department_id: data.toDepartmentId || null,
          product_id: data.item_id,
          on_hand: data.quantity,
          available: data.quantity,
          updated_at: new Date(),
        },
        update: {
          on_hand: { increment: data.quantity },
          available: { increment: data.quantity },
          updated_at: new Date(),
        },
      });

      // 3. Create movement logs
      const outMove = await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          tenant_id: tenant_id,
          product_id: data.item_id,
          location_id: data.fromLocationId,
          from_location_id: data.fromLocationId,
          from_department_id: data.fromDepartmentId || null,
          to_location_id: data.toLocationId,
          to_department_id: data.toDepartmentId || null,
          quantity: -data.quantity,
          type: "TRANSFER_OUT",
          reference_id: data.referenceId || `TR-${Date.now()}`,
          reference_type: data.referenceType || 'INTERNAL',
          performed_by: data.createdBy || "system",
        },
      });

      const inMove = await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          tenant_id: tenant_id,
          product_id: data.item_id,
          location_id: data.toLocationId,
          from_location_id: data.fromLocationId,
          from_department_id: data.fromDepartmentId || null,
          to_location_id: data.toLocationId,
          to_department_id: data.toDepartmentId || null,
          quantity: data.quantity,
          type: "TRANSFER_IN",
          reference_id: data.referenceId || `TR-${Date.now()}`,
          reference_type: data.referenceType || 'INTERNAL',
          performed_by: data.createdBy || "system",
        },
      });

      return [outMove, inMove];
    };

    return providedTx ? execute(providedTx) : (this.prisma as PrismaService).$transaction(execute);
  }

  async consume(tenant_id: string, data: any, providedTx?: any): Promise<StockMovement> {
    const execute = async (tx: Prisma.TransactionClient) => {
      await tx.stock_levels.update({
        where: {
          location_id_product_id_department_id: {
            location_id: data.location_id,
            product_id: data.item_id,
            department_id: data.department_id ?? (null as any),
          },
        },
        data: {
          on_hand: { decrement: data.quantity },
          available: { decrement: data.quantity },
          updated_at: new Date(),
        },
      });

      return tx.stock_movements.create({
        data: {
          id: uuidv4(),
          tenant_id: tenant_id,
          product_id: data.item_id,
          location_id: data.location_id,
          from_location_id: data.location_id,
          quantity: -data.quantity,
          type: "OUT",
          reference_id: data.referenceId || `CONSUME-${Date.now()}`,
          reference_type: data.referenceType || 'MANUAL',
          performed_by: data.performedBy || "system",
        },
      });
    };

    return providedTx ? execute(providedTx) : (this.prisma as PrismaService).$transaction(execute);
  }

  async reserve(tenant_id: string, data: StockReservation, providedTx?: any): Promise<void> {
    const execute = async (tx: Prisma.TransactionClient) => {
        // Increment reserved, decrement available
        await tx.stock_levels.update({
            where: {
                location_id_product_id_department_id: {
                    location_id: data.location_id,
                    product_id: data.product_id,
                    department_id: (null as any),
                },
            },
            data: {
                reserved: { increment: data.quantity },
                available: { decrement: data.quantity },
                updated_at: new Date(),
            },
        });

        await tx.stock_reservations.create({
            data: {
                id: uuidv4(),
                tenant_id: tenant_id,
                product_id: data.product_id,
                location_id: data.location_id,
                quantity: data.quantity,
                reference_id: data.referenceId,
                reference_type: data.referenceType,
                status: 'ACTIVE',
            }
        });
    };
    return providedTx ? execute(providedTx) : (this.prisma as PrismaService).$transaction(execute);
  }

  async release(tenant_id: string, data: StockReservation, providedTx?: any): Promise<void> {
    const execute = async (tx: Prisma.TransactionClient) => {
        // Decrement reserved, increment available
        await tx.stock_levels.update({
            where: {
                location_id_product_id_department_id: {
                    location_id: data.location_id,
                    product_id: data.product_id,
                    department_id: (null as any),
                },
            },
            data: {
                reserved: { decrement: data.quantity },
                available: { increment: data.quantity },
                updated_at: new Date(),
            },
        });

        // Soft delete or update reservation
        await tx.stock_reservations.updateMany({
            where: { reference_id: data.referenceId, tenant_id: tenant_id },
            data: { status: 'RELEASED' }
        });
    };
    return providedTx ? execute(providedTx) : (this.prisma as PrismaService).$transaction(execute);
  }

  async findAll(tenant_id: string, filters?: any): Promise<StockMovement[]> {
    return this.db.stock_movements.findMany({
      where: { ...filters, tenant_id },
      orderBy: { created_at: 'desc' },
      take: filters?.take || 100
    });
  }

  async getBalances(tenant_id: string, location_id?: string, product_id?: string): Promise<StockLevel[]> {
    return this.db.stock_levels.findMany({
      where: { tenant_id: tenant_id, location_id: location_id, product_id: product_id },
      orderBy: { updated_at: 'desc' }
    });
  }
}
