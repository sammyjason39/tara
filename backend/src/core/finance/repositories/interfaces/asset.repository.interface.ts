import { Asset } from '../../domain/asset.interfaces';

export interface IAssetRepository {
  findById(tenant_id: string, company_id: string, id: string): Promise<Asset | null>;
  findAll(tenant_id: string, company_id: string): Promise<Asset[]>;
  save(asset: Asset): Promise<Asset>;
  updateStatus(tenant_id: string, company_id: string, id: string, status: string): Promise<void>;
}
