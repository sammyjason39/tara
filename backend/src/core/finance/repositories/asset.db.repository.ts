import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../persistence/prisma.service';
import { IAssetRepository } from './interfaces/asset.repository.interface';
import { Asset } from '../domain/asset.interfaces';

@Injectable()
export class AssetDbRepository implements IAssetRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findById(tenant_id: string, company_id: string, id: string): Promise<Asset | null> {
    const res = await this.db.fixed_assets.findUnique({
      where: { id }
    });
    if (!res) return null;
    return this.mapToDomain(res);
  }

  async findAll(tenant_id: string, company_id: string): Promise<Asset[]> {
    const list = await this.db.fixed_assets.findMany({
      where: { tenant_id: tenant_id }
    });
    return list.map((item: any) => this.mapToDomain(item));
  }

  async save(asset: Asset): Promise<Asset> {
    const created = await this.db.fixed_assets.create({
      data: {
        id: asset.id || randomUUID(),
        tenant_id: asset.tenant_id,
        description: asset.description || asset.name || 'No Description',
        asset_class: asset.assetClass || 'GENERAL',
        location: (asset as any).location || 'GLOBAL',
        department: asset.department || 'GLOBAL',
        acquisition_cost: new Prisma.Decimal(asset.acquisitionCost.toString()),
        acquisition_date: new Date(asset.acquisitionDate),
        useful_life_years: asset.usefulLifeYears || (asset as any).usefulLifeMonths ? Math.floor((asset as any).usefulLifeMonths / 12) : 5,
        depreciation_method: asset.depreciationMethod,
        residual_value: new Prisma.Decimal(asset.residualValue.toString()),
        status: asset.status,
        accumulated_depreciation: asset.accumulatedDepreciation ? new Prisma.Decimal(asset.accumulatedDepreciation.toString()) : new Prisma.Decimal(0),
        revaluation_reserve: asset.revaluationReserve ? new Prisma.Decimal(asset.revaluationReserve.toString()) : new Prisma.Decimal(0),
        carrying_value: asset.carryingValue ? new Prisma.Decimal(asset.carryingValue.toString()) : new Prisma.Decimal(asset.acquisitionCost.toString()),
        updated_at: new Date(),
      }

    });
    return this.mapToDomain(created);
  }

  async updateStatus(tenant_id: string, company_id: string, id: string, status: string): Promise<void> {
    await this.db.fixed_assets.update({
      where: { id },
      data: { status, updated_at: new Date() }
    });
  }

  private mapToDomain(item: any): Asset {
    return {
      id: item.id,
      tenant_id: item.tenant_id,
      name: item.description,
      description: item.description,
      assetClass: item.asset_class,
      location: item,
      department: item.department,
      acquisitionCost: item.acquisition_cost,
      acquisitionDate: item.acquisition_date,
      usefulLifeMonths: item.useful_life_years * 12,
      depreciationMethod: item.depreciation_method,
      residualValue: item.residual_value,
      status: item.status,
      accumulatedDepreciation: item.accumulated_depreciation,
      revaluationReserve: item.revaluation_reserve,
      carryingValue: item.carrying_value,
      updated_at: item.updated_at,
    } as unknown as Asset;

  }
}
