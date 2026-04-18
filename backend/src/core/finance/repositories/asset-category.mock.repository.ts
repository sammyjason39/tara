import { Injectable } from '@nestjs/common';
import { IAssetCategoryRepository } from './interfaces/asset-category.repository.interface';
import { AssetCategory } from '../domain/asset.interfaces';

@Injectable()
export class AssetCategoryMockRepository implements IAssetCategoryRepository {
  private categories: AssetCategory[] = [];

  async findById(tenant_id: string, company_id: string, id: string): Promise<AssetCategory | null> {
    // In actual multitenant, id is enough if UUID, but keeping company for consistency
    return this.categories.find((c: any) => c.id === id) || null;
  }

  async findAll(tenant_id: string, company_id: string): Promise<AssetCategory[]> {
    return this.categories;
  }

  async save(category: AssetCategory): Promise<AssetCategory> {
    const index = this.categories.findIndex((c: any) => c.id === category.id);
    if (index >= 0) {
      this.categories[index] = category;
    } else {
      this.categories.push(category);
    }
    return category;
  }
}
