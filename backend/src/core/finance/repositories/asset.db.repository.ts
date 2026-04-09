import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { IAssetRepository } from './interfaces/asset.repository.interface';
import { Asset } from '../domain/asset.interfaces';

@Injectable()
export class AssetDbRepository implements IAssetRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findById(tenantId: string, companyId: string, id: string): Promise<Asset | null> {
    const res = await this.db.fixedAsset.findUnique({
      where: { id }
    });
    return res as unknown as Asset;
  }

  async findAll(tenantId: string, companyId: string): Promise<Asset[]> {
    const list = await this.db.fixedAsset.findMany({
      where: { tenantId }
    });
    return list as unknown as Asset[];
  }

  async save(asset: Asset): Promise<Asset> {
    const created = await this.db.fixedAsset.create({
      data: {
        id: 'z8lvq6qv',
        updatedAt: new Date(),
        tenantId: asset.tenantId,
        description: asset.description || asset.name || 'No Description',
        assetClass: asset.assetClass || 'GENERAL',
        location: asset.location || 'GLOBAL',
        department: asset.department || 'GLOBAL',
        acquisitionCost: new Prisma.Decimal(asset.acquisitionCost.toString()),
        acquisitionDate: new Date(asset.acquisitionDate),
        usefulLifeYears: asset.usefulLifeYears || Math.floor(asset.usefulLifeMonths / 12) || 5,
        depreciationMethod: asset.depreciationMethod,
        residualValue: new Prisma.Decimal(asset.residualValue.toString()),
        status: asset.status,
        carryingValue: asset.carryingValue ? new Prisma.Decimal(asset.carryingValue.toString()) : new Prisma.Decimal(asset.acquisitionCost.toString()),
      }
    });
    return created as unknown as Asset;
  }

  async updateStatus(tenantId: string, companyId: string, id: string, status: string): Promise<void> {
    await this.db.fixedAsset.update({
      where: { id },
      data: { status }
    });
  }
}
