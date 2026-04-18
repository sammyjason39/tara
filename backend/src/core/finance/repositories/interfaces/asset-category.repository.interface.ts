import { AssetCategory } from '../../domain/asset.interfaces';

export interface IAssetCategoryRepository {
  findById(tenant_id: string, company_id: string, id: string): Promise<AssetCategory | null>;
  findAll(tenant_id: string, company_id: string): Promise<AssetCategory[]>;
  save(category: AssetCategory): Promise<AssetCategory>;
}
