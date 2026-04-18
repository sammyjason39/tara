import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { IAssetCategoryRepository } from './interfaces/asset-category.repository.interface';
import { AssetCategory } from '../domain/asset.interfaces';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AssetCategoryDbRepository implements IAssetCategoryRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService | Prisma.TransactionClient
  ) {}

  private get db(): Prisma.TransactionClient {
    if (this.prisma instanceof PrismaService) {
        return this.prisma as any;
    }
    return this.prisma as Prisma.TransactionClient;
  }

  async findById(tenant_id: string, company_id: string, id: string): Promise<AssetCategory | null> {
    const raw = await this.db.finance_asset_categories.findUnique({
      where: { id }
    });

    if (!raw || raw.tenant_id !== tenant_id) return null;

    return this.mapEntity(raw, company_id);
  }

  async findAll(tenant_id: string, company_id: string): Promise<AssetCategory[]> {
    const categories = await this.db.finance_asset_categories.findMany({
      where: { tenant_id: tenant_id }
    });

    return categories.map((c: any) => this.mapEntity(c, company_id));
  }

  async save(category: AssetCategory): Promise<AssetCategory> {
    const id = category.id || uuid();
    const data = {
      tenant_id: category.tenant_id,
      name: category.name,
      code: category.code || category.name.toUpperCase().substring(0, 5),
      description: category.description || category.name,
      depreciation_method: category.depreciationMethod,
      useful_life_years: category.usefulLifeMonths / 12, // Converting months to years for DB
      asset_account_ref: category.defaultAssetAccountId,
      depreciation_account_ref: category.defaultDepreciationExpenseAccountId,
      is_active: true,
      updated_at: new Date(),
    };

    const saved = await this.db.finance_asset_categories.upsert({
      where: { id },
      update: data,
      create: {
        id,
        ...data,
      }
    });

    return this.mapEntity(saved, category.company_id || category.tenant_id);
  }

  private mapEntity(raw: any, company_id: string): AssetCategory {
    return {
      id: raw.id,
      tenant_id: raw.tenant_id,
      company_id: company_id,
      code: raw.code,
      name: raw.name,
      description: raw.description,
      defaultAssetAccountId: raw.asset_account_ref || "",
      defaultAccumulatedDepreciationAccountId: "", // Optional or stored in metadata
      defaultDepreciationExpenseAccountId: raw.depreciation_account_ref || "",
      depreciationMethod: raw.depreciation_method as any,
      usefulLifeMonths: (raw.useful_life_years || 0) * 12,
      is_active: raw.is_active,
    };
  }
}
